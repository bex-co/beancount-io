import { PlaidWebhookRequestSchema } from "../api/rest/plaid-webhook-schemas";
import { logger } from "@/shared/logger";

const parserLogger = logger.child({ module: "plaid-webhook-parser" });

export interface ParsedWebhookEvent {
  webhookType: string;
  webhookCode: string;
  itemId: string;
}

/**
 * Safely parse Plaid webhook event with fallback to "unknown" values
 *
 * This function ensures we never lose webhook data, even if the payload
 * doesn't match our schema. It attempts:
 * 1. Schema validation with Zod
 * 2. Manual field extraction if validation fails
 * 3. Fallback to "unknown" if fields are missing or invalid
 *
 * @param body - Raw webhook request body
 * @returns Parsed event with guaranteed non-null fields
 */
export function safeParseWebhookEvent(body: unknown): ParsedWebhookEvent {
  // Default fallback values
  let webhookType = "unknown";
  let webhookCode = "unknown";
  let itemId = "unknown";

  // Step 1: Try schema validation
  const parseResult = PlaidWebhookRequestSchema.safeParse(body);

  if (parseResult.success) {
    // Schema validation succeeded
    return {
      webhookType: parseResult.data.webhook_type,
      webhookCode: parseResult.data.webhook_code,
      itemId: parseResult.data.item_id,
    };
  }

  // Step 2: Schema validation failed - try manual extraction
  parserLogger.warn("Webhook schema validation failed, using fallback", {
    error: parseResult.error,
    body,
  });

  if (body && typeof body === "object") {
    const bodyObj = body as Record<string, unknown>;

    webhookType =
      typeof bodyObj.webhook_type === "string"
        ? bodyObj.webhook_type
        : "unknown";

    webhookCode =
      typeof bodyObj.webhook_code === "string"
        ? bodyObj.webhook_code
        : "unknown";

    itemId = typeof bodyObj.item_id === "string" ? bodyObj.item_id : "unknown";
  }

  return {
    webhookType,
    webhookCode,
    itemId,
  };
}
