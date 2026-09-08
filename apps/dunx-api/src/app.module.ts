import { Module } from "@dunx/core";
import { DbModule, SqlOptions } from "@dunx/infra/db";
import { AuthGuard } from "./auth.guard.js";
import { OrdersController } from "./orders.controller.js";
import * as schema from "./schema.js";
import { SystemController } from "./system.controller.js";
import { UsersController } from "./users.controller.js";

// drizzle over Bun.SQL. @dunx/infra/db has no postgres.js driver, so DB_DRIVER is
// not read here: this app is the bunsql column only.
const url = process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/bench_saas";

@Module({
  imports: [DbModule.forRoot(new SqlOptions({ schema, url, max: 10 }))],
  controllers: [SystemController, UsersController, OrdersController],
  providers: [AuthGuard],
})
export class AppModule {}
