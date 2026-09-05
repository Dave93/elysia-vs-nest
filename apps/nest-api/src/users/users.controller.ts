import { Controller, Get, Inject, NotFoundException, Param, Query, Req, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { z } from 'zod';
import { DB, type Db } from '../db/db.module.js';
import { users } from '../db/schema.js';
import { IdParam, ListQuery } from '../schemas.js';
import { AuthGuard } from '../auth/auth.guard.js';

export const serializeUser = (u: typeof users.$inferSelect) => ({
  id: u.id, name: u.name, email: u.email, age: u.age, createdAt: u.createdAt.toISOString(),
});

@Controller()
export class UsersController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: { userId: number }) {
    const [u] = await this.db.select().from(users).where(eq(users.id, req.userId)).limit(1);
    if (!u) throw new NotFoundException({ error: 'not found' });
    return serializeUser(u);
  }

  @Get('users/:id')
  async one(@Param('id', { schema: IdParam }) id: number) {
    const [u] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!u) throw new NotFoundException({ error: 'not found' });
    return serializeUser(u);
  }

  @Get('users')
  async list(@Query({ schema: ListQuery }) q: z.infer<typeof ListQuery>) {
    const rows = await this.db.select().from(users).orderBy(users.id).limit(q.limit).offset((q.page - 1) * q.limit);
    return { page: q.page, limit: q.limit, items: rows.map(serializeUser) };
  }
}
