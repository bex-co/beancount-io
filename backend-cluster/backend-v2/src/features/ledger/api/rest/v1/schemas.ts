import { z } from "@/shared/zod-openapi-setup";
import { createLedgerId } from "@/shared/str";

/**
 * Shared request shapes for the v1 surface.
 *
 * The ledger is addressed as two path segments, `{owner}/{name}`, never as one
 * `{ledgerId}` (ADR 0006 D7). A ledger id is `owner/name`, so putting it in a
 * single segment means a URL-encoded `%2F` that has to survive Cloudflare and
 * Caddy unchanged; the existing `/api-gateway/ledgers/:ledgerId/...` route
 * depends on exactly that, and v1 does not copy it.
 */

export const ledgerPathSchema = z
  .object({
    owner: z.string().min(1).openapi({
      description: "Ledger owner's username",
      example: "alice",
    }),
    name: z.string().min(1).openapi({
      description: "Ledger (repository) name",
      example: "main-ledger",
    }),
  })
  .openapi("LedgerPath", {
    description: "The ledger, addressed as two path segments",
  });

export type LedgerPath = z.infer<typeof ledgerPathSchema>;

/** `owner/name` from the path, in the form the service layer takes. */
export const ledgerIdOf = (params: LedgerPath): string =>
  createLedgerId(params.owner, params.name);

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
