# Elysia 2 vs NestJS 12 Benchmark Data Pack — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two identical SaaS-slice APIs (NestJS 12 + Fastify, Elysia 2 beta), a benchmark harness with four configs, and produce a results/data pack (json, tables, charts, cost model, DX log, facts file) for the article.

**Architecture:** Two self-contained apps under `apps/`, each with its own `package.json` (install size is a metric). A Bun-run harness under `bench/` starts one server at a time on port 3000, drives it with bombardier, samples RSS/CPU with `ps`, and persists everything to `results/*.json`; `report.ts` renders tables/charts/facts from json only.

**Tech Stack:** Bun 1.4.1 (`1.4.1-canary.1+7b0b70ece`), Node 26.3.1, Elysia 2.0.0-beta.12, NestJS 12.0.1 + @nestjs/platform-fastify 12.0.1 (Fastify 5.12), Drizzle 0.45, postgres.js 3.4, Bun SQL, jose 6, zod 4, typebox 1.3, Postgres 17 (Homebrew, host), bombardier.

**Spec:** `docs/superpowers/specs/2026-09-05-elysia2-vs-nest12-benchmark-design.md`

## Global Constraints

- Configs A/B/C/D exactly as in spec; driver follows runtime (`DB_DRIVER=postgresjs|bunsql`, default by runtime).
- Seven routes byte-identical in body (volatile fields excluded): `/health`, `POST /echo`, `/me`, `/users/:id`, `/users?page&limit`, `POST /orders`, `/cpu?n`.
- POST `/echo` returns 200; POST `/orders` returns 201 in both frameworks.
- Production mode: `NODE_ENV=production`, all logging off, pool size 10, one process, no cluster, port 3000.
- Postgres: `postgres://postgres@localhost:5432/bench_saas`, 50,000 users, 200,000 orders, fixed seed.
- JWT: HS256, secret `bench-secret-do-not-use-in-prod`, `sub` = `"4242"`, verified with `jose` in both.
- Harness: warm-up 5 s, 3 × 30 s, c = 10/100/500, medians; `BENCH_QUICK=1` → 1 × 3 s at c=10.
- Friction log: every surprise goes into `results/friction-log.md` with timestamp the moment it happens.
- `results/results.html` is local only, inline CSS/JS, no CDN, never published as an artifact.
- Commit after every task.

---

## File map

| Path | Responsibility |
|---|---|
| `package.json` (root) | harness deps: `jose`, `postgres`, `@types/bun`; scripts |
| `bench/lib.ts` | `CONFIGS`, `startServer`, `median`, `mean`, `cv`, `sampleProc`, `startSampler`, `sh`, `TOKEN` |
| `bench/seed.ts` | drop/create `bench_saas`, seed users + orders, snapshot count |
| `bench/cases.ts` | `CASES` (bombardier args per route) + `EXPECTED` bodies for parity |
| `bench/parity.ts` | start each config, compare bodies, exit non-zero on mismatch |
| `bench/noise.ts` | noise-floor run → `results/noise.json` |
| `bench/bench.ts` | full orchestrator → `results/results.json` |
| `bench/boot.ts` | boot-to-healthy, cold first request → `results/boot.json` |
| `bench/dx.ts` | build/install/typecheck/reload timings, LOC → `results/dx.json` |
| `bench/cost.ts` | `results.json` + `pricing-snapshot.json` → `cost-model.{json,md}` |
| `bench/report.ts` | json → `summary.md`, `results.html`, `facts.md` |
| `apps/elysia-api/src/{app,index,db,schema,auth,cpu}.ts`, `build.ts`, `build-aot.ts` | Elysia app |
| `apps/nest-api/src/**` | Nest app: `main.ts`, `app.module.ts`, `db/`, `auth/`, `system/`, `users/`, `orders/`, `schemas.ts` |
| `results/friction-log.md` | timestamped surprises |
| `docs/methodology.md` | how numbers were produced |

---

### Task 1: Repo skeleton, harness deps, friction log

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `bench/lib.ts`, `results/friction-log.md`

**Interfaces:**
- Produces: `CONFIGS: ConfigSpec[]` with `{ id: 'A'|'B'|'C'|'D'|'B-pgjs'|'A-typebox', label, cmd: string[], env }`; `startServer(cfg) → { pid, stop }`; `median`, `mean`, `cv`, `sampleProc(pid) → {rss, cpu}|null`, `startSampler(pid) → {stop(): samples}`, `sh(cmd) → string`, `BASE_URL`, `TOKEN` (Promise<string>), `SECRET`.

- [ ] **Step 1: Root files**

```bash
cat > package.json <<'EOF'
{
  "name": "elysia-vs-nest",
  "private": true,
  "type": "module",
  "scripts": {
    "seed": "bun bench/seed.ts",
    "parity": "bun bench/parity.ts",
    "noise": "bun bench/noise.ts",
    "bench": "bun bench/bench.ts",
    "boot": "bun bench/boot.ts",
    "dx": "bun bench/dx.ts",
    "cost": "bun bench/cost.ts",
    "report": "bun bench/report.ts"
  },
  "devDependencies": { "@types/bun": "^1.3.14" },
  "dependencies": { "jose": "^6.2.11", "postgres": "^3.4.9" }
}
EOF
cat > tsconfig.json <<'EOF'
{ "compilerOptions": { "target": "ESNext", "module": "ESNext", "moduleResolution": "bundler", "strict": true, "skipLibCheck": true, "types": ["bun-types"] }, "include": ["bench"] }
EOF
printf 'node_modules/\napps/*/dist/\napps/*/dist-aot/\n.DS_Store\n' > .gitignore
printf '# Friction log\n\nEvery surprise while building both apps, timestamped, with the fix. Raw material, no opinions.\n\n## 2026-09-05\n\n- 08:5x — Nest 12 under Bun (`bun main.ts`): `TypeError: undefined is not an object (evaluating '"'"'descriptor.value'"'"')` in `request-mapping.decorator.js`. Cause: Bun compiles TS with TC39 decorators unless `tsconfig.json` sets `experimentalDecorators: true` + `emitDecoratorMetadata: true`. Fix: add both. Not an issue for config B, which runs SWC-built `dist/`.\n- 08:5x — `bun --version` prints `1.4.1`; `bun --revision` prints `1.4.1-canary.1+7b0b70ece`. Record the revision, not the short version.\n- 08:5x — `typebox@1.3.26`: neither `Type.Object(...)` nor `Compile(...)` exposes `~standard`. Nest cannot consume TypeBox directly through `@Body({ schema })`; sensitivity run uses a hand-written 10-line Standard Schema adapter.\n' > results/friction-log.md
bun install
```

- [ ] **Step 2: Write `bench/lib.ts`**

