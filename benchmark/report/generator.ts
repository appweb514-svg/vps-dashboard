import type { BenchmarkReport, BaselineEntry, RankingEntry, Category } from "../types.ts";
import { CATEGORY_LABELS } from "../types.ts";

export function withRanking(report: BenchmarkReport, baselines: BaselineEntry[]): BenchmarkReport {
  const all = [
    ...baselines.map(b => ({ model: b.model, globalScore: b.globalScore, passRate: b.passRate, isCurrent: false })),
    { model: report.agent.model, globalScore: report.globalScore, passRate: report.passRate, isCurrent: true },
  ].sort((a, b) => b.globalScore - a.globalScore);
  const ranking: RankingEntry[] = all.map((e, i) => ({
    ...e, rank: i + 1, deltaVsCurrent: e.globalScore - report.globalScore,
  }));
  return { ...report, ranking };
}

export function toMarkdown(report: BenchmarkReport): string {
  const lines: string[] = [];
  lines.push(`# Rapport Benchmark — ${report.agent.model}`);
  lines.push(`**Run** \`${report.runId}\` | ${report.startedAt} → ${report.finishedAt} | ${Math.round(report.durationMs/1000)}s | modèle \`${report.agent.model}\``);
  lines.push("");
  lines.push(`## Score global`);
  lines.push(`- **Global** : ${report.globalScore}/100`);
  lines.push(`- **Pass** : ${report.passed}/${report.totalTests} (${report.passRate}%)`);
  lines.push(`- **Latence moy.** : ${report.avgLatencyMs} ms`);
  if (report.costTotalUsd) lines.push(`- **Coût** : $${report.costTotalUsd.toFixed(4)}`);
  lines.push("");
  lines.push(`## Par catégorie`);
  lines.push(`| Catégorie | Pass | Score | Taux |`);
  lines.push(`|---|---|---|---|`);
  for (const c of report.categories) lines.push(`| ${CATEGORY_LABELS[c.category]} | ${c.passed}/${c.total} | ${c.avgScore} | ${c.passRate}% |`);
  lines.push("");
  if (report.ranking) {
    lines.push(`## Classement vs baselines`);
    lines.push(`| # | Modèle | Score | Δ vs courant |`);
    lines.push(`|---|---|---|---|`);
    for (const r of report.ranking) lines.push(`| ${r.rank} | ${r.model}${r.isCurrent ? " ← courant" : ""} | ${r.globalScore} | ${r.deltaVsCurrent > 0 ? "+" : ""}${r.deltaVsCurrent} |`);
    lines.push("");
  }
  lines.push(`## Détail 60 tests`);
  lines.push(`| ID | Catégorie | Titre | ✓ | Score | Latence | Détail |`);
  lines.push(`|---|---|---|---|---|---|---|`);
  for (const r of report.results) lines.push(`| ${r.scenarioId} | ${r.category} | ${r.title} | ${r.passed ? "✅" : "❌"} | ${r.score} | ${r.latencyMs}ms | ${r.evaluatorDetails.slice(0,120).replace(/\|/g,"/")} |`);
  return lines.join("\n");
}

export function toHtml(report: BenchmarkReport): string {
  const md = toMarkdown(report);
  // minimal HTML wrapper; dashboard renders richer
  return `<!doctype html><meta charset="utf-8"><title>Rapport ${report.agent.model}</title><style>body{font-family:system-ui;max-width:900px;margin:2rem auto;padding:0 1rem}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px 8px;font-size:13px}th{background:#f5f5f5}</style><pre style="white-space:pre-wrap">${escapeHtml(md)}</pre>`;
}
function escapeHtml(s: string){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
