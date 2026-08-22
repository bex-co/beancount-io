import Router from "@koa/router";
import { SUBSCRIPTION_CONFIG } from "@/features/stripe/service/stripe";
import { type AppLayers } from "@/foundation/composition";
import Stripe from "stripe";
import { logger } from "@/shared/logger";
import { registerRoute } from "@/server/rest/openapi-registry";
import {
  stripeEventExampleSchema,
  stripeWebhookSuccessResponseSchema,
  stripeWebhookErrorResponseSchema,
  stripeWebhookHealthResponseSchema,
} from "./stripe-webhook-schemas";

const ENFORCE_USER_EXISTS = false;

async function handleStripeEvent(
  event: Stripe.Event,
  layers: AppLayers,
  clientId: string,
  userId: string,
): Promise<void> {
  const stripeCase = layers.services.stripe;

  switch (event.type) {
    case "customer.created":
    case "customer.updated": {
      const customer = event.data.object;
      const previousAttributes = event.data.previous_attributes || {};
      const eventType = event.type.replace("customer.", "");
      logger.debug(`Customer ${eventType} event received`, {
        customerId: customer.id,
        clientId,
        userId,
      });

      await stripeCase.handleCustomerEvent(
        customer,
        eventType,
        previousAttributes,
        clientId,
        userId,
      );
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object;
      logger.debug("Checkout session completed", {
        sessionId: session.id,
        clientId,
        userId,
      });

      // Let the service handle the checkout session completed event
      await stripeCase.handleCheckoutSessionCompleted(
        session,
        clientId,
        userId,
      );
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      logger.debug("Subscription updated event received", {
        subscriptionId: subscription.id,
        status: subscription.status,
        clientId,
        userId,
      });

      // If subscription is active, update currentPeriodEnd in our database
      if (subscription.status === "active") {
        const periodEnd = subscription.items?.data[0]?.current_period_end;
        if (periodEnd && userId !== "unknown") {
          const customer =
            await layers.database.models.paidCustomer.findByUserIdAndClientId(
              layers.database.db,
              userId,
              clientId,
            );
          if (customer) {
            await layers.database.models.paidCustomer.updateCustomerById(
              layers.database.db,
              customer.id,
              { currentPeriodEnd: new Date(periodEnd * 1000) },
            );
            logger.debug("Updated currentPeriodEnd from subscription webhook", {
              userId,
              clientId,
              subscriptionId: subscription.id,
            });
          }
        }
      }
      break;
    }

    default:
      logger.debug("Unhandled event type received", {
        eventType: event.type,
        clientId,
      });
  }
}

interface EventWithMetadata {
  data?: {
    object?: {
      metadata?: {
        clientId?: string;
      };
    };
  };
}

function extractClientId(parsedEvent: EventWithMetadata): string | undefined {
  // Only use client ID from the event metadata, no fallback
  const clientId = parsedEvent.data?.object?.metadata?.clientId;
  if (clientId) {
    return clientId;
  }

  // No fallback - if no client ID in metadata, we ignore the event
  return undefined;
}

function extractUserId(eventObject: unknown): string {
  if (
    eventObject &&
    typeof eventObject === "object" &&
    "metadata" in eventObject &&
    eventObject.metadata &&
    typeof eventObject.metadata === "object" &&
    "userId" in eventObject.metadata &&
    typeof eventObject.metadata.userId === "string"
  ) {
    return eventObject.metadata.userId;
  }

  return "unknown";
}