```ts
// bench/lib.ts — configs, server lifecycle, stats. Run everything from repo root.
import { SignJWT } from "jose";

export interface ConfigSpec {
  id: "A" | "B" | "C" | "D" | "B-pgjs" | "A-typebox";
  label: string;
  cmd: string[];
  env: Record<string, string>;
  sensitivity?: boolean;
}

const BASE_ENV = { NODE_ENV: "production", PORT: "3000", DATABASE_URL: "postgres://postgres@localhost:5432/bench_saas" };

export const CONFIGS: ConfigSpec[] = [
  { id: "A", label: "Nest 12 + Fastify / Node 26", cmd: ["node", "apps/nest-api/dist/main.js"], env: { ...BASE_ENV, DB_DRIVER: "postgresjs" } },
  { id: "B", label: "Nest 12 + Fastify / Bun 1.4", cmd: ["bun", "apps/nest-api/dist/main.js"], env: { ...BASE_ENV, DB_DRIVER: "bunsql" } },
  { id: "C", label: "Elysia 2 / Bun 1.4", cmd: ["bun", "apps/elysia-api/dist/index.js"], env: { ...BASE_ENV, DB_DRIVER: "bunsql" } },
  { id: "D", label: "Elysia 2 + AOT / Bun 1.4", cmd: ["bun", "apps/elysia-api/dist-aot/index.js"], env: { ...BASE_ENV, DB_DRIVER: "bunsql" } },
  { id: "B-pgjs", label: "Nest 12 + Fastify / Bun 1.4, postgres.js", cmd: ["bun", "apps/nest-api/dist/main.js"], env: { ...BASE_ENV, DB_DRIVER: "postgresjs" }, sensitivity: true },
  { id: "A-typebox", label: "Nest 12 + Fastify / Node 26, TypeBox validator", cmd: ["node", "apps/nest-api/dist/main.js"], env: { ...BASE_ENV, DB_DRIVER: "postgresjs", VALIDATOR: "typebox" }, sensitivity: true },
];

export function selectConfigs(): ConfigSpec[] {
  const only = process.env.CONFIGS?.split(",").map((s) => s.trim());
  return CONFIGS.filter((c) => (only ? only.includes(c.id) : !c.sensitivity));
}

export const BASE_URL = "http://127.0.0.1:3000";
export const SECRET = "bench-secret-do-not-use-in-prod";
export const TOKEN: Promise<string> = new SignJWT({})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("4242")
  .setIssuedAt(0)
  .sign(new TextEncoder().encode(SECRET));

export async function sh(cmd: string[], cwd?: string): Promise<string> {
  const p = Bun.spawn(cmd, { stdout: "pipe", stderr: "ignore", cwd });
  const out = await new Response(p.stdout).text();
  await p.exited;
  return out.trim();
}

export async function startServer(cfg: ConfigSpec): Promise<{ pid: number; stop: () => Promise<void>; readyMs: number }> {
  const t0 = performance.now();
  const proc = Bun.spawn(cfg.cmd, { env: { ...process.env, ...cfg.env }, stdout: "ignore", stderr: "inherit" });
  const deadline = Date.now() + 15_000;
  for (;;) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) break;
    } catch {}
    if (Date.now() > deadline) { proc.kill(); throw new Error(`${cfg.id}: server not ready within 15s`); }
    await Bun.sleep(20);
  }
  const readyMs = performance.now() - t0;
  return {
    pid: proc.pid,
    readyMs,
    stop: async () => { proc.kill("SIGTERM"); await proc.exited; await Bun.sleep(500); },
  };
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
}
export function cv(xs: number[]): number {
  const m = mean(xs); if (!m) return 0;
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) / m;
}

export async function sampleProc(pid: number): Promise<{ rss: number; cpu: number } | null> {
  const out = await sh(["ps", "-o", "rss=,%cpu=", "-p", String(pid)]);
  const [rss, cpu] = out.split(/\s+/).map(Number);
  if (!Number.isFinite(rss) || !Number.isFinite(cpu)) return null;
  return { rss: rss / 1024, cpu };
}

export function startSampler(pid: number) {
  const samples: { rss: number; cpu: number }[] = [];
  let active = true;
  (async () => { while (active) { const s = await sampleProc(pid); if (s) samples.push(s); await Bun.sleep(500); } })();
  return { stop: () => { active = false; return samples; } };
}

export async function collectEnv() {
  const pkg = async (p: string) => { try { return JSON.parse(await Bun.file(p).text()).version as string; } catch { return "?"; } };
  return {
    date: new Date().toISOString(),
    cpu: await sh(["sysctl", "-n", "machdep.cpu.brand_string"]),
    cores: Number(await sh(["sysctl", "-n", "hw.ncpu"])),
    ramGB: Number(await sh(["sysctl", "-n", "hw.memsize"])) / 2 ** 30,
    macos: await sh(["sw_vers", "-productVersion"]),
    bun: await sh(["bun", "--revision"]),
    node: await sh(["node", "--version"]),
    postgres: await sh(["psql", "--version"]),
    bombardier: await sh(["bombardier", "--version"]),
    elysia: await pkg("apps/elysia-api/node_modules/elysia/package.json"),
    nestCore: await pkg("apps/nest-api/node_modules/@nestjs/core/package.json"),
    fastify: await pkg("apps/nest-api/node_modules/fastify/package.json"),
    drizzle: await pkg("apps/elysia-api/node_modules/drizzle-orm/package.json"),
  };
}
```

- [ ] **Step 3: Sanity run**

