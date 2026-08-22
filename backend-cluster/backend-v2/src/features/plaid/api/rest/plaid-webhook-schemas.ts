import { z } from "@/shared/zod-openapi-setup";

/**
 * Minimal Plaid webhook schema with only required fields
 * Additional fields in the webhook payload are preserved in rawBody
 */
export const PlaidWebhookRequestSchema = z.object({
  webhook_type: z.string().describe("Type of webhook event"),
  webhook_code: z.string().describe("Specific event code"),
  item_id: z.string().describe("Plaid Item ID"),
  rawBody: z
    .string()
    .optional()
    .describe("Raw JSON string of the webhook payload"),
});

export const PlaidWebhookResponseSchema = z.object({
  received: z.boolean().describe("Whether webhook was received successfully"),
});

export type PlaidWebhookRequest = z.infer<typeof PlaidWebhookRequestSchema>;
export type PlaidWebhookResponse = z.infer<typeof PlaidWebhookResponseSchema>;
