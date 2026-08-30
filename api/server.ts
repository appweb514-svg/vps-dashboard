import Fastify from "fastify";
import { runBenchmark } from "../benchmark/runner/runner.ts";
import { withRanking } from "../benchmark/report/generator.ts";
import baselines from "../data/baselines.json" with { type: "json" };
import { readFileSync, existsSync, readdirSync, statfsSync } from "fs";

const app = Fastify({ logger: true });

// In-memory run store + SSE clients
const runs = new Map<string, any>();
const sseClients = new Map<string, Set<any>>();

app.get("/api/health", async () => ({ ok: true }));

function cpuTimes() {
  const parts = readFileSync("/proc/stat", "utf8").split("\n")[0].trim().split(/\s+/).slice(1).map(Number);
  return { idle: parts[3] + (parts[4] || 0), total: parts.reduce((s, v) => s + v, 0) };
}

app.get("/api/system", async () => {
  const a = cpuTimes();
  await new Promise(r => setTimeout(r, 250));
  const b = cpuTimes();
  const cpuPct = Math.max(0, Math.min(100, Math.round(100 * (1 - (b.idle - a.idle) / Math.max(1, b.total - a.total)))));
  const mem = readFileSync("/proc/meminfo", "utf8");
  const num = (k: string) => Number(mem.match(new RegExp(`^${k}:\\s+(\\d+)`, "m"))?.[1] ?? 0);
  const ramTotalGb = +(num("MemTotal") / 1048576).toFixed(1);
  const ramAvailGb = +(num("MemAvailable") / 1048576).toFixed(1);
  const st = statfsSync("/");
  const diskTotalGb = +((st.blocks * st.bsize) / 1024 ** 3).toFixed(0);
  const diskFreeGb = +((st.bavail * st.bsize) / 1024 ** 3).toFixed(0);
  return { cpuPct, ramUsedGb: +(ramTotalGb - ramAvailGb).toFixed(1), ramTotalGb, diskUsedGb: diskTotalGb - diskFreeGb, diskTotalGb };
});
app.get("/api/baselines", async () => baselines);
app.get("/api/benchmark/suites", async () => {
  const { SUITES } = await import("../benchmark/suites/index.ts");
  return SUITES;
});
app.get("/api/benchmark/runs", async () => [...runs.values()].map(r => ({ runId: r.runId, agent: r.agent, globalScore: r.globalScore, passRate: r.passRate, startedAt: r.startedAt, finishedAt: r.finishedAt })));
app.get("/api/benchmark/runs/:id", async (req: any, reply) => {
  const r = runs.get(req.params.id);
  if (!r) { const p = `data/runs/${req.params.id}.json`; if (existsSync(p)) return JSON.parse(readFileSync(p,"utf-8")); return reply.code(404).send({ error: "not found" }); }
  return r;
});

// SSE stream progression live
app.get("/api/benchmark/runs/:id/stream", async (req: any, reply) => {
  const id = req.params.id;
  reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "Access-Control-Allow-Origin": "*" });
  if (!sseClients.has(id)) sseClients.set(id, new Set());
  sseClients.get(id)!.add(reply.raw);
  reply.raw.write(`data: ${JSON.stringify({ type: "connected", runId: id })}\n\n`);
  // replay if already done
  const r = runs.get(id);
  if (r?.results) reply.raw.write(`data: ${JSON.stringify({ type: "done", report: r })}\n\n`);
  req.raw.on("close", () => sseClients.get(id)?.delete(reply.raw));
});

function broadcast(runId: string, payload: any) {
  for (const c of sseClients.get(runId) || []) { try { c.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {} }
}

const MAX_CONCURRENT_RUNS = 3;
const MAX_RUNS_PER_HOUR = 10;
const runStarts: number[] = [];
let activeRuns = 0;

app.post("/api/benchmark/run", async (req: any, reply) => {
  const now = Date.now();
  while (runStarts.length && now - runStarts[0] > 3_600_000) runStarts.shift();
  if (activeRuns >= MAX_CONCURRENT_RUNS) return reply.code(429).send({ error: `${MAX_CONCURRENT_RUNS} benchmarks déjà en cours` });
  if (runStarts.length >= MAX_RUNS_PER_HOUR) return reply.code(429).send({ error: `quota de ${MAX_RUNS_PER_HOUR} lancements/heure atteint` });
  const { model = "test-model", apiUrl = process.env.BENCHMARK_API_URL || "http://localhost:11434", apiKey, mock = false } = req.body || {};
  const runId = `run-${Date.now().toString(36)}`;
  runStarts.push(now);
  activeRuns++;
  // fire and forget, stream via SSE
  (async () => {
    try {
      const report = await runBenchmark({ name: model, model, apiUrl, apiKey }, {
        mock, concurrency: 6,
        onProgress: (done, total, result) => broadcast(runId, { type: "progress", done, total, result, pct: Math.round(done/total*100), etaSec: Math.round((total-done)*(result.latencyMs/1000)) }),
      });
      const ranked = withRanking(report, baselines as any);
      ranked.runId = runId;
      runs.set(runId, ranked);
      const { writeFileSync, mkdirSync } = await import("fs");
      mkdirSync("data/runs", { recursive: true });
      writeFileSync(`data/runs/${runId}.json`, JSON.stringify(ranked, null, 2));
      broadcast(runId, { type: "done", report: ranked });
    } catch (err: any) {
      broadcast(runId, { type: "error", message: err?.message || String(err) });
    } finally {
      activeRuns--;
    }
  })();
  return { runId, status: "started", stream: `/api/benchmark/runs/${runId}/stream` };
});

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";
app.listen({ port, host }).then(()=>console.log(`API on ${host}:${port}`));
