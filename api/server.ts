import Fastify from "fastify";
import cors from "@fastify/cors";
import { runBenchmark } from "../benchmark/runner/runner.ts";
import { withRanking } from "../benchmark/report/generator.ts";
import baselines from "../data/baselines.json" with { type: "json" };
import { readFileSync, existsSync, readdirSync } from "fs";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

// In-memory run store + SSE clients
const runs = new Map<string, any>();
const sseClients = new Map<string, Set<any>>();

app.get("/api/health", async () => ({ ok: true }));
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

app.post("/api/benchmark/run", async (req: any) => {
  const { model = "test-model", apiUrl = process.env.BENCHMARK_API_URL || "http://localhost:11434", apiKey, mock = false } = req.body || {};
  const runId = `run-${Date.now().toString(36)}`;
  // fire and forget, stream via SSE
  (async () => {
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
  })();
  return { runId, status: "started", stream: `/api/benchmark/runs/${runId}/stream` };
});

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";
app.listen({ port, host }).then(()=>console.log(`API on ${host}:${port}`));
