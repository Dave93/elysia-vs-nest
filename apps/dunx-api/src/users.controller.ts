import { Controller, Get, HttpError, HttpStatusCode, UseGuards, type Input, type RouteSchemas } from "@dunx/http";
import { eq } from "drizzle-orm";
import { BunSQLDatabase } from "drizzle-orm/bun-sql";
import { AuthGuard, userIdOf } from "./auth.guard.js";
import * as schema from "./schema.js";
import { users } from "./schema.js";
import { listUsers, oneUser } from "./schemas.js";

export const serializeUser = (u: typeof users.$inferSelect) => ({
  id: u.id, name: u.name, email: u.email, age: u.age, createdAt: u.createdAt.toISOString(),
});

// No @Inject and no decorator: @dunx/transform recorded the constructor parameter
// type at build time and the container resolves it before calling `new`.
@Controller()
export class UsersController {
  constructor(private readonly db: BunSQLDatabase<typeof schema>) {}

  @Get("/me")
  @UseGuards(AuthGuard)
  async me({ req }: Input<RouteSchemas>) {
    const [u] = await this.db.select().from(users).where(eq(users.id, userIdOf(req))).limit(1);
    if (!u) throw new HttpError(HttpStatusCode.NOT_FOUND, "not found");
    return serializeUser(u);
  }

  // Already a number: the params schema coerced it before this ran.
  @Get("/users/:id", oneUser)
  async one({ params }: Input<typeof oneUser>) {
    const [u] = await this.db.select().from(users).where(eq(users.id, params.id)).limit(1);
    if (!u) throw new HttpError(HttpStatusCode.NOT_FOUND, "not found");
    return serializeUser(u);
  }

  @Get("/users", listUsers)
  async list({ query }: Input<typeof listUsers>) {
    const rows = await this.db.select().from(users).orderBy(users.id)
      .limit(query.limit).offset((query.page - 1) * query.limit);
    return { page: query.page, limit: query.limit, items: rows.map(serializeUser) };
  }
}
