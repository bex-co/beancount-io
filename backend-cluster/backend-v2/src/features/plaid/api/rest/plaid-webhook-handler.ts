import type Router from "@koa/router";
import {
  type DatabaseLayer,
  type ClientFactoryLayer,
  type ServiceLayer,
} from "@/foundation/composition";
import { validatePlaidWebhook } from "@/features/plaid/utils/plaid-webhook-verification";
import { safeParseWebhookEvent } from "@/features/plaid/utils/plaid-webhook-parser";
import { PlaidWebhookService } from "@/features/plaid/service/plaid-webhook-service";
import { logger } from "@/shared/logger";

const webhookLogger = logger.child({ module: "plaid-webhook-handler" });

/**
 * Fast webhook receiver following Plaid best practices:
 *
 * 1. Verify signature (Plaid-Verification header); refuse unsigned requests
 * 2. Store raw event in database (idempotent)
 * 3. Return 200 quickly (< 10 seconds)
 * 4. Let scheduled job process asynchronously
 *
 * This ensures we never lose webhooks and can handle them reliably
 * even during high load or service interruptions.
 */
export function setPlaidWebhookHandler(
  router: Router,
  layers: {
    database: DatabaseLayer;
    clients: ClientFactoryLayer;
    services: Pick<ServiceLayer, "plaidSync" | "authorization">;
  },
): void {
  const webhookService = new PlaidWebhookService(
    layers.database.models,
    layers.database.db,
    layers.services.plaidSync,
    layers.clients.favaClientFactory,
    layers.services.authorization,
  );

  router.post("/api/plaid/webhook", async (ctx) => {
    // Step 1: Verify the Plaid-Verification signature. A request without a
    // valid one is not a Plaid event: refuse it and store nothing. Storing it
    // queued anyone's unsigned posts ahead of real events (w0/052). Plaid
    // retries its own deliveries, so a signed event refused by a transient
    // verification failure comes back.
    try {
      await validatePlaidWebhook(
        layers.clients.plaidClient,
        ctx.headers["plaid-verification"] as string | undefined,
        // validate the body as a JSON stringified object JSON.stringify(ctx.request.body, null, 2),
        JSON.stringify(ctx.request.body, null, 2),
      );
    } catch (err) {
      webhookLogger.warn("Plaid webhook refused: verification failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      ctx.status = 401;
      ctx.body = { received: false };
      return;
    }

    // Step 2: Safely parse event structure (fallback to "unknown"). A verified
    // body that cannot be parsed is still stored, for debugging.
    const rawBody = JSON.stringify(ctx.request.body);
    let webhookType = "unknown";
    let webhookCode = "unknown";
    let itemId = "unknown";
    try {
      ({ webhookType, webhookCode, itemId } = safeParseWebhookEvent(
        ctx.request.body,
      ));
    } catch (err) {
      webhookLogger.error("Webhook parse failed", { error: err });
    }

    // Step 3: Store the verified event (ID auto-generated), retrying once.
    await webhookService.recordEvent({
      webhookType,
      webhookCode,
      itemId,
      rawBody,
    });

    // Step 4: Return 200 (< 10 seconds)
    ctx.status = 200;
    ctx.body = { received: true };
  });

  router.get("/api/plaid/test_webhook", async (ctx) => {
    ctx.status = 200;
    ctx.body = { received: true };
  });
}
