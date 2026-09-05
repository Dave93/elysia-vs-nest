import { z } from 'zod';
import Type from 'typebox';
import { typeboxStandard } from './typebox-standard.js';

export const EchoZod = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.int().min(0).max(150),
  tags: z.array(z.string()).max(10),
});
export const EchoTypeBox = typeboxStandard(
  Type.Object({
    name: Type.String({ minLength: 1, maxLength: 100 }),
    email: Type.String({ format: 'email' }),
    age: Type.Integer({ minimum: 0, maximum: 150 }),
    tags: Type.Array(Type.String(), { maxItems: 10 }),
  }),
);
export const Echo = process.env.VALIDATOR === 'typebox' ? EchoTypeBox : EchoZod;
export type Echo = z.infer<typeof EchoZod>;

export const OrderBody = z.object({
  userId: z.int().min(1),
  amount: z.number().min(0),
  currency: z.enum(['USD', 'EUR', 'GBP']),
});
export const IdParam = z.coerce.number().int().min(1);
export const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const CpuQuery = z.object({ n: z.coerce.number().int().min(1).max(1_000_000) });
