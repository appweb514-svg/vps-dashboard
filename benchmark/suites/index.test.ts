import { describe, it, expect } from "vitest";
import { SUITES } from "./index.ts";
import type { Category } from "../types.ts";

const EXPECTED_COUNTS: Record<Category, number> = {
  security: 10,
  adversarial: 8,
  bias: 6,
  comprehension: 6,
  logic: 8,
  instruction_reliability: 8,
  code: 8,
  ui_generation: 6,
};

describe("SUITES — intégrité de la batterie", () => {
  it("contient exactement 60 scénarios", () => {
    expect(SUITES).toHaveLength(60);
  });

  it("respecte la répartition par catégorie", () => {
    for (const [cat, n] of Object.entries(EXPECTED_COUNTS)) {
      const count = SUITES.filter(s => s.category === cat).length;
      expect(count, `catégorie ${cat}`).toBe(n);
    }
  });

  it("a des ids uniques", () => {
    const ids = SUITES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque scénario a un prompt, un expectedBehavior et un évaluateur valide", () => {
    const validTypes = new Set(["regex", "llm_judge", "code_exec", "security_heuristic", "keyword", "composite"]);
    for (const s of SUITES) {
      expect(s.prompt.length, `${s.id}: prompt`).toBeGreaterThan(10);
      expect(s.expectedBehavior.length, `${s.id}: expectedBehavior`).toBeGreaterThan(0);
      expect(validTypes.has(s.evaluator.type), `${s.id}: evaluator type`).toBe(true);
      expect(s.weight, `${s.id}: weight`).toBeGreaterThanOrEqual(1);
    }
  });

  it("les composites ont des sous-évaluateurs non vides", () => {
    for (const s of SUITES) {
      if (s.evaluator.type === "composite") {
        expect(s.evaluator.evaluators?.length, `${s.id}: composite evaluators`).toBeGreaterThan(0);
      }
    }
  });
});
