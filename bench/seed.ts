// bench/seed.ts — deterministic seed. Run: bun bench/seed.ts
import postgres from "postgres";
const USERS = 50_000, ORDERS = 200_000;
const admin = postgres("postgres://postgres@localhost:5432/postgres");
await admin`DROP DATABASE IF EXISTS bench_saas WITH (FORCE)`;
await admin`CREATE DATABASE bench_saas`;
await admin.end();
const sql = postgres("postgres://postgres@localhost:5432/bench_saas");
await sql.unsafe(await Bun.file("bench/schema.sql").text());
// mulberry32 PRNG, fixed seed → identical data on every run
let s = 20260905;
const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const CUR = ["USD", "EUR", "GBP"];
for (let i = 0; i < USERS; i += 5000) {
  const rows = Array.from({ length: 5000 }, (_, j) => ({ name: `User ${i + j + 1}`, email: `user${i + j + 1}@example.com`, age: 18 + Math.floor(rnd() * 60), created_at: new Date(1_700_000_000_000 + (i + j) * 1000) }));
  await sql`INSERT INTO users ${sql(rows, "name", "email", "age", "created_at")}`;
}
for (let i = 0; i < ORDERS; i += 5000) {
  const rows = Array.from({ length: 5000 }, () => ({ user_id: 1 + Math.floor(rnd() * USERS), amount: (rnd() * 500).toFixed(2), currency: CUR[Math.floor(rnd() * 3)], created_at: new Date(1_710_000_000_000 + Math.floor(rnd() * 1e9)) }));
  await sql`INSERT INTO orders ${sql(rows, "user_id", "amount", "currency", "created_at")}`;
}
const [{ u }] = await sql`SELECT count(*)::int AS u FROM users`;
const [{ o }] = await sql`SELECT count(*)::int AS o FROM orders`;
console.log({ users: u, orders: o });
await sql.end();
