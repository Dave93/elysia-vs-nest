// Zod, same schemas as the Nest app's: dunx validates against Standard Schema, so
// the value in a route's options object is a plain `z.object()`.
import { HttpStatusCode, type RouteSchemas } from "@dunx/http";
import { z } from "zod";

export const Echo = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.int().min(0).max(150),
  tags: z.array(z.string()).max(10),
});
export type Echo = z.infer<typeof Echo>;

export const OrderBody = z.object({
  userId: z.int().min(1),
  amount: z.number().min(0),
  currency: z.enum(["USD", "EUR", "GBP"]),
});

// A params schema covers the whole params object, so `:id` is a field here rather
// than the bare scalar Nest's `@Param('id', { schema })` takes.
export const IdParam = z.object({ id: z.coerce.number().int().min(1) });
export const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const CpuQuery = z.object({ n: z.coerce.number().int().min(1).max(1_000_000) });

// Declaring a schema is what makes the matching `input` field exist and be parsed.
// `status` overrides the verb default, which is 201 for POST.
export const echo = { body: Echo, status: HttpStatusCode.OK } as const satisfies RouteSchemas;
export const cpu = { query: CpuQuery } as const satisfies RouteSchemas;
export const oneUser = { params: IdParam } as const satisfies RouteSchemas;
export const listUsers = { query: ListQuery } as const satisfies RouteSchemas;
export const createOrder = { body: OrderBody } as const satisfies RouteSchemas;
