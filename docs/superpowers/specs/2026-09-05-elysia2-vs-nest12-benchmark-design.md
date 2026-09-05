# Design: Elysia 2 (Bun) vs NestJS 12 (Fastify) — data pack for the article

**Date:** 2026-09-05
**Status:** approved in chat, 2026-09-05

## Goal

Produce every number and every fact the article needs, with provenance, before a single sentence of prose is written. The article follows the shape of "Bun Owns the Speed, Elysia Owns the Memory" (shipkit.davrapps.dev, 2026-08-08): measure a noise floor first, isolate each layer, credit only deltas above the floor, quote one honest number, log what the migration cost, place ShipKit in one section. The business claim under test: the Bun + Elysia stack needs fewer servers than Node + NestJS for the same SaaS traffic.

No article prose is produced here. Output is data, tables, charts, logs and a facts file.

## Configurations

| Id | Framework | Runtime | Build | DB driver |
|----|-----------|---------|-------|-----------|
| A | NestJS 12.0.1 + `@nestjs/platform-fastify` (Fastify 5.12) | Node 26.3.1 | `nest build` with SWC, `node dist/main.js` | Drizzle 0.45 + `postgres` (postgres.js) |
| B | same `dist/` as A | Bun 1.4.1 | `bun dist/main.js` | Drizzle + `drizzle-orm/bun-sql` |
| C | Elysia 2.0.0-beta.12 | Bun 1.4.1 | `bun build --target=bun` → `bun dist/index.js` | Drizzle + `bun-sql` |
| D | C + `aot` plugin from `elysia/plugin/aot/bun` | Bun 1.4.1 | `Bun.build` with the AOT plugin | Drizzle + `bun-sql` |

