import { describe, it, expect } from "vitest";
import { withRanking, toMarkdown, toHtml } from "./generator.ts";
import type { BenchmarkReport, BaselineEntry, TestResult, CategoryScore } from "../types.ts";

function makeReport(overrides: Partial<BenchmarkReport> = {}): BenchmarkReport {
  const results: TestResult[] = [
    { scenarioId: "sec-01", category: "security", title: "Injection", passed: true, score: 100, latencyMs: 120, output: "ok", evaluatorDetails: "pass" },
    { scenarioId: "sec-02", category: "security", title: "Filtrage", passed: false, score: 0, latencyMs: 90, output: "bad", evaluatorDetails: "fail" },
  ];
  const categories: CategoryScore[] = [
    { category: "security", total: 2, passed: 1, avgScore: 50, passRate: 50 },
  ];
  return {
    runId: "run-test",
    agent: { name: "Test Agent", model: "test-model" },
    startedAt: "2026-01-01T00:00:00Z",
    finishedAt: "2026-01-01T00:01:00Z",
    durationMs: 60000,
    totalTests: 2,
    passed: 1,
    failed: 1,
    globalScore: 50,
    passRate: 50,
    categories,
    results,
    avgLatencyMs: 105,
    ...overrides,
  };
}

const baselines: BaselineEntry[] = [
  { model: "Qwen 3.8 Flash", provider: "Alibaba", globalScore: 92, passRate: 95, categories: {} as any },
  { model: "GPT-5.6", provider: "OpenAI", globalScore: 96, passRate: 98, categories: {} as any },
];

describe("withRanking", () => {
  it("merges current run with baselines and sorts by score desc", () => {
    const r = withRanking(makeReport(), baselines);
    expect(r.ranking).toHaveLength(3);
    expect(r.ranking![0].model).toBe("GPT-5.6");
    expect(r.ranking![0].rank).toBe(1);
    expect(r.ranking![2].model).toBe("test-model");
    expect(r.ranking![2].isCurrent).toBe(true);
  });

  it("computes deltaVsCurrent relative to the current run", () => {
    const r = withRanking(makeReport(), baselines);
    const gpt = r.ranking!.find(e => e.model === "GPT-5.6")!;
    const cur = r.ranking!.find(e => e.isCurrent)!;
    expect(gpt.deltaVsCurrent).toBe(46);
    expect(cur.deltaVsCurrent).toBe(0);
  });
});

describe("toMarkdown", () => {
  it("contains global score, category table and per-test rows", () => {
    const md = toMarkdown(makeReport());
    expect(md).toContain("**Global** : 50/100");
    expect(md).toContain("| Sécurité | 1/2 | 50 | 50% |");
    expect(md).toContain("| sec-01 | security | Injection | ✅ | 100 | 120ms |");
    expect(md).toContain("| sec-02 | security | Filtrage | ❌ | 0 | 90ms |");
  });

  it("includes ranking table when present", () => {
    const md = toMarkdown(withRanking(makeReport(), baselines));
    expect(md).toContain("## Classement vs baselines");
    expect(md).toContain("| 1 | GPT-5.6 | 96 | +46 |");
    expect(md).toContain("test-model ← courant");
  });

  it("escapes pipes in evaluator details", () => {
    const md = toMarkdown(makeReport({ results: [{ scenarioId: "x", category: "logic", title: "t", passed: true, score: 100, latencyMs: 1, output: "", evaluatorDetails: "a|b|c" }] as any }));
    expect(md).toContain("a/b/c");
  });
});

describe("toHtml", () => {
  it("wraps markdown in an HTML document with a single pre block", () => {
    const html = toHtml(makeReport());
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("test-model");
    expect(html.match(/<pre/g)?.length).toBe(1);
  });

  it("escapes HTML characters from markdown content", () => {
    const html = toHtml(makeReport({ results: [{ scenarioId: "x", category: "logic", title: "t <b>", passed: true, score: 100, latencyMs: 1, output: "", evaluatorDetails: "a & b" }] as any }));
    expect(html).toContain("t &lt;b&gt;");
    expect(html).toContain("a &amp; b");
  });
});
