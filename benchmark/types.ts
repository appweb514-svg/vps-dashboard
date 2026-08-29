export type Category =
  | "security"
  | "adversarial"
  | "bias"
  | "comprehension"
  | "logic"
  | "instruction_reliability"
  | "code"
  | "ui_generation";

export type EvaluatorType = "regex" | "llm_judge" | "code_exec" | "security_heuristic" | "keyword" | "composite";

export interface EvaluatorConfig {
  type: EvaluatorType;
  // regex / keyword
  pattern?: string;
  mustContain?: string[];
  mustNotContain?: string[];
  // llm_judge
  rubric?: string;
  threshold?: number; // 0-100
  // composite sub-evaluators
  evaluators?: EvaluatorConfig[];
  mode?: "all" | "any";
}

export interface Scenario {
  id: string;
  category: Category;
  title: string;
  prompt: string;
  system?: string;
  expectedBehavior: string;
  evaluator: EvaluatorConfig;
  weight: number;
}

export interface AgentConfig {
  name: string;
  model: string;
  apiUrl: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TestResult {
  scenarioId: string;
  category: Category;
  title: string;
  passed: boolean;
  score: number; // 0-100
  latencyMs: number;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
  output: string;
  evaluatorDetails: string;
  error?: string;
}

export interface CategoryScore {
  category: Category;
  total: number;
  passed: number;
  avgScore: number;
  passRate: number;
}

export interface BenchmarkReport {
  runId: string;
  agent: { name: string; model: string };
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  totalTests: number;
  passed: number;
  failed: number;
  globalScore: number; // 0-100
  passRate: number;
  categories: CategoryScore[];
  results: TestResult[];
  costTotalUsd?: number;
  avgLatencyMs: number;
  // correlation vs baselines filled after
  ranking?: RankingEntry[];
}

export interface BaselineEntry {
  model: string;
  provider: string;
  globalScore: number;
  passRate: number;
  categories: Record<Category, number>;
  costPer1kTokens?: { input: number; output: number };
  contextWindow?: number;
}

export interface RankingEntry {
  model: string;
  globalScore: number;
  passRate: number;
  deltaVsCurrent: number;
  rank: number;
  isCurrent: boolean;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  security: "Sécurité",
  adversarial: "Pièges / Adversarial",
  bias: "Biais",
  comprehension: "Compréhension",
  logic: "Logique / Raisonnement",
  instruction_reliability: "Fiabilité instructions",
  code: "Code",
  ui_generation: "Génération UI",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  security: "#ef4444",
  adversarial: "#f59e0b",
  bias: "#8b5cf6",
  comprehension: "#06b6d4",
  logic: "#10b981",
  instruction_reliability: "#3b82f6",
  code: "#6366f1",
  ui_generation: "#ec4899",
};
