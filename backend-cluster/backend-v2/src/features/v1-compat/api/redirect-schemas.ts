import { z } from "@/shared/zod-openapi-setup";

// === Ledger Editor Endpoint ===

export const ledgerEditorRedirectSchema = z
  .object({
    location: z.string().url().openapi({
      description: "Dashboard URL with one-time authentication token",
      example:
        "https://beancount.io/auth?oneTimeToken=507f1f77bcf86cd799439011",
    }),
  })
  .openapi("LedgerEditorRedirect", {
    description:
      "Redirect response to dashboard with one-time token for seamless authentication",
  });

export const ledgerEditorErrorSchema = z
  .object({
    message: z.string().openapi({
      description: "Error message",
      example: "token not found",
    }),
  })
  .openapi("LedgerEditorError", {
    description:
      "Error response when authentication token is missing or invalid",
  });

export const ledgerEditorOptionalIdQuerySchema = z
  .object({
    ledgerId: z.string().optional().openapi({
      description:
        "Optional ledger identifier in owner/name format (e.g., 'user123/main-ledger'). Legacy base64url format is also accepted. If provided, redirects to the specific ledger editor.",
      example: "user123/main-ledger",
    }),
  })
  .openapi("LedgerEditorOptionalIdQuery", {
    description:
      "Query parameters for ledger editor endpoint with optional ledgerId",
  });