Run: `bun -e 'import {CONFIGS,TOKEN,median} from "./bench/lib.ts"; console.log(CONFIGS.length, (await TOKEN).slice(0,20), median([3,1,2]))'`
Expected: `6 eyJhbGciOiJIUzI1NiJ9 2`

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: harness skeleton, configs, friction log"
```

---

### Task 2: Database seed

**Files:**
- Create: `bench/seed.ts`, `bench/schema.sql`

**Interfaces:**
- Produces: database `bench_saas` with tables `users(id serial pk, name text, email text unique, age int, created_at timestamptz)` and `orders(id serial pk, user_id int fk, amount numeric(12,2), currency char(3), created_at timestamptz)`; `resetOrders()` exported for the bench to truncate to seed state.

- [ ] **Step 1: Write schema + seed**

```sql
-- bench/schema.sql
DROP TABLE IF EXISTS orders; DROP TABLE IF EXISTS users;
CREATE TABLE users (id serial PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, age int NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE orders (id serial PRIMARY KEY, user_id int NOT NULL REFERENCES users(id), amount numeric(12,2) NOT NULL, currency char(3) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX orders_user_id_idx ON orders(user_id);
```

```ts
// bench/seed.ts — deterministic seed. Run: bun bench/seed.ts
import postgres from "postgres";
const USERS = 50_000, ORDERS = 200_000, SEED_ORDERS_MAX_ID = ORDERS;
const admin = postgres("postgres://postgres@localhost:5432/postgres");
await admin`DROP DATABASE IF EXISTS bench_saas WITH (FORCE)`;
await admin`CREATE DATABASE bench_saas`;
await admin.end();
const sql = postgres("postgres://postgres@localhost:5432/bench_saas");
await sql.unsafe(await Bun.file("bench/schema.sql").text());
// mulberry32 PRNG, fixed seed → identical data on every run
let s = 20260905; const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const CUR = ["USD", "EUR", "GBP"];
for (let i = 0; i < USERS; i += 5000) {
  const rows = Array.from({ length: 5000 }, (_, j) => ({ name: `User ${i + j + 1}`, email: `user${i + j + 1}@example.com`, age: 18 + Math.floor(rnd() * 60), created_at: new Date(1_700_000_000_000 + (i + j) * 1000) }));
  await sql`INSERT INTO users ${sql(rows, "name", "email", "age", "created_at")}`;
}
for (let i = 0; i < ORDERS; i += 5000) {
  const rows = Array.from({ length: 5000 }, () => ({ user_id: 1 + Math.floor(rnd() * USERS), amount: (rnd() * 500).toFixed(2), currency: CUR[Math.floor(rnd() * 3)], created_at: new Date(1_710_000_000_000 + Math.floor(rnd() * 1e9)) }));
  await sql`INSERT INTO orders ${sql(rows, "user_id", "amount", "currency", "created_at")}`;
}
const [{ u }] = await sql`SELECT count(*)::int AS u FROM users`; const [{ o }] = await sql`SELECT count(*)::int AS o FROM orders`;
console.log({ users: u, orders: o });
await sql.end();

export async function resetOrders() {
  const c = postgres("postgres://postgres@localhost:5432/bench_saas");
  await c`DELETE FROM orders WHERE id > ${SEED_ORDERS_MAX_ID}`;
  await c`SELECT setval('orders_id_seq', ${SEED_ORDERS_MAX_ID})`;
  await c.end();
}
```

Note: `resetOrders` must live in its own module so importing it does not re-seed. Move it to `bench/db-reset.ts` and export from there; `seed.ts` keeps only the seeding body.

- [ ] **Step 2: Run and verify**

Run: `bun bench/seed.ts && psql -U postgres bench_saas -c "select id,name,email,age from users where id=4242" -c "select count(*) from orders where user_id=4242"`
Expected: `{ users: 50000, orders: 200000 }`, one row for 4242, a non-zero order count.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(bench): deterministic Postgres seed"
```

---

### Task 3: Elysia app

**Files:**
- Create: `apps/elysia-api/package.json`, `tsconfig.json`, `src/schema.ts`, `src/db.ts`, `src/auth.ts`, `src/cpu.ts`, `src/app.ts`, `src/index.ts`, `build.ts`, `build-aot.ts`, `smoke.sh`

**Interfaces:**
- Consumes: DB from Task 2; env `PORT`, `DATABASE_URL`, `DB_DRIVER`.
- Produces: `dist/index.js` (config C) and `dist-aot/index.js` (config D); routes per spec.

- [ ] **Step 1: Package + tsconfig**

```bash
mkdir -p apps/elysia-api/src && cd apps/elysia-api
cat > package.json <<'EOF'
{
  "name": "elysia-api", "private": true, "type": "module",
  "scripts": { "dev": "bun --watch src/index.ts", "build": "bun build.ts", "build:aot": "bun build-aot.ts", "start": "NODE_ENV=production bun dist/index.js", "typecheck": "tsc --noEmit" },
  "dependencies": { "elysia": "2.0.0-beta.12", "drizzle-orm": "^0.45.2", "postgres": "^3.4.9", "jose": "^6.2.11" },
  "devDependencies": { "@types/bun": "^1.3.14", "typescript": "^5.9.0" }
}
EOF
cat > tsconfig.json <<'EOF'
{ "compilerOptions": { "target": "ESNext", "module": "ESNext", "moduleResolution": "bundler", "strict": true, "skipLibCheck": true, "types": ["bun-types"] }, "include": ["src", "build.ts", "build-aot.ts"] }
EOF
/usr/bin/time -p bun install 2>&1 | tail -3   # record real time in friction-log as "fresh install"
cd ../..
```

- [ ] **Step 2: Shared modules**

```ts
// apps/elysia-api/src/schema.ts
import { pgTable, serial, text, integer, numeric, char, timestamp } from "drizzle-orm/pg-core";
export const users = pgTable("users", { id: serial("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull(), age: integer("age").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull() });
export const orders = pgTable("orders", { id: serial("id").primaryKey(), userId: integer("user_id").notNull(), amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), currency: char("currency", { length: 3 }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull() });
```

```ts
// apps/elysia-api/src/db.ts — driver follows runtime unless DB_DRIVER is set
import * as schema from "./schema";
const url = process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/bench_saas";
const driver = process.env.DB_DRIVER ?? (typeof Bun !== "undefined" ? "bunsql" : "postgresjs");
export const db = driver === "bunsql"
  ? (await import("drizzle-orm/bun-sql")).drizzle(new (await import("bun")).SQL({ url, max: 10 }), { schema })
  : (await import("drizzle-orm/postgres-js")).drizzle((await import("postgres")).default(url, { max: 10 }), { schema });
export { schema };
```

```ts
// apps/elysia-api/src/auth.ts
import { jwtVerify } from "jose";
const KEY = new TextEncoder().encode(process.env.JWT_SECRET ?? "bench-secret-do-not-use-in-prod");
export async function userIdFromAuthHeader(h: string | undefined): Promise<number | null> {
  if (!h?.startsWith("Bearer ")) return null;
  try { const { payload } = await jwtVerify(h.slice(7), KEY, { algorithms: ["HS256"] }); const id = Number(payload.sub); return Number.isInteger(id) ? id : null; }
  catch { return null; }
}
```

```ts
// apps/elysia-api/src/cpu.ts
import { createHash } from "node:crypto";
export function sha256Loop(n: number): string {
  let h = "elysia-vs-nest";
  for (let i = 0; i < n; i++) h = createHash("sha256").update(h).digest("hex");
  return h;
}
```

- [ ] **Step 3: App + entry**

```ts
// apps/elysia-api/src/app.ts — exports the instance (AOT build points here)
import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { userIdFromAuthHeader } from "./auth";
import { sha256Loop } from "./cpu";

const EchoBody = t.Object({ name: t.String({ minLength: 1, maxLength: 100 }), email: t.String({ format: "email" }), age: t.Integer({ minimum: 0, maximum: 150 }), tags: t.Array(t.String(), { maxItems: 10 }) });
const OrderBody = t.Object({ userId: t.Integer({ minimum: 1 }), amount: t.Number({ minimum: 0 }), currency: t.Union([t.Literal("USD"), t.Literal("EUR"), t.Literal("GBP")]) });
const serializeUser = (u: typeof schema.users.$inferSelect) => ({ id: u.id, name: u.name, email: u.email, age: u.age, createdAt: u.createdAt.toISOString() });
const serializeOrder = (o: typeof schema.orders.$inferSelect) => ({ id: o.id, userId: o.userId, amount: o.amount, currency: o.currency, createdAt: o.createdAt.toISOString() });

export const app = new Elysia()
  .get("/health", () => ({ status: "ok" }))
  .post("/echo", { body: EchoBody }, ({ body }) => body)
  .get("/cpu", { query: t.Object({ n: t.Integer({ minimum: 1, maximum: 1_000_000 }) }) }, ({ query }) => ({ n: query.n, hash: sha256Loop(query.n) }))
  .get("/users/:id", { params: t.Object({ id: t.Integer({ minimum: 1 }) }) }, async ({ params, status }) => {
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, params.id)).limit(1);
    return u ? serializeUser(u) : status(404, { error: "not found" });
  })
  .get("/users", { query: t.Object({ page: t.Integer({ minimum: 1, default: 1 }), limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }) }) }, async ({ query }) => {
    const rows = await db.select().from(schema.users).orderBy(schema.users.id).limit(query.limit).offset((query.page - 1) * query.limit);
    return { page: query.page, limit: query.limit, items: rows.map(serializeUser) };
  })
  .post("/orders", { body: OrderBody }, async ({ body, status }) => {
    const [o] = await db.insert(schema.orders).values({ userId: body.userId, amount: body.amount.toFixed(2), currency: body.currency, createdAt: new Date() }).returning();
    return status(201, serializeOrder(o));
  })
  .derive(async ({ headers }) => ({ userId: await userIdFromAuthHeader(headers.authorization) }))
  .get("/me", async ({ userId, status }) => {
    if (!userId) return status(401, { error: "unauthorized" });
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    return u ? serializeUser(u) : status(404, { error: "not found" });
  });
```

```ts
// apps/elysia-api/src/index.ts
import { app } from "./app";
app.listen(Number(process.env.PORT ?? 3000));
```

```ts
// apps/elysia-api/build.ts
const r = await Bun.build({ entrypoints: ["src/index.ts"], outdir: "dist", target: "bun", minify: false, sourcemap: "none" });
if (!r.success) { console.error(r.logs); process.exit(1); }
process.exit(0);
```

```ts
// apps/elysia-api/build-aot.ts — Elysia 2 AOT: compile routes + TypeBox at build time
import { aot } from "elysia/plugin/aot/bun";
const r = await Bun.build({ entrypoints: ["src/index.ts"], outdir: "dist-aot", target: "bun", minify: false, sourcemap: "none", plugins: [aot("src/app.ts", { target: "bun" })] });
if (!r.success) { console.error(r.logs); process.exit(1); }
process.exit(0); // importing the app opens the DB pool; the build would otherwise hang
```

If `aot("src/app.ts")` fails, try `aot("src/index.ts")`; record which one works and why in the friction log (the reference article reported the instance module was required).

```bash
# apps/elysia-api/smoke.sh — hits all routes; run with server on :3000
set -e; B=http://127.0.0.1:3000; T=$(cd ../.. && bun -e 'import {TOKEN} from "./bench/lib.ts"; console.log(await TOKEN)')
curl -sf $B/health; echo
curl -sf -X POST $B/echo -H 'content-type: application/json' -d '{"name":"Jane","email":"jane@example.com","age":30,"tags":["a"]}'; echo
curl -sf "$B/cpu?n=100"; echo
curl -sf $B/users/4242; echo
curl -sf "$B/users?page=7&limit=20" | head -c 200; echo
curl -sf -X POST $B/orders -H 'content-type: application/json' -d '{"userId":4242,"amount":19.99,"currency":"USD"}'; echo
curl -sf $B/me -H "authorization: Bearer $T"; echo
curl -s -o /dev/null -w '%{http_code}\n' $B/me
```

- [ ] **Step 4: Build both variants, smoke each**

```bash
cd apps/elysia-api && bun run build && bun run build:aot && ls -la dist dist-aot && cd ../..
(cd apps/elysia-api && NODE_ENV=production DB_DRIVER=bunsql bun dist/index.js &) ; sleep 1; (cd apps/elysia-api && bash smoke.sh); pkill -f "dist/index.js"
(cd apps/elysia-api && NODE_ENV=production DB_DRIVER=bunsql bun dist-aot/index.js &) ; sleep 1; (cd apps/elysia-api && bash smoke.sh); pkill -f "dist-aot/index.js"
(cd apps/elysia-api && NODE_ENV=production DB_DRIVER=postgresjs bun dist/index.js &) ; sleep 1; (cd apps/elysia-api && bash smoke.sh); pkill -f "dist/index.js"
```
Expected: each smoke prints 7 JSON bodies and a final `401`. Any deviation → friction log, then fix.

- [ ] **Step 5: Typecheck, commit**

```bash
(cd apps/elysia-api && bun run typecheck) && git add -A && git commit -m "feat(elysia-api): SaaS slice on Elysia 2 beta with plain and AOT builds"
```

---

### Task 4: Nest app

**Files:**
- Create: `apps/nest-api/` via `@nestjs/cli` scaffold, then `src/main.ts`, `src/app.module.ts`, `src/schemas.ts`, `src/typebox-standard.ts`, `src/db/{schema,db.module}.ts`, `src/auth/auth.guard.ts`, `src/system/system.controller.ts`, `src/users/users.controller.ts`, `src/orders/orders.controller.ts`, `smoke.sh`

**Interfaces:**
- Produces: `dist/main.js` runnable with `node` (config A) and `bun` (config B); env `VALIDATOR=typebox` switches `/echo` schema to the TypeBox adapter.

- [ ] **Step 1: Scaffold with the official CLI, time it, keep its choices**

```bash
cd apps && /usr/bin/time -p bunx @nestjs/cli@latest new nest-api --package-manager npm --skip-git --strict 2>&1 | tail -5; cd ..
cat apps/nest-api/package.json apps/nest-api/tsconfig.json apps/nest-api/nest-cli.json
```
Record in friction log: scaffold wall time, whether the generated project is ESM (`"type": "module"`) or CJS, test runner, lint tool, which Nest 12 dependencies were pinned. Keep the module system the CLI chose. If CJS: imports below drop the `.js` suffix. If ESM: keep them.

- [ ] **Step 2: Add runtime deps, switch to Fastify + SWC**

```bash
cd apps/nest-api
npm i @nestjs/platform-fastify@12 drizzle-orm@^0.45.2 postgres@^3.4.9 jose@^6.2.11 zod@^4.5.4 typebox@^1.3.26
npm i -D @swc/cli @swc/core
rm -rf src/app.controller.ts src/app.service.ts src/app.controller.spec.ts test
```
Edit `nest-cli.json` → `"compilerOptions": { "deleteOutDir": true, "builder": "swc", "typeCheck": false }`. Ensure `tsconfig.json` has `experimentalDecorators: true`, `emitDecoratorMetadata: true`, `target: ES2023`. Add `.swcrc` only if `nest build` complains; record.

- [ ] **Step 3: Source**

```ts
// apps/nest-api/src/db/schema.ts — identical to apps/elysia-api/src/schema.ts
import { pgTable, serial, text, integer, numeric, char, timestamp } from "drizzle-orm/pg-core";
export const users = pgTable("users", { id: serial("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull(), age: integer("age").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull() });
export const orders = pgTable("orders", { id: serial("id").primaryKey(), userId: integer("user_id").notNull(), amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), currency: char("currency", { length: 3 }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull() });
```

```ts
// apps/nest-api/src/db/db.module.ts
import { Global, Module } from "@nestjs/common";
import * as schema from "./schema.js";
export const DB = Symbol("DB");
export type Db = import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
@Global()
@Module({
  providers: [{
    provide: DB,
    useFactory: async (): Promise<Db> => {
      const url = process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/bench_saas";
      const driver = process.env.DB_DRIVER ?? (typeof (globalThis as any).Bun !== "undefined" ? "bunsql" : "postgresjs");
      if (driver === "bunsql") {
        const { SQL } = await import("bun"); const { drizzle } = await import("drizzle-orm/bun-sql");
        return drizzle(new SQL({ url, max: 10 }), { schema }) as unknown as Db;
      }
      const { default: postgres } = await import("postgres"); const { drizzle } = await import("drizzle-orm/postgres-js");
      return drizzle(postgres(url, { max: 10 }), { schema });
    },
  }],
  exports: [DB],
})
export class DbModule {}
```

```ts
// apps/nest-api/src/schemas.ts
import { z } from "zod";
import { typeboxStandard } from "./typebox-standard.js";
import Type from "typebox";
export const EchoZod = z.object({ name: z.string().min(1).max(100), email: z.email(), age: z.int().min(0).max(150), tags: z.array(z.string()).max(10) });
export const EchoTypeBox = typeboxStandard(Type.Object({ name: Type.String({ minLength: 1, maxLength: 100 }), email: Type.String({ format: "email" }), age: Type.Integer({ minimum: 0, maximum: 150 }), tags: Type.Array(Type.String(), { maxItems: 10 }) }));
export const Echo = process.env.VALIDATOR === "typebox" ? EchoTypeBox : EchoZod;
export type Echo = z.infer<typeof EchoZod>;
export const OrderBody = z.object({ userId: z.int().min(1), amount: z.number().min(0), currency: z.enum(["USD", "EUR", "GBP"]) });
export const IdParam = z.coerce.number().int().min(1);
export const ListQuery = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export const CpuQuery = z.object({ n: z.coerce.number().int().min(1).max(1_000_000) });
```

```ts
// apps/nest-api/src/typebox-standard.ts — Standard Schema v1 adapter over a compiled TypeBox validator (typebox 1.3 ships none)
import { Compile } from "typebox/compile";
import type { StandardSchemaV1 } from "@standard-schema/spec";
export function typeboxStandard<T extends Parameters<typeof Compile>[0]>(schema: T): StandardSchemaV1<unknown, unknown> {
  const c = Compile(schema);
  return { "~standard": { version: 1, vendor: "typebox", validate: (value: unknown) => c.Check(value) ? { value } : { issues: [...c.Errors(value)].map((e) => ({ message: e.message, path: e.path.split("/").filter(Boolean) })) } } };
}
```
If `typebox/compile` has no `Errors`, use the `Value.Errors`-style API present in the installed version; look at `node_modules/typebox/build/compile/*.d.ts`. `@standard-schema/spec` types come transitively from `@nestjs/common`; add it as a dev dep if the import fails.

```ts
// apps/nest-api/src/auth/auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { jwtVerify } from "jose";
const KEY = new TextEncoder().encode(process.env.JWT_SECRET ?? "bench-secret-do-not-use-in-prod");
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const h: string | undefined = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) throw new UnauthorizedException({ error: "unauthorized" });
    try { const { payload } = await jwtVerify(h.slice(7), KEY, { algorithms: ["HS256"] }); const id = Number(payload.sub); if (!Number.isInteger(id)) throw new Error(); req.userId = id; return true; }
    catch { throw new UnauthorizedException({ error: "unauthorized" }); }
  }
}
```

```ts
// apps/nest-api/src/system/system.controller.ts
import { Body, Controller, Get, HttpCode, Post, Query } from "@nestjs/common";
import { createHash } from "node:crypto";
import { Echo, CpuQuery } from "../schemas.js";
import { z } from "zod";
export function sha256Loop(n: number): string { let h = "elysia-vs-nest"; for (let i = 0; i < n; i++) h = createHash("sha256").update(h).digest("hex"); return h; }
@Controller()
export class SystemController {
  @Get("health") health() { return { status: "ok" }; }
  @Post("echo") @HttpCode(200) echo(@Body({ schema: Echo }) body: Echo) { return body; }
  @Get("cpu") cpu(@Query({ schema: CpuQuery }) q: z.infer<typeof CpuQuery>) { return { n: q.n, hash: sha256Loop(q.n) }; }
}
```

```ts
// apps/nest-api/src/users/users.controller.ts
import { Controller, Get, Inject, NotFoundException, Param, Query, Req, UseGuards } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DB, type Db } from "../db/db.module.js";
import { users } from "../db/schema.js";
import { IdParam, ListQuery } from "../schemas.js";
import { AuthGuard } from "../auth/auth.guard.js";
export const serializeUser = (u: typeof users.$inferSelect) => ({ id: u.id, name: u.name, email: u.email, age: u.age, createdAt: u.createdAt.toISOString() });
@Controller()
export class UsersController {
  constructor(@Inject(DB) private readonly db: Db) {}
  @Get("me") @UseGuards(AuthGuard)
  async me(@Req() req: { userId: number }) {
    const [u] = await this.db.select().from(users).where(eq(users.id, req.userId)).limit(1);
    if (!u) throw new NotFoundException({ error: "not found" }); return serializeUser(u);
  }
  @Get("users/:id")
  async one(@Param("id", { schema: IdParam }) id: number) {
    const [u] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!u) throw new NotFoundException({ error: "not found" }); return serializeUser(u);
  }
  @Get("users")
  async list(@Query({ schema: ListQuery }) q: z.infer<typeof ListQuery>) {
    const rows = await this.db.select().from(users).orderBy(users.id).limit(q.limit).offset((q.page - 1) * q.limit);
    return { page: q.page, limit: q.limit, items: rows.map(serializeUser) };
  }
}
```

```ts
// apps/nest-api/src/orders/orders.controller.ts
import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { z } from "zod";
import { DB, type Db } from "../db/db.module.js";
import { orders } from "../db/schema.js";
import { OrderBody } from "../schemas.js";
const serializeOrder = (o: typeof orders.$inferSelect) => ({ id: o.id, userId: o.userId, amount: o.amount, currency: o.currency, createdAt: o.createdAt.toISOString() });
@Controller("orders")
export class OrdersController {
  constructor(@Inject(DB) private readonly db: Db) {}
  @Post() @HttpCode(201)
  async create(@Body({ schema: OrderBody }) body: z.infer<typeof OrderBody>) {
    const [o] = await this.db.insert(orders).values({ userId: body.userId, amount: body.amount.toFixed(2), currency: body.currency, createdAt: new Date() }).returning();
    return serializeOrder(o);
  }
}
```

```ts
// apps/nest-api/src/app.module.ts
import { Module } from "@nestjs/common";
import { DbModule } from "./db/db.module.js";
import { SystemController } from "./system/system.controller.js";
import { UsersController } from "./users/users.controller.js";
import { OrdersController } from "./orders/orders.controller.js";
@Module({ imports: [DbModule], controllers: [SystemController, UsersController, OrdersController] })
export class AppModule {}
```

```ts
// apps/nest-api/src/main.ts
import { NestFactory } from "@nestjs/core";
import { StandardSchemaValidationPipe } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: false }), { logger: false });
app.useGlobalPipes(new StandardSchemaValidationPipe({ validateCustomDecorators: true }));
await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
```
If the scaffold is CJS, top-level `await` is illegal: wrap in `async function bootstrap() {...} bootstrap()` and note it.

`smoke.sh`: copy of `apps/elysia-api/smoke.sh` (same content, same expected output).

- [ ] **Step 4: Build, run on Node and on Bun, smoke each**

```bash
cd apps/nest-api && /usr/bin/time -p npx nest build 2>&1 | tail -3 && ls -la dist && cd ../..
(cd apps/nest-api && NODE_ENV=production DB_DRIVER=postgresjs node dist/main.js &) ; sleep 1; (cd apps/nest-api && bash smoke.sh); pkill -f "dist/main.js"
(cd apps/nest-api && NODE_ENV=production DB_DRIVER=bunsql bun dist/main.js &) ; sleep 1; (cd apps/nest-api && bash smoke.sh); pkill -f "dist/main.js"
(cd apps/nest-api && NODE_ENV=production DB_DRIVER=postgresjs VALIDATOR=typebox node dist/main.js &) ; sleep 1; (cd apps/nest-api && bash smoke.sh); pkill -f "dist/main.js"
```
Expected: same 7 bodies + `401` as the Elysia smoke. Known, accepted differences to log in `friction-log.md`, not fix: validation-error status (Nest 400 vs Elysia 422) and error body shape; these are never hit by the benchmark.

- [ ] **Step 5: Typecheck, commit**

```bash
(cd apps/nest-api && npx tsc --noEmit) && git add -A && git commit -m "feat(nest-api): SaaS slice on NestJS 12 + Fastify, SWC build, TypeBox adapter"
```

---

### Task 5: Cases + parity check + quick bench

**Files:**
- Create: `bench/cases.ts`, `bench/parity.ts`, `bench/db-reset.ts` (from Task 2 note)

**Interfaces:**
- Produces: `CASES: { name, method, path, headers?, body?, bombardier: string[] }[]`; `normalize(name, body) → string` (strips volatile fields); `parity.ts` exits 1 on mismatch.

- [ ] **Step 1: cases.ts**

```ts
// bench/cases.ts
import { BASE_URL, TOKEN } from "./lib";
const ECHO = JSON.stringify({ name: "Jane Doe", email: "jane@example.com", age: 30, tags: ["a", "b"] });
const ORDER = JSON.stringify({ userId: 4242, amount: 19.99, currency: "USD" });
export interface Case { name: string; method: "GET" | "POST"; path: string; headers?: Record<string, string>; body?: string; expectStatus: number }
export async function cases(): Promise<Case[]> {
  const auth = { authorization: `Bearer ${await TOKEN}` };
  return [
    { name: "health", method: "GET", path: "/health", expectStatus: 200 },
    { name: "echo", method: "POST", path: "/echo", headers: { "content-type": "application/json" }, body: ECHO, expectStatus: 200 },
    { name: "me", method: "GET", path: "/me", headers: auth, expectStatus: 200 },
    { name: "user", method: "GET", path: "/users/4242", expectStatus: 200 },
    { name: "list", method: "GET", path: "/users?page=7&limit=20", expectStatus: 200 },
    { name: "order", method: "POST", path: "/orders", headers: { "content-type": "application/json" }, body: ORDER, expectStatus: 201 },
    { name: "cpu", method: "GET", path: "/cpu?n=15000", expectStatus: 200 },
  ];
}
export function bombardierArgs(c: Case): string[] {
  const a: string[] = ["-m", c.method];
  for (const [k, v] of Object.entries(c.headers ?? {})) a.push("-H", `${k}: ${v}`);
  if (c.body) a.push("-b", c.body);
  a.push(`${BASE_URL}${c.path}`);
  return a;
}
export function normalize(name: string, body: string): string {
  if (name !== "order") return body;
  const o = JSON.parse(body); delete o.id; delete o.createdAt; return JSON.stringify(o);
}
```

- [ ] **Step 2: parity.ts**

```ts
// bench/parity.ts — every config must answer every case identically. Run: bun bench/parity.ts
import { CONFIGS, BASE_URL, startServer } from "./lib";
import { cases, normalize } from "./cases";
const CS = await cases();
const seen: Record<string, { cfg: string; body: string; status: number }> = {};
let bad = 0;
for (const cfg of CONFIGS) {
  const s = await startServer(cfg);
  try {
    for (const c of CS) {
      const res = await fetch(`${BASE_URL}${c.path}`, { method: c.method, headers: c.headers, body: c.body });
      const body = normalize(c.name, await res.text());
      if (res.status !== c.expectStatus) { bad++; console.log(`✗ ${cfg.id} ${c.name}: status ${res.status} != ${c.expectStatus}`); }
      const prev = seen[c.name];
      if (!prev) seen[c.name] = { cfg: cfg.id, body, status: res.status };
      else if (prev.body !== body) { bad++; console.log(`✗ ${cfg.id} ${c.name}: body differs from ${prev.cfg}\n  ${prev.body.slice(0, 160)}\n  ${body.slice(0, 160)}`); }
      else console.log(`✓ ${cfg.id} ${c.name}`);
    }
    const unauth = await fetch(`${BASE_URL}/me`); if (unauth.status !== 401) { bad++; console.log(`✗ ${cfg.id} /me without token: ${unauth.status}`); }
  } finally { await s.stop(); }
}
if (bad) { console.error(`${bad} parity failures`); process.exit(1); }
console.log("parity OK across", CONFIGS.map((c) => c.id).join(", "));
```

```ts
// bench/db-reset.ts
import postgres from "postgres";
export async function resetOrders() {
  const c = postgres("postgres://postgres@localhost:5432/bench_saas");
  await c`DELETE FROM orders WHERE id > 200000`; await c`SELECT setval('orders_id_seq', 200000)`; await c.end();
}
```

- [ ] **Step 3: Run parity**

Run: `bun bench/parity.ts`
Expected: all ✓, final `parity OK across A, B, C, D, B-pgjs, A-typebox`. Any ✗ → fix the app (or the normalizer, if the field is volatile by nature), log in friction-log, rerun.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(bench): cases and cross-config parity check"
```

---

### Task 6: Noise floor

**Files:**
- Create: `bench/noise.ts`

**Interfaces:**
- Produces: `results/noise.json` `{ env, config: "C", concurrency: 100, cases: { health: { rps: number[], cv }, user: {...} }, floorPct }`.

- [ ] **Step 1: Write noise.ts**

```ts
// bench/noise.ts — 5 back-to-back repeats, config C, c=100, health + user. Run: bun bench/noise.ts
import { CONFIGS, startServer, collectEnv, cv } from "./lib";
import { cases, bombardierArgs } from "./cases";
const DUR = process.env.BENCH_QUICK ? "3s" : "30s", N = process.env.BENCH_QUICK ? 2 : 5;
const cfg = CONFIGS.find((c) => c.id === "C")!;
const CS = (await cases()).filter((c) => ["health", "user"].includes(c.name));
async function run(args: string[]) {
  const p = Bun.spawn(["bombardier", "-c", "100", "-d", DUR, "--print", "r", "--format", "json", ...args], { stdout: "pipe", stderr: "inherit" });
  const out = JSON.parse(await new Response(p.stdout).text()); await p.exited; return out.result.rps.mean as number;
}
const s = await startServer(cfg);
const out: any = { env: await collectEnv(), config: cfg.id, concurrency: 100, duration: DUR, repeats: N, cases: {} };
try {
  for (const c of CS) {
    await run(bombardierArgs(c)); // warm-up
    const rps: number[] = [];
    for (let i = 0; i < N; i++) { rps.push(await run(bombardierArgs(c))); console.log(c.name, i + 1, rps[i].toFixed(0)); }
    out.cases[c.name] = { rps, cv: cv(rps), spreadPct: 100 * (Math.max(...rps) - Math.min(...rps)) / Math.min(...rps) };
  }
} finally { await s.stop(); }
out.floorPct = Math.max(...Object.values(out.cases).map((c: any) => c.spreadPct));
await Bun.write("results/noise.json", JSON.stringify(out, null, 2));
console.log("noise floor (max spread %):", out.floorPct.toFixed(1));
```

- [ ] **Step 2: Quick then full**

Run: `BENCH_QUICK=1 bun bench/noise.ts` (plumbing) then `bun bench/noise.ts` (~6 min).
Expected: `results/noise.json` written; floorPct printed. This number is the significance floor quoted everywhere downstream.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(bench): noise floor run"
```

---

### Task 7: Full benchmark orchestrator

**Files:**
- Create: `bench/bench.ts`

**Interfaces:**
- Consumes: `selectConfigs`, `cases`, `bombardierArgs`, `startSampler`, `resetOrders`.
- Produces: `results/results.json` (`{ env, methodology, idleRss: {cfg: MB}, runs: [{ config, case, concurrency, repeats: [...], median: { rps, p50, p90, p99, non2xx, meanRss, peakRss, meanCpu, peakCpu, rpsPerCore, rpsPerMB } }] }`). With `CONFIGS=B-pgjs,A-typebox` writes `results/sensitivity.json` instead.

- [ ] **Step 1: Write bench.ts**

```ts
// bench/bench.ts — full run: bun bench/bench.ts (~2.5 h). Plumbing: BENCH_QUICK=1 bun bench/bench.ts
// Sensitivity: CONFIGS=B-pgjs,A-typebox CASES=me,user,list,order,echo CONC=100 bun bench/bench.ts
import { selectConfigs, startServer, startSampler, sampleProc, collectEnv, median, mean } from "./lib";
import { cases, bombardierArgs } from "./cases";
import { resetOrders } from "./db-reset";
import { mkdirSync } from "node:fs";
const QUICK = !!process.env.BENCH_QUICK;
const WARMUP = QUICK ? "1s" : "5s", DURATION = QUICK ? "3s" : "30s", REPEATS = QUICK ? 1 : 3;
const CONCURRENCIES = process.env.CONC ? process.env.CONC.split(",").map(Number) : QUICK ? [10] : [10, 100, 500];
const CONFIGS = selectConfigs();
const CASES = (await cases()).filter((c) => !process.env.CASES || process.env.CASES.split(",").includes(c.name));
const OUT = process.env.CONFIGS ? "results/sensitivity.json" : "results/results.json";

async function bombardier(args: string[], conc: number, dur: string) {
  const p = Bun.spawn(["bombardier", "-c", String(conc), "-d", dur, "-l", "--print", "r", "--format", "json", ...args], { stdout: "pipe", stderr: "inherit" });
  const out = await new Response(p.stdout).text(); await p.exited;
  if (p.exitCode !== 0) throw new Error(`bombardier exit ${p.exitCode}`);
  const r = JSON.parse(out).result; const ms = (x: number) => x / 1000;
  return { rps: r.rps.mean, latMs: { mean: ms(r.latency.mean), p50: ms(r.latency.percentiles["50"]), p90: ms(r.latency.percentiles["90"]), p95: ms(r.latency.percentiles["95"]), p99: ms(r.latency.percentiles["99"]), max: ms(r.latency.max) }, req2xx: r.req2xx, non2xx: r.req1xx + r.req3xx + r.req4xx + r.req5xx + r.others };
}

mkdirSync("results", { recursive: true });
const results = { env: await collectEnv(), methodology: { warmup: WARMUP, duration: DURATION, repeats: REPEATS, concurrencies: CONCURRENCIES, order: CONFIGS.map((c) => c.id), loadGenerator: "bombardier, same machine" }, idleRss: {} as Record<string, number>, bootMs: {} as Record<string, number>, runs: [] as any[] };
const total = CONFIGS.length * CASES.length * CONCURRENCIES.length; let n = 0;

for (const cfg of CONFIGS) {
  console.log(`\n=== ${cfg.id} ${cfg.label} ===`);
  await resetOrders();
  const srv = await startServer(cfg);
  results.bootMs[cfg.id] = srv.readyMs;
  try {
    await Bun.sleep(1500);
    results.idleRss[cfg.id] = (await sampleProc(srv.pid))?.rss ?? 0;
    console.log(`boot ${srv.readyMs.toFixed(0)} ms, idle RSS ${results.idleRss[cfg.id].toFixed(1)} MB`);
    for (const c of CASES) for (const conc of CONCURRENCIES) {
      n++; console.log(`[${n}/${total}] ${cfg.id}/${c.name}/c=${conc}`);
      try {
        await bombardier(bombardierArgs(c), conc, WARMUP);
        const reps: any[] = [];
        for (let i = 0; i < REPEATS; i++) {
          const sampler = startSampler(srv.pid);
          const r = await bombardier(bombardierArgs(c), conc, DURATION);
          const samples = sampler.stop();
          const rss = samples.map((s) => s.rss), cpu = samples.map((s) => s.cpu);
          reps.push({ ...r, rss: { mean: mean(rss), peak: Math.max(0, ...rss) }, cpu: { mean: mean(cpu), peak: Math.max(0, ...cpu) } });
          console.log(`  run ${i + 1}: ${r.rps.toFixed(0)} rps, p99 ${r.latMs.p99.toFixed(2)} ms, rss ${mean(rss).toFixed(0)} MB, cpu ${mean(cpu).toFixed(0)}%${r.non2xx ? `  [!] non-2xx ${r.non2xx}` : ""}`);
        }
        const m = (f: (r: any) => number) => median(reps.map(f));
        const med = { rps: m((r) => r.rps), p50: m((r) => r.latMs.p50), p90: m((r) => r.latMs.p90), p99: m((r) => r.latMs.p99), non2xx: m((r) => r.non2xx), meanRss: m((r) => r.rss.mean), peakRss: m((r) => r.rss.peak), meanCpu: m((r) => r.cpu.mean), peakCpu: m((r) => r.cpu.peak) };
        results.runs.push({ config: cfg.id, case: c.name, concurrency: conc, repeats: reps, median: { ...med, rpsPerCore: med.meanCpu ? med.rps / (med.meanCpu / 100) : 0, rpsPerMB: med.meanRss ? med.rps / med.meanRss : 0 } });
      } catch (err) {
        console.error(`  FAILED: ${err}`); results.runs.push({ config: cfg.id, case: c.name, concurrency: conc, failed: true, error: String(err) });
      }
      await Bun.write(OUT, JSON.stringify(results, null, 2));
    }
  } finally { await srv.stop(); }
}
console.log(`done: ${results.runs.length} combinations → ${OUT}`);
```

- [ ] **Step 2: Plumbing run, then full run in background**

Run: `BENCH_QUICK=1 bun bench/bench.ts` → expect 28 combinations in `results/results.json`, zero `failed`, zero `non2xx`.
Then: `nohup bun bench/bench.ts > results/bench.log 2>&1 &` and monitor `results/bench.log`. Nothing else CPU-heavy on the machine during the run; close browsers.

- [ ] **Step 3: Commit code (results committed after the full run finishes)**

```bash
git add bench/bench.ts && git commit -m "feat(bench): full orchestrator with RSS/CPU sampling"
```

---

### Task 8: Boot + DX measurements

**Files:**
- Create: `bench/boot.ts`, `bench/dx.ts`

**Interfaces:**
- Produces: `results/boot.json` `{ [cfg]: { bootMs: number[], bootMedian, firstReqMs: number[], firstReqMedian } }`; `results/dx.json` `{ elysia: DxRow, nest: DxRow }` with `DxRow = { installMs, nodeModulesMB, depCount, buildMs, distKB, typecheckMs, reloadMs: number[], loc, files, configFiles }`, plus `aotBuildMs`, `aotDistKB` for elysia.

- [ ] **Step 1: boot.ts**

```ts
// bench/boot.ts — 10 cold boots per config: spawn → /health 200, then latency of the very first /users/4242. Run: bun bench/boot.ts
import { CONFIGS, BASE_URL, startServer, median } from "./lib";
const N = process.env.BENCH_QUICK ? 2 : 10;
const out: Record<string, any> = {};
for (const cfg of CONFIGS.filter((c) => !c.sensitivity)) {
  const bootMs: number[] = [], firstReqMs: number[] = [];
  for (let i = 0; i < N; i++) {
    const s = await startServer(cfg);
    const t0 = performance.now(); await (await fetch(`${BASE_URL}/users/4242`)).text(); firstReqMs.push(performance.now() - t0);
    bootMs.push(s.readyMs); await s.stop();
  }
  out[cfg.id] = { bootMs, bootMedian: median(bootMs), firstReqMs, firstReqMedian: median(firstReqMs) };
  console.log(cfg.id, "boot", median(bootMs).toFixed(0), "ms, first req", median(firstReqMs).toFixed(2), "ms");
}
await Bun.write("results/boot.json", JSON.stringify(out, null, 2));
```

- [ ] **Step 2: dx.ts**

```ts
// bench/dx.ts — install/build/typecheck/reload timings + code size. Run: bun bench/dx.ts (~5 min)
import { sh, median } from "./lib";
import { rmSync, existsSync } from "node:fs";
async function timed(cmd: string[], cwd: string): Promise<number> { const t = performance.now(); const p = Bun.spawn(cmd, { cwd, stdout: "ignore", stderr: "ignore" }); await p.exited; return performance.now() - t; }
async function dirMB(p: string) { return Number((await sh(["du", "-sk", p])).split(/\s+/)[0]) / 1024; }
async function loc(dir: string) { const files = (await sh(["find", dir, "-name", "*.ts", "-not", "-name", "*.spec.ts"])).split("\n").filter(Boolean); let lines = 0; for (const f of files) lines += (await Bun.file(f).text()).split("\n").filter((l) => l.trim()).length; return { loc: lines, files: files.length }; }
async function depCount(app: string) { return Number(await sh(["sh", "-c", `find ${app}/node_modules -name package.json -maxdepth 3 -not -path '*/node_modules/*/node_modules/*' | wc -l`])); }
async function reload(app: string, watchCmd: string[], touch: string): Promise<number[]> {
  const times: number[] = [];
  const p = Bun.spawn(watchCmd, { cwd: app, env: { ...process.env, PORT: "3000", NODE_ENV: "development" }, stdout: "ignore", stderr: "ignore" });
  const ok = async () => { try { return (await fetch("http://127.0.0.1:3000/health")).ok; } catch { return false; } };
  while (!(await ok())) await Bun.sleep(50);
  for (let i = 0; i < 5; i++) {
    const src = await Bun.file(touch).text(); const marker = `// reload ${i} ${Date.now()}`;
    const t0 = performance.now(); await Bun.write(touch, src + "\n" + marker);
    await Bun.sleep(30); while (!(await ok())) await Bun.sleep(10); // health drops during restart then returns
    // watch for the *new* process: poll until a fresh /health arrives after a brief outage, cap at 10 s
    times.push(performance.now() - t0); await Bun.write(touch, src); await Bun.sleep(700);
  }
  p.kill("SIGTERM"); await p.exited; await Bun.sleep(500); return times;
}
const out: any = {};
for (const app of ["elysia-api", "nest-api"] as const) {
  const dir = `apps/${app}`; const pm = app === "nest-api" ? ["npm", "ci"] : ["bun", "install", "--frozen-lockfile"];
  rmSync(`${dir}/node_modules`, { recursive: true, force: true });
  const installMs = await timed(pm, dir);
  const buildCmd = app === "nest-api" ? ["npx", "nest", "build"] : ["bun", "build.ts"];
  const builds = []; for (let i = 0; i < 3; i++) builds.push(await timed(buildCmd, dir));
  const typechecks = []; for (let i = 0; i < 3; i++) typechecks.push(await timed(["npx", "tsc", "--noEmit"], dir));
  const row: any = { installMs, nodeModulesMB: await dirMB(`${dir}/node_modules`), depCount: await depCount(dir), buildMs: median(builds), distKB: (await dirMB(`${dir}/dist`)) * 1024, typecheckMs: median(typechecks), ...(await loc(`${dir}/src`)), configFiles: (await sh(["sh", "-c", `ls ${dir} | grep -E 'json|rc|config' | wc -l`])).trim() };
  if (app === "elysia-api") { row.aotBuildMs = await timed(["bun", "build-aot.ts"], dir); row.aotDistKB = (await dirMB(`${dir}/dist-aot`)) * 1024; }
  row.reloadMs = await reload(dir, app === "nest-api" ? ["npx", "nest", "start", "--watch"] : ["bun", "--watch", "src/index.ts"], `${dir}/src/${app === "nest-api" ? "system/system.controller.ts" : "app.ts"}`);
  row.reloadMedianMs = median(row.reloadMs);
  out[app === "nest-api" ? "nest" : "elysia"] = row; console.log(app, row);
}
await Bun.write("results/dx.json", JSON.stringify(out, null, 2));
```
The reload timer is approximate (health may not drop between file save and restart on Bun). If it never drops, instead print a timestamp from the app on boot (`console.error(Date.now())` in dev only, gated by `NODE_ENV=development`) and read it from the watcher's stderr; record whichever method was used in `docs/methodology.md`.

- [ ] **Step 3: Run both (after the full bench finishes; never concurrently)**

Run: `bun bench/boot.ts && bun bench/dx.ts`
Expected: both json files written, numbers plausible (Bun install seconds, npm ci tens of seconds; Nest boot hundreds of ms, Elysia tens of ms).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(bench): boot and DX measurements"
```

