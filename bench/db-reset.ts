// bench/db-reset.ts — return orders to seed state between configs and remove the dead tuples the previous config left.
import postgres from "postgres";
export const SEED_ORDERS = 200_000;
export async function resetOrders() {
  const c = postgres("postgres://postgres@localhost:5432/bench_saas");
  await c`DELETE FROM orders WHERE id > ${SEED_ORDERS}`;
  await c`SELECT setval('orders_id_seq', ${SEED_ORDERS})`;
  await c.unsafe("VACUUM (FULL, ANALYZE) orders");
  await c.end();
}
export async function ordersStats() {
  const c = postgres("postgres://postgres@localhost:5432/bench_saas");
  const [r] = await c`SELECT n_live_tup::int AS live, n_dead_tup::int AS dead, pg_total_relation_size('orders')::bigint AS bytes FROM pg_stat_user_tables WHERE relname = 'orders'`;
  await c.end();
  return { live: r.live, dead: r.dead, bytes: Number(r.bytes) };
}
