// bench/db-reset.ts — return orders to seed state between configs
import postgres from "postgres";
export const SEED_ORDERS = 200_000;
export async function resetOrders() {
  const c = postgres("postgres://postgres@localhost:5432/bench_saas");
  await c`DELETE FROM orders WHERE id > ${SEED_ORDERS}`;
  await c`SELECT setval('orders_id_seq', ${SEED_ORDERS})`;
  await c.end();
}
