# DX data

Measured numbers only. `dx.json` timings are appended in the last section once `bench/dx.ts` has run.

## Same feature, both frameworks (non-blank lines, from the committed sources)

| Feature | Elysia 2 | NestJS 12 | Files touched, Elysia | Files touched, Nest |
|---|---|---|---|---|
| JWT-guarded `GET /me` (verify + DB read) | 6 route + 12 auth helper = 18 | 7 handler + 20 guard = 27 | `app.ts`, `auth.ts` | `users.controller.ts`, `auth.guard.ts` |
| `POST /orders` (validate + insert + 201) | 6 route + 5 schema = 11 | 21 controller + 5 schema = 26 | `app.ts` | `orders.controller.ts`, `schemas.ts` |
| `POST /echo` (validate + echo + 200) | 7 | 11 | `app.ts` | `system.controller.ts`, `schemas.ts` |
| DB wiring (driver switch, pool 10) | 9 | 25 | `db.ts` | `db/db.module.ts` |
| App entry + module wiring | 3 | 20 | `index.ts` | `main.ts`, `app.module.ts` |
| Whole app (7 routes) | 100 lines, 6 files | 188 lines, 9 files (excluding `typebox-standard.ts`, 17 lines, sensitivity run only) | | |

Both apps share `schema.ts` (15 lines) verbatim.

## Config files at app root

