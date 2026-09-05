// Exports the Elysia instance without listening; the AOT build points here.
import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { userIdFromAuthHeader } from "./auth";
import { sha256Loop } from "./cpu";

const EchoBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  email: t.String({ format: "email" }),
  age: t.Integer({ minimum: 0, maximum: 150 }),
  tags: t.Array(t.String(), { maxItems: 10 }),
});

const OrderBody = t.Object({
  userId: t.Integer({ minimum: 1 }),
  amount: t.Number({ minimum: 0 }),
  currency: t.Union([t.Literal("USD"), t.Literal("EUR"), t.Literal("GBP")]),
});

const serializeUser = (u: typeof schema.users.$inferSelect) => ({
  id: u.id, name: u.name, email: u.email, age: u.age, createdAt: u.createdAt.toISOString(),
});
const serializeOrder = (o: typeof schema.orders.$inferSelect) => ({
  id: o.id, userId: o.userId, amount: o.amount, currency: o.currency, createdAt: o.createdAt.toISOString(),
});

export const app = new Elysia()
  .get("/health", () => ({ status: "ok" }))
  .post("/echo", { body: EchoBody }, ({ body }) => body)
  .get("/cpu", { query: t.Object({ n: t.Integer({ minimum: 1, maximum: 1_000_000 }) }) }, ({ query }) => ({
    n: query.n, hash: sha256Loop(query.n),
  }))
  .get("/users/:id", { params: t.Object({ id: t.Integer({ minimum: 1 }) }) }, async ({ params, status }) => {
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, params.id)).limit(1);
    return u ? serializeUser(u) : status(404, { error: "not found" });
  })
  .get("/users", {
    query: t.Object({
      page: t.Integer({ minimum: 1, default: 1 }),
      limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
    }),
  }, async ({ query }) => {
    const rows = await db.select().from(schema.users).orderBy(schema.users.id)
      .limit(query.limit).offset((query.page - 1) * query.limit);
    return { page: query.page, limit: query.limit, items: rows.map(serializeUser) };
  })
  .post("/orders", { body: OrderBody }, async ({ body, status }) => {
    const [o] = await db.insert(schema.orders)
      .values({ userId: body.userId, amount: body.amount.toFixed(2), currency: body.currency, createdAt: new Date() })
      .returning();
    return status(201, serializeOrder(o));
  })
  .derive(async ({ headers }) => ({ userId: await userIdFromAuthHeader(headers.authorization) }))
  .get("/me", async ({ userId, status }) => {
    if (!userId) return status(401, { error: "unauthorized" });
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    return u ? serializeUser(u) : status(404, { error: "not found" });
  });
