import { z } from "@/shared/zod-openapi-setup";

/**
 * Request and response shapes shared by every v1 endpoint, whichever feature
 * owns it. They live beside the route helper rather than inside one feature so
 * that "what a v1 error looks like" has one answer.
 */

const STRICT_INT_RE = /^-?\d+$/;
const STRICT_DECIMAL_RE = /^-?(?:\d+\.?\d*|\.\d+)$/;

interface IntQueryBounds {
  readonly min?: number;
  readonly max?: number;
  readonly positive?: boolean;
}

/**
 * A base-10 integer carried as a URL query or path string (w31/071).
 *
 * Unlike `z.coerce.number()` (which delegates to JS `Number()` and silently
 * turns `""` / `"   "` into `0` and accepts `"0x2"` / `"1e1"`), this accepts
 * only strict `/^-?\d+$/` strings and preserves OpenAPI `integer` metadata.
 */
export function intQuery(bounds?: IntQueryBounds) {
  let schema = z
    .number({
      error: (iss) =>
        iss.input === undefined
          ? undefined
          : "Invalid integer: expected a base-10 integer",
    })
    .int();
  if (bounds?.positive) schema = schema.positive();
  if (bounds?.min !== undefined) schema = schema.min(bounds.min);
  if (bounds?.max !== undefined) schema = schema.max(bounds.max);
  return z.preprocess(
    (value) =>
      typeof value === "string" && STRICT_INT_RE.test(value)
        ? Number(value) || 0
        : value,
    schema,
  );
}

/**
 * A finite base-10 decimal number carried as a URL query string (w31/071).
 *
 * Refuses `""`, whitespace, hex/binary/octal, scientific notation, and
 * `Infinity`/`NaN` while preserving OpenAPI `number` metadata.
 */
export function decimalQuery() {
  return z.preprocess(
    (value) =>
      typeof value === "string" && STRICT_DECIMAL_RE.test(value)
        ? Number(value) || 0
        : value,
    z.number({
      error: (iss) =>
        iss.input === undefined
          ? undefined
          : "Invalid number: expected a base-10 decimal number",
    }),
  );
}

export const paginationSchema = z
  .object({
    page: intQuery({ min: 1 }).optional().openapi({
      description: "1-based page number",
      example: 1,
    }),
    limit: intQuery({ min: 1, max: 100 }).optional().openapi({
      description: "Page size, at most 100",
      example: 20,
    }),
  })
  .strict();

/** A boolean carried as a query-string literal, decoded the same everywhere. */
export const booleanQuery = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

/** The error body every refusal shares, as `restErrorMiddleware` renders it. */
export const errorSchema = z
  .object({
    ok: z.literal(false),
    error: z.object({
      code: z.string().openapi({
        description: "Canonical error category",
        example: "VALIDATION_FAILED",
      }),
      message: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional().openapi({
        description:
          "Facts about this refusal. A limit a plan sets carries `limitOwner`: `REQUESTER` for the caller's own plan, `LEDGER_OWNER` for the ledger owner's. A limit no plan sets has none.",
      }),
    }),
  })
  .openapi("V1Error", { description: "Standard v1 error body" });

/**
 * A documented JSON response. `schema` defaults to "some JSON": several v1
 * reads pass a ledger-service payload straight through, and inventing a zod
 * mirror of it here would be a second description of a shape we do not own —
 * one free to drift from the thing it describes.
 */
export const json = (description: string, schema: z.ZodType = z.unknown()) => ({
  description,
  content: { "application/json": { schema } },
});
