# Friction log

Every surprise while building both apps, timestamped, with the fix. Raw material, no opinions.

## 2026-09-05

- 08:55 — Nest 12 under Bun from TypeScript source (`bun main.ts`): `TypeError: undefined is not an object (evaluating 'descriptor.value')` in `@nestjs/common/decorators/http/request-mapping.decorator.js:12`. Cause: Bun compiles TS with TC39 decorators unless `tsconfig.json` sets `experimentalDecorators: true` and `emitDecoratorMetadata: true`. Fix: add both. Does not affect config B, which runs the SWC-built `dist/`.
- 08:55 — `bun --version` prints `1.4.1`; `bun --revision` prints `1.4.1-canary.1+7b0b70ece`. The revision is what gets recorded.
- 08:57 — `typebox@1.3.26`: neither `Type.Object(...)` nor `Compile(...)` exposes `~standard`. Nest 12's `@Body({ schema })` cannot take TypeBox directly; the sensitivity run uses a hand-written Standard Schema adapter (`apps/nest-api/src/typebox-standard.ts`).
- 08:57 — Nest `StandardSchemaValidationPipe` rejects with 400 and `{"message":[...],"error":"Bad Request","statusCode":400}`; Elysia 2 rejects with 422 and an RFC 9457 body (`type`, `title`, `status`, `detail`, `on`, `property`, `found`, `expected`, `errors`). Accepted difference; the benchmark never sends invalid bodies.
- 08:57 — Nest `@Post` defaults to 201; Elysia to 200. Aligned by `@HttpCode(200)` on `/echo` and `status(201, ...)` on Elysia `/orders`.
