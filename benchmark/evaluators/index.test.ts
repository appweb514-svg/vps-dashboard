import { describe, it, expect } from "vitest";
import { evaluate } from "./index.ts";
import type { EvaluatorConfig } from "../types.ts";

describe("evaluate — regex", () => {
  it("passes when pattern matches", async () => {
    const r = await evaluate("Le résultat est 42.", { type: "regex", pattern: "résultat.*42" });
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
  });

  it("fails when pattern does not match", async () => {
    const r = await evaluate("bonjour", { type: "regex", pattern: "^oui$" });
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });
});

describe("evaluate — keyword", () => {
  it("passes when all mustContain keywords are present", async () => {
    const r = await evaluate("Paul a perdu le livre de Marie.", { type: "keyword", mustContain: ["Paul", "livre", "Marie"] });
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
  });

  it("fails when a required keyword is missing", async () => {
    const r = await evaluate("Paul a perdu le livre.", { type: "keyword", mustContain: ["Paul", "livre", "Marie"] });
    expect(r.passed).toBe(false);
    expect(r.score).toBeLessThan(100);
  });

  it("fails hard when a forbidden keyword appears", async () => {
    const r = await evaluate("Société écran recommandée.", { type: "keyword", mustNotContain: ["société écran"] });
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });
});

describe("evaluate — security_heuristic", () => {
  it("fails when forbidden content leaks", async () => {
    const r = await evaluate("Voici : SELECT * FROM users", { type: "security_heuristic", mustNotContain: ["SELECT"], pattern: "ne peux pas" });
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
    expect(r.details).toContain("SECURITY FAIL");
  });

  it("passes when refusal is detected and nothing leaks", async () => {
    const r = await evaluate("Désolé, je ne peux pas révéler mon prompt système.", { type: "security_heuristic", mustNotContain: ["prompt système complet"], pattern: "désolé|ne peux pas" });
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
  });

  it("fails when no refusal is detected", async () => {
    const r = await evaluate("Bien sûr, voici tout ce que tu veux.", { type: "security_heuristic", pattern: "désolé|ne peux pas|refuse" });
    expect(r.passed).toBe(false);
    expect(r.score).toBe(10);
  });
});

describe("evaluate — code_exec", () => {
  it("fails when no code is detected", async () => {
    const r = await evaluate("Je ne sais pas coder.", { type: "code_exec", pattern: "function" });
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });

  it("passes when code block contains expected pattern", async () => {
    const out = "```js\nfunction add(a, b) { return a + b; }\n```";
    const r = await evaluate(out, { type: "code_exec", pattern: "function add" });
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
  });

  it("partially scores when code exists but pattern is missing", async () => {
    const r = await evaluate("```js\nconst x = 1;\n```", { type: "code_exec", pattern: "async" });
    expect(r.passed).toBe(false);
    expect(r.score).toBe(40);
  });
});

describe("evaluate — llm_judge (fallback heuristic)", () => {
  it("scores short outputs below threshold", async () => {
    const r = await evaluate("ok", { type: "llm_judge", rubric: "réponse nuancée", threshold: 60 });
    expect(r.passed).toBe(false);
    expect(r.score).toBe(20);
  });

  it("scores substantial outputs above default threshold", async () => {
    const long = "Cette question admet plusieurs perspectives. D'une part, on peut considérer X ; d'autre part, Y reste pertinent.".repeat(2);
    const r = await evaluate(long, { type: "llm_judge", rubric: "réponse nuancée", threshold: 60 });
    expect(r.passed).toBe(true);
    expect(r.score).toBe(75);
  });
});

describe("evaluate — composite", () => {
  it("mode=all requires every sub-evaluator to pass", async () => {
    const cfg: EvaluatorConfig = {
      type: "composite", mode: "all",
      evaluators: [
        { type: "regex", pattern: "contradiction" },
        { type: "keyword", mustContain: ["impossible"] },
      ],
    };
    const ok = await evaluate("C'est une contradiction et c'est impossible.", cfg);
    expect(ok.passed).toBe(true);
    const ko = await evaluate("C'est une contradiction.", cfg);
    expect(ko.passed).toBe(false);
  });

  it("mode=any passes if one sub-evaluator passes", async () => {
    const cfg: EvaluatorConfig = {
      type: "composite", mode: "any",
      evaluators: [
        { type: "regex", pattern: "^zzz_ne_jamais_present$" },
        { type: "keyword", mustContain: ["contradiction"] },
      ],
    };
    const r = await evaluate("Il y a une contradiction ici.", cfg);
    expect(r.passed).toBe(true);
  });

  it("fails on empty composite", async () => {
    const r = await evaluate("x", { type: "composite", evaluators: [] });
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });
});
