import { Global, Module } from '@nestjs/common';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

export const DB = Symbol('DB');
export type Db = PostgresJsDatabase<typeof schema>;

// Driver follows runtime unless DB_DRIVER is set: bunsql on Bun, postgresjs on Node.
async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL ?? 'postgres://postgres@localhost:5432/bench_saas';
  const driver =
    process.env.DB_DRIVER ?? (typeof (globalThis as any).Bun !== 'undefined' ? 'bunsql' : 'postgresjs');
  if (driver === 'bunsql') {
    const { SQL } = await import('bun');
    const { drizzle } = await import('drizzle-orm/bun-sql');
    return drizzle(new SQL({ url, max: 10 }), { schema }) as unknown as Db;
  }
  const { default: postgres } = await import('postgres');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  return drizzle(postgres(url, { max: 10 }), { schema });
}

@Global()
@Module({
  providers: [{ provide: DB, useFactory: createDb }],
  exports: [DB],
})
export class DbModule {}
