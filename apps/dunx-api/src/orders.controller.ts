import { Controller, Post, type Input } from "@dunx/http";
import { BunSQLDatabase } from "drizzle-orm/bun-sql";
import * as schema from "./schema.js";
import { orders } from "./schema.js";
import { createOrder } from "./schemas.js";

const serializeOrder = (o: typeof orders.$inferSelect) => ({
  id: o.id, userId: o.userId, amount: o.amount, currency: o.currency, createdAt: o.createdAt.toISOString(),
});

// 201 is the POST default, so no status is declared here.
@Controller("orders")
export class OrdersController {
  constructor(private readonly db: BunSQLDatabase<typeof schema>) {}

  @Post("/", createOrder)
  async create({ body }: Input<typeof createOrder>) {
    const [o] = await this.db.insert(orders)
      .values({ userId: body.userId, amount: body.amount.toFixed(2), currency: body.currency, createdAt: new Date() })
      .returning();
    return serializeOrder(o);
  }
}
