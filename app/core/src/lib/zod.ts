import { z } from 'zod';

export { z };
export type { ZodError, ZodIssue, ZodType, input as ZodInput, output as ZodOutput } from 'zod';

export function parseWithZod<TSchema extends z.ZodType>(schema: TSchema, value: unknown) {
  return schema.safeParse(value);
}

export function getZodIssues(error: z.ZodError) {
  return error.issues;
}
