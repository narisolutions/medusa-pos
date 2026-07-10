import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

// zodResolver for schemas with z.coerce fields: coercion makes the schema's input type
// `unknown`, breaking zodResolver's inferred Resolver. Centralizes the one required cast.
const coercedZodResolver = <T extends FieldValues>(
  schema: z.ZodType<T, unknown>
): Resolver<T> =>
  zodResolver(schema as unknown as z.ZodType<T, T>) as unknown as Resolver<T>;

export { coercedZodResolver };
