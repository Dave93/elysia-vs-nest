# Friction log

Every surprise while building both apps, timestamped, with the fix. Raw material, no opinions.

## 2026-09-05

- 08:55 — Nest 12 under Bun from TypeScript source (`bun main.ts`): `TypeError: undefined is not an object (evaluating 'descriptor.value')` in `@nestjs/common/decorators/http/request-mapping.decorator.js:12`. Cause: Bun compiles TS with TC39 decorators unless `tsconfig.json` sets `experimentalDecorators: true` and `emitDecoratorMetadata: true`. Fix: add both. Does not affect config B, which runs the SWC-built `dist/`.
- 08:55 — `bun --version` prints `1.4.1`; `bun --revision` prints `1.4.1-canary.1+7b0b70ece`. The revision is what gets recorded.
- 08:57 — `typebox@1.3.26`: neither `Type.Object(...)` nor `Compile(...)` exposes `~standard`. Nest 12's `@Body({ schema })` cannot take TypeBox directly; the sensitivity run uses a hand-written Standard Schema adapter (`apps/nest-api/src/typebox-standard.ts`).
- 08:57 — Nest `StandardSchemaValidationPipe` rejects with 400 and `{"message":[...],"error":"Bad Request","statusCode":400}`; Elysia 2 rejects with 422 and an RFC 9457 body (`type`, `title`, `status`, `detail`, `on`, `property`, `found`, `expected`, `errors`). Accepted difference; the benchmark never sends invalid bodies.
- 08:57 — Nest `@Post` defaults to 201; Elysia to 200. Aligned by `@HttpCode(200)` on `/echo` and `status(201, ...)` on Elysia `/orders`.
- 09:08 — Elysia app: `bun install` for 4 runtime deps + 2 dev deps took 0.83 s wall, 14 packages, `node_modules` 55 MB. `bun build.ts` 0.04 s → `dist/index.js` 790,160 bytes. `bun build-aot.ts` 0.15 s → `dist-aot/index.js` 1,361,590 bytes. The AOT bundle is 72% larger than the plain one: precompiled route handlers and validators are inlined instead of generated at boot. `aot("src/app.ts")` (the instance module) worked first try; `process.exit(0)` after the build was needed as the reference article warned.
- 09:08 — Smoke on `dist`, `dist-aot`, and `dist` with `DB_DRIVER=postgresjs`: all 7 routes + 401 identical. `bun run typecheck` clean.
