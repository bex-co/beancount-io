import type Router from "@koa/router";
import {
  type DatabaseLayer,
  type ClientFactoryLayer,
} from "@/foundation/composition";
import { validatePlaidWebhook } from "@/features/plaid/utils/plaid-webhook-verification";
import { safeParseWebhookEvent } from "@/features/plaid/utils/plaid-webhook-parser";
import { PlaidWebhookEventPostgresModel } from "@/features/plaid/data/plaid-webhook-event-model";
import { logger } from "@/shared/logger";

const webhookLogger = logger.child({ module: "plaid-webhook-handler" });

/**
 * Fast webhook receiver following Plaid best practices:
 *
 * 1. Verify signature (Plaid-Verification header)
 * 2. Store raw event in database (idempotent)
 * 3. Return 200 quickly (< 10 seconds)
 * 4. Let scheduled job process asynchronously
 *
 * This ensures we never lose webhooks and can handle them reliably
 * even during high load or service interruptions.
 */
export function setPlaidWebhookHandler(
  router: Router,
  layers: { database: DatabaseLayer; clients: ClientFactoryLayer },
): void {
  const webhookEventModel = new PlaidWebhookEventPostgresModel();

  router.post("/api/plaid/webhook", async (ctx) => {
    // Always return 200 to prevent Plaid from retrying
    // Store the event even if parsing fails (for debugging)
    let rawBody = "{}";
    let webhookType = "unknown";
    let webhookCode = "unknown";
    let itemId = "unknown";

    try {
      webhookLogger.debug("Parsed webhook event", ctx.request.body);

      // Step 2: Verify webhook signature
      await validatePlaidWebhook(
        layers.clients.plaidClient,
        ctx.headers["plaid-verification"] as string | undefined,
        // validate the body as a JSON stringified object JSON.stringify(ctx.request.body, null, 2),
        JSON.stringify(ctx.request.body, null, 2),
      );

      rawBody = JSON.stringify(ctx.request.body);

      // Step 3: Safely parse event structure (fallback to "unknown")
      const parsed = safeParseWebhookEvent(ctx.request.body);
      webhookType = parsed.webhookType;
      webhookCode = parsed.webhookCode;
      itemId = parsed.itemId;

      // Step 4: Store raw event in database (ID auto-generated)
      const event = await webhookEventModel.create(layers.database.db, {
        webhookType,
        webhookCode,
        itemId,
        rawBody,
      });

      webhookLogger.debug("Webhook received and queued", {
        eventId: event.id,
        webhookType,
        webhookCode,
        itemId,
      });
    } catch (err) {
      webhookLogger.error("Webhook storage failed", {
        error: err,
        webhookType,
        webhookCode,
        itemId,
      });

      // Try to store failed webhook event for debugging
      try {
        await webhookEventModel.create(layers.database.db, {
          webhookType,
          webhookCode,
          itemId,
          rawBody,
        });
      } catch (storageErr) {
        webhookLogger.error("Failed to store failed webhook event", {
          error: storageErr,
        });
      }
    }

    // Step 5: Always return 200 (< 10 seconds)
    ctx.status = 200;
    ctx.body = { received: true };
  });

  router.get("/api/plaid/test_webhook", async (ctx) => {
    ctx.status = 200;
    ctx.body = { received: true };
  });
}
