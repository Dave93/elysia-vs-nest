# Methodology

How every number in `results/` was produced. Written so the article can cite it and a reader can reproduce it.

## Hardware and software

One machine, a MacBook Pro with Apple M4 Pro (14 cores, 48 GB). The load generator, the API under test and Postgres 17 all ran on it. That makes the absolute numbers a laptop measurement, not a server one; the point of the setup is attribution between configurations on the same harness, which is what the comparisons below rely on. Exact versions are recorded in `results/results.json` under `env` at run time (Bun revision, Node, Elysia, `@nestjs/core`, Fastify, Drizzle, Postgres, bombardier).

## The four configurations

| Id | Framework | Runtime | Build | DB driver |
|----|-----------|---------|-------|-----------|
| A | NestJS 12 + `@nestjs/platform-fastify` | Node 26 | `nest build` with the SWC builder, ESM output, `node dist/main.js` | Drizzle + postgres.js |
| B | same `dist/` as A | Bun 1.4 | `bun dist/main.js` | Drizzle + Bun SQL |
| C | Elysia 2 beta | Bun 1.4 | `bun build --target=bun`, `bun dist/index.js` | Drizzle + Bun SQL |
| D | C + Elysia AOT plugin | Bun 1.4 | `Bun.build` with `aot()` from `elysia/plugin/aot/bun` | Drizzle + Bun SQL |

Reading the steps: A→B changes the runtime and, with it, the Postgres client (the driver follows the runtime by design). B→C changes only the framework: same runtime, same driver, same schema. C→D changes only the build step. A→D is the whole stack swap a startup would actually make.

Two sensitivity runs split the confounders inside those steps. B-pgjs runs the Nest build on Bun with postgres.js instead of Bun SQL, which separates the runtime's own gain from the driver's. A-typebox runs Nest on Node with a compiled TypeBox validator behind Nest 12's Standard Schema pipe instead of Zod 4, which separates the validator's cost from the framework's on `POST /echo`.

## The workload

Seven routes, identical in both apps, against one Postgres database seeded with a fixed PRNG (50,000 users, 200,000 orders):

| Route | Isolates |
|-------|----------|
| `GET /health` | framework overhead |
| `POST /echo` | body validation (TypeBox in Elysia, Zod via `StandardSchemaValidationPipe` in Nest) |
| `GET /me` | JWT verification (`jose`, HS256, in both) + one-row read |
| `GET /users/:id` | single-row read |
| `GET /users?page=7&limit=20` | 20-row list and serialization |
| `POST /orders` | validated insert with `RETURNING` |
| `GET /cpu?n=15000` | 15,000 chained SHA-256 hashes; runtime CPU with no framework work to speak of |

`bench/parity.ts` starts every configuration in turn and compares the response body of every route byte for byte (order `id` and `createdAt` excluded). The benchmark does not run until parity passes.

## Fairness rules

`NODE_ENV=production` everywhere; Nest logger and Fastify logger off; no request logging in Elysia. Pool size 10 in both. One process per configuration, no cluster mode; the cost model normalizes per core instead. Port 3000 for all; each server is stopped with SIGTERM and awaited before the next starts. Run order A, B, C, D, fixed and recorded. The `orders` table is reset to its seeded state before each configuration.

## Measurement

`bench/bench.ts` drives bombardier (`--format json`) at concurrency 10, 100 and 500. Each combination gets a 5 s warm-up that is discarded, then three 30 s runs; the median of the three is what the tables report. During every run a sampler reads `ps -o rss=,%cpu=` for the server PID every 500 ms; mean and peak RSS and CPU come from those samples, where 100 % means one core. Derived: rps per core = rps ÷ (mean CPU ÷ 100); rps per MB = rps ÷ mean RSS. Idle RSS is a single sample 1.5 s after the server reported healthy, before any load. Results are written to disk after every combination.

**Noise floor.** Before the main run, `bench/noise.ts` hits `/health` and `/users/4242` on configuration C at c=100 five times back to back (30 s each). The largest spread, (max − min) ÷ min, is the significance floor. Any delta smaller than it is labelled `noise` in `summary.md` and `facts.md`.

**Startup.** `bench/boot.ts` cold-starts each configuration ten times, measuring spawn → first 200 from `/health`, then the latency of the first `/users/4242` request on that fresh process.

**DX.** `bench/dx.ts` deletes `node_modules` and times a lockfile install (`bun install --frozen-lockfile` vs `npm ci`), then three production builds, three `tsc --noEmit` runs, and five watch-mode reloads (a comment appended to a source file; the app prints `boot <epoch ms>` when `BOOT_MARK=1`, and the reload time is that stamp minus the write time). It also records `node_modules` size, package count, direct dependencies, `dist/` size, source LOC and file count.

## Cost model

`bench/cost.ts` takes, per configuration, the mean rps-per-core across the four DB-backed routes (`me`, `user`, `list`, `order`) at c=100 and the highest peak RSS among them. For sustained loads of 1,000, 5,000 and 20,000 rps it computes cores = load ÷ (rps per core × 0.5), i.e. running cores at 50 %, and RAM = ceil(cores) × peak RSS × 1.5. It then picks, for each provider in `results/pricing-snapshot.json`, the plan and count that cover both cores and RAM at the lowest monthly price. The snapshot is dated and carries source URLs. The dollar figures are relative, laptop-derived and exclude database, bandwidth and load balancing; they say how the four stacks compare, not what a bill will be.

## Caveats

- Load generator, API and Postgres on the same machine, so at c=500 the client competes for cores with the server.
- A laptop under macOS, with the thermal and scheduler behavior that implies; the noise-floor run exists because of it.
- Single process. Both stacks can run one process per core; the per-core figures are the honest way to compare them.
- Elysia 2 is a beta at the pinned version; NestJS 12 is a stable release. Both are pinned exactly in the app `package.json` files.
