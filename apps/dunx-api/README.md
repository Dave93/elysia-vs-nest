# dunx-api

Configuration **E**: the same seven routes on [dunx](https://dunx.win), a Bun-native
framework with Nest's programming model. A benchmark fixture, not production code:
the JWT secret is hardcoded and shared with the harness, and `/users`, `/orders`
and `/cpu` are unauthenticated on purpose.

```
bun install && bun run build
bun run start                    # or: bun dist/index.js
bash smoke.sh                    # all seven routes plus the 401
```

`bun bench/parity.ts` from the repo root compares this app's answers with the other
four byte for byte.

## What is shared with the other apps and what is not

`src/schema.ts` and `src/cpu.ts` are copied from `apps/elysia-api` unchanged, so the
Drizzle tables and the 15,000-hash `createHash` loop are the same work. `GET /me`
verifies with `jose`, HS256, as A through D do. Body validation is Zod 4, the same
schemas as the Nest app's, rather than TypeBox.

The database is Drizzle over `Bun.SQL` through `@dunx/infra/db`, pool size 10.
There is no postgres.js path in that package, so `DB_DRIVER` is not read here: E is
the Bun SQL column, next to B, C and D.

## The framework-specific choices a reviewer will want to check

- **`requestLogging: false`** in `src/index.ts`. Request logging is dunx's only
  default middleware, one structured entry per request, and it is off here for the
  same reason the Nest and Fastify loggers are off in A and B. It is also what keeps
  six of the seven routes on the no-middleware path through the route table.
- **`@UseGuards(AuthGuard)` on `/me` only**, which is where A puts its guard too.
  The guard writes the verified id on the request under a symbol and the handler
  reads it back, the same channel `@dunx/http` carries its own trace context on.
- **`status: HttpStatusCode.OK` on `POST /echo`**, because 201 is the POST default.
  `POST /orders` declares no status and gets 201.
- **`src/errors.ts`** narrows the 401 and 404 bodies to `{"error":"..."}`, which is
  what `UnauthorizedException({ error })` and `status(401, { error })` answer with in
  the other two apps. dunx's own mapper adds a `status` field. It runs on the error
  path only, so the seven measured routes pay nothing for it, and validation issues
  keep the default body.
- **No `@Inject`.** `@dunx/transform` records each constructor's parameter types and
  the container resolves them; `build.ts` runs that transform as a `Bun.build`
  plugin, so `dist/index.js` needs no preload and no parser at runtime. `bunfig.toml`
  exists for `bun run dev` only.
- **No response schemas.** dunx can hold a handler's return type to a declared
  response shape at compile time. Neither reference app declares one, so this one
  does not either.
