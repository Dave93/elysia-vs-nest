// Standard Schema v1 adapter over a compiled TypeBox validator. typebox 1.3 ships none.
import { Compile } from 'typebox/compile';
import type { TSchema } from 'typebox';
import type { StandardSchemaV1 } from '@standard-schema/spec';

export function typeboxStandard<T extends TSchema>(schema: T): StandardSchemaV1<unknown, unknown> {
  const c = Compile(schema);
  return {
    '~standard': {
      version: 1,
      vendor: 'typebox',
      validate: (value: unknown) =>
        c.Check(value)
          ? { value }
          : { issues: c.Errors(value).map((e) => ({ message: e.message, path: e.instancePath.split('/').filter(Boolean) })) },
    },
  };
}
