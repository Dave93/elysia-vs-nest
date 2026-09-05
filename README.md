# Elysia 2 vs NestJS 12 — benchmark data pack

Two identical SaaS-slice APIs and a harness. See `docs/superpowers/specs/` for the design and `docs/methodology.md` for how the numbers were produced.

**The apps under `apps/` are benchmark fixtures, not production code.** They deliberately ship with a hardcoded JWT secret shared with the harness, unauthenticated `/users` and `/orders` routes, and an unauthenticated `/cpu` route that burns CPU on request. Each of those is a measurement choice (isolate framework cost, exercise the runtime). Do not deploy them.

```
bun install && bun run seed          # Postgres on localhost:5432 as postgres
(cd apps/elysia-api && bun install && bun run build && bun run build:aot)
(cd apps/nest-api && npm ci && npx nest build)
bun run parity && bun run noise && bun run bench
bun run boot && bun run dx && bun run cost && bun run report
```
