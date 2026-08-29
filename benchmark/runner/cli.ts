#!/usr/bin/env tsx
import { runBenchmark } from "./runner.ts";
import { withRanking, toMarkdown, toHtml } from "../report/generator.ts";
import baselines from "../../data/baselines.json" with { type: "json" };
import { writeFileSync, mkdirSync } from "fs";

const args = process.argv.slice(2);
const mock = args.includes("--mock");
const model = args.find(a => a.startsWith("--model="))?.split("=")[1] || (mock ? "qwen3-8b-flash-mock" : "test-model");
const apiUrl = process.env.BENCHMARK_API_URL || "http://localhost:11434";
const apiKey = process.env.BENCHMARK_API_KEY || process.env.OPENAI_API_KEY;

console.log(`\n🧪 Benchmark — model=${model} mock=${mock} api=${apiUrl}\n`);
const report = await runBenchmark({ name: model, model, apiUrl, apiKey }, {
  mock,
  concurrency: 8,
  onProgress: (done, total, r) => {
    const bar = "█".repeat(Math.round(done/total*20)).padEnd(20,"░");
    const icon = r.passed ? "✅" : "❌";
    console.log(`[${String(done).padStart(2,"0")}/${total}] ${bar} ${icon} ${r.scenarioId} ${r.title.slice(0,45)} (${r.score})`);
  }
});

const ranked = withRanking(report, baselines as any);
console.log(`\n📊 Global ${ranked.globalScore}/100 — Pass ${ranked.passed}/${ranked.totalTests} (${ranked.passRate}%) — ${Math.round(ranked.durationMs/1000)}s`);
console.log("\nPar catégorie:");
for (const c of ranked.categories) console.log(`  ${c.category.padEnd(24)} ${String(c.passed).padStart(2)}/${c.total}  score ${String(c.avgScore).padStart(3)}  ${c.passRate}%`);
console.log("\nClassement:");
for (const r of ranked.ranking!) console.log(`  #${r.rank} ${r.model.padEnd(20)} ${r.globalScore} ${r.isCurrent?"← courant":r.deltaVsCurrent>0?`(+${r.deltaVsCurrent})`:`(${r.deltaVsCurrent})`}`);

mkdirSync("data/runs", { recursive: true });
writeFileSync(`data/runs/${ranked.runId}.json`, JSON.stringify(ranked, null, 2));
writeFileSync(`data/runs/${ranked.runId}.md`, toMarkdown(ranked));
writeFileSync(`data/runs/${ranked.runId}.html`, toHtml(ranked));
console.log(`\n💾 Rapport sauvé → data/runs/${ranked.runId}.{json,md,html}`);