---

### Task 9: Sensitivity runs

- [ ] **Step 1: Run** (after Task 7's full run has finished)

```bash
CONFIGS=B-pgjs,A-typebox CASES=me,user,list,order,echo CONC=100 bun bench/bench.ts
```
Expected: `results/sensitivity.json` with 10 combinations. Compare `B-pgjs` vs `B` (driver share of the runtime gain) and `A-typebox` vs `A` on `echo` (Zod share of validation cost) — numbers land in `facts.md` via Task 11.

- [ ] **Step 2: Commit**

```bash
git add results/sensitivity.json && git commit -m "data: sensitivity runs (driver, validator)"
```

---

### Task 10: Pricing snapshot + cost model

**Files:**
- Create: `results/pricing-snapshot.json` (hand-filled from fetched pages), `bench/cost.ts`

**Interfaces:**
- Consumes: `results/results.json` medians for cases `me,user,list,order` at c=100.
- Produces: `results/cost-model.json`, `results/cost-model.md`.

- [ ] **Step 1: Fetch three price lists, write snapshot**

Fetch with WebFetch on the day of the run: `https://www.hetzner.com/cloud/` (CX/CAX shared plans), `https://fly.io/docs/about/pricing/` (shared-cpu-1x/2x/4x memory tiers), `https://aws.amazon.com/ec2/pricing/on-demand/` (t4g.small/medium/large, c7g.medium/large, us-east-1). Write:

```json
{
  "fetchedAt": "2026-09-05",
  "currency": "USD",
  "providers": {
    "hetzner": { "url": "https://www.hetzner.com/cloud/", "plans": [ { "name": "CAX11", "vcpu": 2, "ramGB": 4, "monthly": 0 } ] },
    "fly": { "url": "https://fly.io/docs/about/pricing/", "plans": [ { "name": "shared-cpu-1x 512MB", "vcpu": 1, "ramGB": 0.5, "monthly": 0 } ] },
    "aws": { "url": "https://aws.amazon.com/ec2/pricing/on-demand/", "region": "us-east-1", "plans": [ { "name": "t4g.small", "vcpu": 2, "ramGB": 2, "monthly": 0 } ] }
  }
}
```
Replace the `0` placeholders and extend plan lists with the real values from the pages; keep the URL and date. Monthly = hourly × 730 for AWS.

- [ ] **Step 2: cost.ts**

```ts
// bench/cost.ts — servers needed per stack per load, priced. Run: bun bench/cost.ts
import { mean } from "./lib";
const R = JSON.parse(await Bun.file("results/results.json").text());
const P = JSON.parse(await Bun.file("results/pricing-snapshot.json").text());
const LOADS = [1000, 5000, 20000], HEADROOM = 0.5, CASES = ["me", "user", "list", "order"], CONC = 100;
const rows: any[] = [];
for (const cfg of R.methodology.order as string[]) {
  const runs = R.runs.filter((r: any) => r.config === cfg && r.concurrency === CONC && CASES.includes(r.case) && !r.failed);
  const rpsPerCore = mean(runs.map((r: any) => r.median.rpsPerCore)), rssMB = Math.max(...runs.map((r: any) => r.median.peakRss));
  for (const load of LOADS) {
    const cores = load / (rpsPerCore * HEADROOM); const ramGB = Math.ceil(cores) * (rssMB * 1.5) / 1024; // 1.5× RSS per process for GC headroom
    const priced: Record<string, any> = {};
    for (const [prov, { plans }] of Object.entries<any>(P.providers)) {
      const best = plans.map((p: any) => ({ ...p, n: Math.max(Math.ceil(cores / p.vcpu), Math.ceil(ramGB / p.ramGB)) })).map((p: any) => ({ plan: p.name, n: p.n, monthly: p.n * p.monthly })).sort((a: any, b: any) => a.monthly - b.monthly)[0];
      priced[prov] = best;
    }
    rows.push({ config: cfg, load, rpsPerCore, rssMB, coresNeeded: cores, ramGBNeeded: ramGB, priced });
  }
}
await Bun.write("results/cost-model.json", JSON.stringify({ assumptions: { loads: LOADS, headroom: HEADROOM, cases: CASES, concurrency: CONC, ramMultiplier: 1.5, pricing: P.fetchedAt }, rows }, null, 2));
let md = `# Cost model\n\nDerived from \`results.json\` (cases ${CASES.join(", ")}, c=${CONC}, medians) and \`pricing-snapshot.json\` (${P.fetchedAt}). Cores = load ÷ (rps/core × ${HEADROOM}); RAM = ceil(cores) × peak RSS × 1.5. Cheapest plan count per provider.\n\n`;
for (const load of LOADS) {
  md += `## ${load.toLocaleString()} rps sustained\n\n| Config | rps/core | peak RSS MB | cores | ` + Object.keys(P.providers).map((p) => `${p} (plan × n = $/mo)`).join(" | ") + " |\n|---|---|---|---|" + Object.keys(P.providers).map(() => "---").join("|") + "|\n";
  for (const r of rows.filter((r) => r.load === load)) md += `| ${r.config} | ${r.rpsPerCore.toFixed(0)} | ${r.rssMB.toFixed(0)} | ${r.coresNeeded.toFixed(2)} | ` + Object.values<any>(r.priced).map((p) => `${p.plan} × ${p.n} = $${p.monthly.toFixed(0)}`).join(" | ") + " |\n";
  md += "\n";
}
await Bun.write("results/cost-model.md", md); console.log(md);
```

- [ ] **Step 3: Run, commit**

Run: `bun bench/cost.ts`
Expected: tables with three loads × four configs, monthly USD per provider.

```bash
git add -A && git commit -m "feat(bench): cost model from measured rps/core and RSS with dated pricing snapshot"
```

---

### Task 11: Report: summary.md, results.html, facts.md

**Files:**
- Create: `bench/report.ts`

Load the `dataviz` skill before writing the chart code (bar charts as inline SVG, light/dark aware, no CDN).

**Interfaces:**
- Consumes: `results/{results,noise,boot,dx,sensitivity,cost-model}.json`.
- Produces: `results/summary.md` (all tables), `results/results.html` (inline SVG charts + same tables), `results/facts.md` (every number with a `results/<file>.json` pointer, deltas vs noise floor labelled `noise`/`real`).

- [ ] **Step 1: Write report.ts** — sections:
  1. Environment table from `results.env` (+ bombardier version, run date, run order).
  2. Noise floor: per-case rps list, spread %, and the floor.
  3. Per case × concurrency table: config, rps, p50, p90, p99, non-2xx, mean RSS, peak RSS, mean CPU, rps/core, rps/MB.
  4. Layer deltas at c=100 per case: A→B (runtime), B→C (framework), C→D (build), A→D (total), each `%` and a verdict `noise` if `|Δ| < floorPct` else `real`.
  5. Idle RSS + boot table (from `results.idleRss`, `boot.json`).
  6. DX table from `dx.json`.
  7. Sensitivity: B vs B-pgjs, A vs A-typebox on their cases.
  8. Cost model tables copied from `cost-model.md`.
  `facts.md` prints each row as `- <statement with numbers> (source: results/results.json → runs[config=C,case=user,concurrency=100].median.rps)`.
  `results.html`: one SVG grouped bar chart per case (rps by config, c=10/100/500), one for mean RSS, one for rps/core; tables below; inline `<style>` with `prefers-color-scheme`.

Implementation is straightforward string building; write it as pure functions `mdTables(data) → string`, `facts(data) → string`, `html(data, svgs) → string`, `barChart(series) → string` so `summary.md` and `results.html` share the same numbers.

- [ ] **Step 2: Run, open, check**

Run: `bun bench/report.ts && open results/results.html && wc -l results/summary.md results/facts.md`
Expected: every table populated, no `NaN`, no `undefined`; deltas carry a verdict; facts lines all have a source pointer.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(bench): report generator — summary, local charts, facts with provenance"
```

---

### Task 12: Methodology, DX doc, friction log close-out, results commit

**Files:**
- Create: `docs/methodology.md`, `results/dx.md`; finalize `results/friction-log.md`; commit `results/*.json`, `results/*.md`, `results/results.html`.

- [ ] **Step 1: `docs/methodology.md`** — hardware, versions (from `results.env`), the four configs and what each delta isolates, routes, seed, fairness rules, harness parameters, noise-floor procedure, sampling method (`ps` every 500 ms; 100 % = one core), cost-model formula and assumptions, sensitivity runs, caveats (load generator on the same host; single process; dev laptop, not a server; Postgres on the same host; run order).

- [ ] **Step 2: `results/dx.md`** — tables only: measured `dx.json` numbers side by side; "same feature, both frameworks" LOC table (route + validation + guard + DB call, counted from the actual files: `apps/elysia-api/src/app.ts` `/me` block vs `apps/nest-api/src/users/users.controller.ts` `me()` + `auth.guard.ts`); list of config files each app needs; scaffold command and time; list of Nest 12 / Elysia 2 features used (Standard Schema pipe, Fastify adapter, SWC; `t.Object`, `derive`, `status()`, AOT plugin). No adjectives.

- [ ] **Step 3: Friction log** — re-read; every entry has time, symptom (exact error text), cause, fix, which config it affected. Add Elysia 2 beta plugin-ecosystem gaps observed (which `@elysia/*` packages were at `next` vs missing).

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "data: full benchmark results, cost model, DX data, methodology"
```

---

## Self-review

- Spec coverage: configs A–D (T1, T3, T4), driver switch + both sensitivity runs (T1, T3, T4, T9), seven routes + parity (T3–T5), fairness rules (T3, T4, T7), noise floor (T6), harness params (T7), boot/DX metrics (T8), cost model with dated snapshot (T10), reports + facts (T11), methodology/dx/friction docs (T12), error handling (T1 `startServer` timeout, T5 exit 1, T7 failed-combination handling + persist per combination), tests (T3/T4 smoke, T5 parity, `BENCH_QUICK`).
- Type consistency: `startServer` returns `{ pid, stop, readyMs }` everywhere; `median`/`mean`/`cv` from `lib.ts`; `cases()` is async and `bombardierArgs(c)` takes a `Case`; `resetOrders` lives in `bench/db-reset.ts` (Task 2 note corrected in Task 5).
- Placeholders: pricing snapshot `0` values are explicitly to be replaced with fetched numbers in T10 step 1; report.ts body is described by sections and function names rather than full code — acceptable for a formatting task whose inputs are fully specified.