export function setStripeWebhookHandler(
  router: Router,
  layers: AppLayers,
): void {
  const handleWebhook = async function (ctx: Router.RouterContext) {
    const signature = ctx.request.headers["stripe-signature"] as string;
    const eventId = ctx.request.headers["stripe-event-id"] || "unknown";

    if (!signature) {
      logger.error("Stripe webhook signature missing", {
        eventId: String(eventId),
      });
      ctx.status = 400;
      ctx.body = { error: "No Stripe signature found" };
      return;
    }

    try {
      // Get and parse the raw body
      const rawBodyString = ctx.request.rawBody;

      if (!rawBodyString) {
        ctx.status = 400;
        ctx.body = { error: "Missing request body" };
        return;
      }

      let parsedEvent;
      try {
        parsedEvent = JSON.parse(rawBodyString);
        logger.debug("Stripe webhook event received", {
          eventType: parsedEvent.type || "unknown",
          eventId: parsedEvent.id || eventId,
          parsedEvent: parsedEvent,
        });
      } catch (parseErr) {
        logger.error("Failed to parse Stripe webhook payload", {
          error:
            parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        ctx.status = 400;
        ctx.body = { error: "Invalid JSON payload" };
        return;
      }

      // Extract client ID from the event data - no fallback to customer lookup
      const clientId = extractClientId(parsedEvent);
      if (!clientId) {
        // This is expected for events without client ID, so use info level
        logger.debug("Ignoring Stripe event without client ID in metadata", {
          eventId: parsedEvent.id || eventId,
        });
        ctx.status = 200; // Return 200 to acknowledge receipt but ignore the event
        ctx.body = {
          received: true,
          processed: false,
          reason: "No client ID in metadata",
        };
        return;
      }

      logger.debug("Processing Stripe webhook event", {
        eventId: parsedEvent.id || eventId,
        clientId,
      });

      // Get client configuration and verify it has a webhook secret
      const clientConfig =
        SUBSCRIPTION_CONFIG[clientId as keyof typeof SUBSCRIPTION_CONFIG];
      if (!clientConfig?.webhookSecret) {
        logger.error("No webhook secret configured for client", { clientId });
        ctx.status = 400;
        ctx.body = { error: `Invalid client configuration for ${clientId}` };
        return;
      }

      // Get client-specific Stripe instance
      const stripeCase = layers.services.stripe;
      const stripe = stripeCase.getStripeInstance(clientId);

      // Verify the webhook signature and construct the event
      const event = stripe.webhooks.constructEvent(
        rawBodyString,
        signature,
        clientConfig.webhookSecret,
      );

      // Extract user ID from the event data
      const userId = extractUserId(event.data.object);
      logger.debug("Extracted user ID from Stripe event", {
        eventId: event.id,
        userId,
      });

      if (ENFORCE_USER_EXISTS) {
        // Verify that a user with this client ID exists
        const userExists =
          await layers.database.models.paidCustomer.findByUserIdAndClientId(
            layers.database.db,
            userId,
            clientId,
          );

        if (!userExists) {
          // This is expected for some events, so use info level
          logger.debug("Ignoring Stripe event - no matching user for client", {
            eventId: event.id,
            userId,
            clientId,
          });
          ctx.status = 200; // Return 200 to acknowledge receipt but ignore the event
          ctx.body = {
            received: true,
            processed: false,
            reason: "No matching user for client ID",
          };
          return;
        }
      }

      // Process the event
      await handleStripeEvent(event, layers, clientId, userId);
      logger.debug("Successfully processed Stripe webhook event", {
        eventId: event.id,
        eventType: event.type,
      });

      // Acknowledge receipt of the event
      ctx.status = 200;
      ctx.body = { received: true, processed: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const errorStack = err instanceof Error ? err.stack : undefined;
      logger.error("Error processing Stripe webhook", {
        error: errorMessage,
        stack: errorStack,
      });
      ctx.status = 400;
      ctx.body = { error: `Webhook Error: ${errorMessage}` };
    }
  } as Router.Middleware;

  router.post("/api-gateway/stripe/webhook", handleWebhook);
  router.get("/api-gateway/stripe/webhook", ((ctx: Router.RouterContext) => {
    ctx.status = 200;
    ctx.body = {
      ok: true,
    };
  }) as Router.Middleware);

  // Register OpenAPI documentation
  registerStripeWebhookOpenAPIRoutes();
}

/**
 * Register Stripe webhook endpoints with OpenAPI documentation
 */
function registerStripeWebhookOpenAPIRoutes() {
  // POST /api-gateway/stripe/webhook
  registerRoute({
    method: "post",
    path: "/api-gateway/stripe/webhook",
    summary: "Handle Stripe webhook events",
    description: `Receives and processes webhook events from Stripe for payment and subscription management.

**Important**: This endpoint expects raw request body for signature verification.

**Event Processing**:
- Verifies webhook signature using client-specific webhook secret
- Extracts clientId and userId from event metadata
- Processes events: customer.created, customer.updated, checkout.session.completed
- Returns 200 even for ignored events (missing metadata) to prevent retries

**Multi-tenant Support**:
The endpoint supports multiple Stripe accounts via clientId in event metadata.

**Security**:
- Signature verification prevents unauthorized events
- Events without clientId in metadata are ignored
- Optional user existence validation (currently disabled)`,
    tags: ["Stripe Webhooks"],
    request: {
      body: {
        description: `Raw Stripe webhook event payload (JSON). Must include metadata.clientId and optionally metadata.userId.

**Required Headers**:
- 'stripe-signature': Stripe webhook signature for verification (required)
- 'stripe-event-id': Optional Stripe event ID for tracking (optional)`,
        content: {
          "application/json": {
            schema: stripeEventExampleSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Webhook received and processed (or acknowledged)",
        content: {
          "application/json": {
            schema: stripeWebhookSuccessResponseSchema,
          },
        },
      },
      400: {
        description:
          "Invalid signature, missing body, or webhook processing error",
        content: {
          "application/json": {
            schema: stripeWebhookErrorResponseSchema,
          },
        },
      },
    },
  });

  // GET /api-gateway/stripe/webhook
  registerRoute({
    method: "get",
    path: "/api-gateway/stripe/webhook",
    summary: "Stripe webhook health check",
    description:
      "Simple health check endpoint to verify the webhook endpoint is accessible. Used by Stripe and monitoring systems.",
    tags: ["Stripe Webhooks"],
    responses: {
      200: {
        description: "Webhook endpoint is healthy",
        content: {
          "application/json": {
            schema: stripeWebhookHealthResponseSchema,
          },
        },
      },
    },
  });
}