| | Elysia 2 (`bun create` not used; hand-written) | NestJS 12 (`nest new`, defaults kept) |
|---|---|---|
| Files | `package.json`, `tsconfig.json`, `bun.lock`, `build.ts`, `build-aot.ts` | `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `.swcrc` (added), `.prettierrc`, `oxlint.json`, `vitest.config.ts`, `vitest.config.e2e.ts` |
| Build step needed to run in production | `bun build` (optional; `bun src/index.ts` also works) | `nest build` (required; Node cannot run the decorators + metadata source directly) |

## Scaffold

| | Elysia | Nest |
|---|---|---|
| Command | none (6 files by hand) | `bunx @nestjs/cli@latest new nest-api --package-manager npm --skip-git --strict` |
| Wall time | — | 35.4 s including `npm install` |
| What it chose | — | ESM (`"type": "module"`, `module: nodenext`), TypeScript 6.0.2, Vitest 4, oxlint, Prettier, Express adapter, `@nestjs/mau` |
| Extra steps to reach the benchmark config | — | swap Express → Fastify, add `@swc/cli @swc/core`, add `.swcrc` (see friction log) |

## Ecosystem readiness on 2026-09-05 (npm dist-tags)

### Elysia 2 (beta) official plugins

| Package | `latest` | `next` (Elysia 2) |
|---|---|---|
| @elysia/openapi | 1.4.16 | 2.0.0-beta.4 |
| @elysia/eden | 1.4.10 | 2.0.0-beta.5 |
| @elysia/node | 1.4.6 | 2.0.0-beta.2 |
| @elysia/static | 1.4.11 | 2.0.0-beta.2 |
| @elysia/jwt | 1.4.2 | 2.0.0-beta.1 |
| @elysia/cors | 1.4.2 | 2.0.0-beta.1 |
| @elysia/bearer | 1.4.4 | 2.0.0-beta.1 |
| @elysia/cron | 1.4.2 | 2.0.0-beta.1 |
| @elysia/html | 1.4.1 | 2.0.0-beta.1 |
| @elysia/server-timing | 1.4.1 | 2.0.0-beta.1 |
| @elysia/opentelemetry | 1.4.12 | 2.0.0-beta.1 |
| @elysia/graphql-yoga | 1.4.1 | 2.0.0-beta.1 |
| @elysia/codemod | 2.0.0-beta.1 | — |

Every official plugin checked has an Elysia 2 beta under `next`; none is stable. The framework itself: `elysia@latest` 1.4.30, `elysia@next` 2.0.0-beta.12, `elysia@experimental` 2.0.0-exp.64.

### NestJS 12 official packages

| Package | version | peer `@nestjs/common` |
|---|---|---|
| @nestjs/swagger | 12.0.1 | ^12 |
| @nestjs/jwt | 12.0.1 | ^8 … ^12 |
| @nestjs/passport | 12.0.0 | ^11 ‖ ^12 |
| @nestjs/config | 12.0.0 | ^11 ‖ ^12 |
| @nestjs/typeorm | 12.0.1 | ^10 … ^12 |
| @nestjs/schedule | 12.0.1 | ^11 ‖ ^12 |
| @nestjs/bullmq | 12.0.0 | ^10 … ^12 |
| @nestjs/graphql | 14.0.0 | ^12 |
| @nestjs/microservices | 12.0.1 | ^12 |
| @nestjs/websockets | 12.0.1 | ^12 |
| @nestjs/cache-manager | 12.0.0 | ^9 … ^12 |
| @nestjs/throttler | 6.5.0 | ^7 … ^11 (no ^12 in peer range yet) |
| @nestjs/observe | 0.1.8 | ^11 ‖ ^12 |

The Nest 12 line is stable across the official packages; one (`@nestjs/throttler`) still lacks `^12` in its peer range.

## Framework features used

| | Elysia 2 | NestJS 12 |
|---|---|---|
| Validation | `t.Object` (TypeBox, compiled by the framework) | `StandardSchemaValidationPipe` + Zod 4 via `@Body({ schema })` |
| Auth | `.derive()` populating `userId`, `status(401)` in handler | `CanActivate` guard, `@UseGuards`, `UnauthorizedException` |
| DI | none; module-level `db` import | `@Global()` module, `useFactory` provider, `@Inject(DB)` |
| Status codes | `status(201, body)` | `@HttpCode(201)` |
| Build | `Bun.build`, optional `aot()` plugin | `nest build` with SWC builder + `.swcrc` |
| Runtime portability | `@elysia/node` adapter exists (not benchmarked) | same `dist/` ran on Node and Bun unchanged |

## Measured (bench/dx.ts, bench/boot.ts — 2026-09-05, Bun 1.4.2, Node 26.3.1)

| Metric | Elysia 2 (Bun) | NestJS 12 (npm/Node) |
|---|---|---|
| fresh install from lockfile (node_modules deleted first; warm package cache) | 0.11 s (`bun install --frozen-lockfile`) | 2.30 s (`npm ci`) |
| node_modules size | 55 MB | 208 MB |
| packages in node_modules | 16 | 365 |
| direct deps runtime / dev | 4 / 2 | 10 / 14 |
| production build, median of 3 | 17 ms (`bun build`, one bundle); AOT 122 ms | 434 ms (`nest build`, SWC, unbundled) |
| dist size | 772 KB; AOT 1332 KB | 40 KB (imports node_modules at runtime) |
| `tsc --noEmit`, median of 3 | 0.65 s (TypeScript 5.9) | 0.73 s (TypeScript 6.0) |
| watch-mode reload after a one-line edit, median of 5 | 64 ms (`bun --watch`) — runs 76, 78, 63, 64, 64 | 738 ms (`nest start --watch`) — runs 723, 738, 753, 741, 736 |
| app source LOC / files | 100 / 6 | 205 / 10 (incl. 17-line TypeBox adapter used only by the sensitivity run) |
| config files at app root | package.json tsconfig.json | .prettierrc .swcrc nest-cli.json oxlint.json package.json tsconfig.json vitest.config.e2e.ts vitest.config.ts |

Startup, 10 cold starts per config (spawn → first 200 from `/health`; then the first `/users/4242` on that process):

| Config | boot to healthy, median | first DB request, median |
|---|---|---|
| A · Nest 12 + Fastify / Node 26 | 405 ms | 17.5 ms |
| B · Nest 12 + Fastify / Bun 1.4.2 | 186 ms | 13.6 ms |
| C · Elysia 2 / Bun 1.4.2 | 94 ms | 17.8 ms |
| D · Elysia 2 + AOT / Bun 1.4.2 | 44 ms | 15.6 ms |

Idle RSS 1.5 s after healthy (from the benchmark run): A 196 MB, B 90 MB, C 39 MB, D 33 MB.
