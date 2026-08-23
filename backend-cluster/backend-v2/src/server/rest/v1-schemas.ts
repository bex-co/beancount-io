import { z } from "@/shared/zod-openapi-setup";

/**
 * Request and response shapes shared by every v1 endpoint, whichever feature
 * owns it. They live beside the route helper rather than inside one feature so
 * that "what a v1 error looks like" has one answer.
 */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().openapi({
    description: "1-based page number",
    example: 1,
  }),
  limit: z.coerce.number().int().min(1).max(100).optional().openapi({
    description: "Page size, at most 100",
    example: 20,
  }),
});

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
      metadata: z.record(z.string(), z.unknown()).optional(),
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