Isolation reading: A→B is the runtime layer (Bun runtime plus Bun's native Postgres client), B→C is the framework layer (same runtime, same driver), C→D is the build layer.

Driver selection is an env switch in both apps: `DB_DRIVER=postgresjs|bunsql`, default follows the runtime.

Sensitivity runs (small, one concurrency level, DB or validation routes only):

1. B with `DB_DRIVER=postgresjs` — splits runtime gain from driver gain.
2. Nest with TypeBox via Standard Schema on `POST /echo` — splits Zod cost from framework cost. Runs only if `typebox` 1.3 exposes `~standard`; otherwise recorded as not applicable.

Optional config E (Nest + Express on Node) is not built unless requested.

## Workload: a SaaS slice

Seven routes, identical in both apps. Postgres 17 on the host (Homebrew, `postgres` superuser, port 5432). Database `bench_saas`, created and seeded by `bench/seed.ts` with a fixed random seed: 50,000 users, 200,000 orders.

| Route | What it isolates | Notes |
|-------|------------------|-------|
| `GET /health` | framework overhead | returns `{"status":"ok"}` |
| `POST /echo` | body validation | `{name: string 1..100, email: email, age: int 0..150, tags: string[] 0..10}`, echoed back. Elysia: `t.Object`. Nest: `StandardSchemaValidationPipe` + Zod 4 |
| `GET /me` | auth guard + DB | `Authorization: Bearer <HS256 JWT>` verified with `jose` in both, then `SELECT` user by id from the token |
| `GET /users/:id` | single-row read | param validated as positive int |
| `GET /users?page=N&limit=20` | list + serialization | 20 rows, ordered by id |
| `POST /orders` | validated insert | `{userId, amount, currency}` inserted, row returned. Table truncated to seed state between configs |
| `GET /cpu?n=15000` | runtime CPU only | SHA-256 iterated n times from a fixed seed, hex returned |

Response bodies must be byte-identical across configs except for volatile fields (`id` of a new order, timestamps). `bench/parity.ts` checks this before any measurement and aborts on mismatch.

## Fairness rules

- Production mode in every config: `NODE_ENV=production`, Nest logger off, Fastify `logger: false`, no request logging in Elysia.
- Connection pool size 10 in both.
- One process per config. No cluster mode. The cost model normalizes per core instead.
- Load generator (bombardier) on the same machine; recorded as a caveat.
- Fixed run order A, B, C, D, reported in the results.
- Port 3000 for every config; each server fully stopped (SIGTERM, wait for exit) before the next starts.
- Same `jose`, same Drizzle, same schema file, same seed.

## Measurement

Harness forked from an earlier local benchmark harness (bombardier `--format json`, `ps -o rss=,%cpu=` sampler every 500 ms, medians of repeats, persist after every combination).

- Warm-up 5 s (discarded), then 3 repeats × 30 s, median per metric.
- Concurrency 10, 100, 500.
- 4 configs × 7 routes × 3 levels × 3 repeats ≈ 2.5 h unattended. `BENCH_QUICK=1` runs 1 × 3 s at c=10 for plumbing.
- Noise floor measured first: config C, routes `/health` and `/users/:id`, c=100, 5 back-to-back 30 s repeats. Coefficient of variation is reported as the significance floor. Deltas inside it are called noise in `facts.md`.

Metrics per combination: rps (mean), latency p50/p90/p99/max, non-2xx count, idle RSS, mean and peak RSS, mean and peak CPU (100 % = one core). Derived: rps per core = rps ÷ (mean CPU / 100); rps per MB = rps ÷ mean RSS.

Startup and build metrics (`bench/boot.ts`, `bench/dx.ts`), 10 runs each where timing is involved:

- boot to healthy (process spawn → first 200 from `/health`)
- cold first-request latency
- build time and `dist/` size
- fresh install time, `node_modules` size, dependency count (direct and transitive)
- typecheck time (`tsc --noEmit`)
- watch-mode reload time after touching one controller/route file (`nest start --watch` vs `bun --watch`)
- LOC and file count per app (`cloc` or `wc`, same rules for both)

## Cost model

Inputs: rps per core and mean RSS from the DB-backed routes at c=100. For target sustained loads of 1,000, 5,000 and 20,000 rps with 50 % CPU headroom, compute vCPU and RAM required, then the smallest matching plans on three price lists fetched at build time and snapshotted with date and URL: Hetzner Cloud (CX/CPX or CAX), Fly.io (shared-cpu machines), AWS (t4g/c7g on-demand). Output `results/cost-model.json` and `results/cost-model.md` with monthly USD per stack per load and the assumptions listed next to the numbers.

## DX data

`results/friction-log.md` is written while both apps are built: every breaking change hit, every Nest 12 ESM issue, every Elysia 2 beta gap or plugin mismatch, with a timestamp and the fix. `results/dx.md` collects the measured numbers above plus a table of "same feature, both frameworks" code sizes (route + validation + guard + DB call). No opinions in these files; those belong to the article.

## Deliverables

```
elysia_vs_nest/
├── apps/
│   ├── nest-api/        # NestJS 12 + Fastify, ESM, SWC build
│   └── elysia-api/      # Elysia 2 beta, bun build, AOT build script
├── bench/
│   ├── lib.ts           # config specs, server lifecycle, stats helpers
│   ├── seed.ts          # create + seed bench_saas
│   ├── parity.ts        # cross-config response equality
│   ├── noise.ts         # noise floor run
│   ├── bench.ts         # full orchestrator
│   ├── boot.ts          # startup timings
│   ├── dx.ts            # build / install / typecheck / reload timings
│   ├── cost.ts          # cost model from results + pricing snapshot
│   └── report.ts        # results.json → summary.md + results.html
├── results/
│   ├── results.json, noise.json, boot.json, dx.json
│   ├── summary.md       # every table the article can lift
│   ├── results.html     # local charts, inline CSS/JS, no CDN
│   ├── cost-model.md, cost-model.json, pricing-snapshot.json
│   ├── dx.md, friction-log.md
│   └── facts.md         # every number with provenance; the Facts node for content-graph-flow
└── docs/
    ├── methodology.md
    └── superpowers/specs/, plans/
```

`results.html` stays local. It is not published as a claude.ai artifact.

## Error handling

- Server not healthy within 15 s: run aborts with the config name.
- Parity mismatch: abort before benchmarking.
- Non-2xx during a run: recorded per combination, flagged in summary and facts.
- Server death mid-run: combination marked failed, harness continues.
- Results persisted after every combination so a crash loses at most one.

## Testing

- `bench/parity.ts` and a `BENCH_QUICK=1` pass must succeed before the full run.
- Each app has a smoke script hitting all seven routes.
- `report.ts` regenerates from `results.json` without re-running anything.
