import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import type { z } from 'zod';
import { DB, type Db } from '../db/db.module.js';
import { orders } from '../db/schema.js';
import { OrderBody } from '../schemas.js';

const serializeOrder = (o: typeof orders.$inferSelect) => ({
  id: o.id, userId: o.userId, amount: o.amount, currency: o.currency, createdAt: o.createdAt.toISOString(),
});

@Controller('orders')
export class OrdersController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Post()
  @HttpCode(201)
  async create(@Body({ schema: OrderBody }) body: z.infer<typeof OrderBody>) {
    const [o] = await this.db
      .insert(orders)
      .values({ userId: body.userId, amount: body.amount.toFixed(2), currency: body.currency, createdAt: new Date() })
      .returning();
    return serializeOrder(o);
  }
}
