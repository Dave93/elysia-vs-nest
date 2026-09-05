// Driver follows runtime unless DB_DRIVER is set: bunsql on Bun, postgresjs on Node.
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/bench_saas";
const driver = process.env.DB_DRIVER ?? (typeof Bun !== "undefined" ? "bunsql" : "postgresjs");

export const db =
  driver === "bunsql"
    ? (await import("drizzle-orm/bun-sql")).drizzle(new (await import("bun")).SQL({ url, max: 10 }), { schema })
    : (await import("drizzle-orm/postgres-js")).drizzle((await import("postgres")).default(url, { max: 10 }), { schema });

export { schema };
