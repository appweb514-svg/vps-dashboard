# VPS Dashboard + Benchmark Agents

Dashboard VPS avec **moteur de benchmark d'agents** (60 scénarios) — inspiré de la page de présentation vue dans la vidéo Qwen 3.8 Flash (https://youtu.be/SL6vQ2xOIzQ?t=427).

## Fonctionnalités

- **Dashboard VPS** : CPU / RAM / Disk overview (`dashboard/`)
- **Benchmark** (`benchmark/`) : batterie de 60 tests en 8 catégories (sécurité, adversarial, biais, compréhension, logique, fiabilité instructions, code, génération UI), runner OpenAI-compatible, évaluateurs (regex/keyword/security-heuristic/code-exec/LLM-as-judge), rapport complet + corrélation vs 5 baselines (Qwen 3.8 Flash, GPT-5.6, Claude Opus 4.5…)
- **Timer live** : progression SSE avec ETA et grille temps réel (reproduit le timer de la vidéo)
- **Rapport** : score global, breakdown par catégorie, tableau pass/fail des 60 tests, classement multi-modèles, export JSON/Markdown/HTML

## Lancer le benchmark (mock, sans API)

```bash
npm install
npm run bench:mock          # 60 tests en mock (~2s), génère data/runs/<id>.{json,md,html}
# ou avec une vraie API OpenAI-compatible :
BENCHMARK_API_URL=http://localhost:11434 BENCHMARK_API_KEY=sk-... npm run bench -- --model=qwen3-8b-flash
```

## API + Dashboard

```bash
npm run dev                 # API Fastify :3001 (SSE /api/benchmark/runs/:id/stream)
npm run dev:dashboard       # Next.js :3000 → /benchmark
```

## Structure

```
benchmark/suites/index.ts      # 60 scénarios
benchmark/runner/runner.ts     # exécution parallèle + métriques
benchmark/evaluators/index.ts  # juges
benchmark/report/generator.ts  # ranking + markdown/html
data/baselines.json            # 5 modèles de référence
api/server.ts                  # Fastify + SSE
dashboard/app/benchmark/       # UI timer + rapport
```
