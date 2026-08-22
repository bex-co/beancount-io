import { z } from "@/shared/zod-openapi-setup";

// === Stripe Webhook POST Endpoint ===

// Note: The actual request body is raw JSON that Stripe sends
// This schema represents the typical structure, but we don't validate
// it since Stripe signature verification handles security
export const stripeWebhookHeadersSchema = z
  .object({
    "stripe-signature": z.string().openapi({
      description:
        "Stripe webhook signature for verifying the authenticity of the webhook event",
      example:
        "t=1614556800,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd",
    }),
    "stripe-event-id": z.string().optional().openapi({
      description: "Optional Stripe event ID for tracking",
      example: "evt_1234567890abcdef",
    }),
  })
  .openapi("StripeWebhookHeaders");

export const stripeWebhookSuccessResponseSchema = z
  .object({
    received: z.literal(true).openapi({ description: "Webhook was received" }),
    processed: z.boolean().openapi({
      description:
        "Whether the webhook was processed (false if ignored due to missing metadata)",
    }),
    reason: z.string().optional().openapi({
      description: "Reason for not processing the webhook if processed=false",
      example: "No client ID in metadata",
    }),
  })
  .openapi("StripeWebhookSuccessResponse");

export const stripeWebhookErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Error message describing what went wrong",
      example: "Webhook Error: Invalid signature",
    }),
  })
  .openapi("StripeWebhookErrorResponse");

// === Stripe Webhook GET (Health Check) Endpoint ===

export const stripeWebhookHealthResponseSchema = z
  .object({
    ok: z.literal(true).openapi({
      description: "Indicates the webhook endpoint is operational",
    }),
  })
  .openapi("StripeWebhookHealthResponse");

// Example of a typical Stripe event structure for documentation purposes
export const stripeEventExampleSchema = z
  .object({
    id: z.string().openapi({ example: "evt_1234567890abcdef" }),
    object: z.literal("event"),
    type: z.string().openapi({
      description: "Event type",
      example: "customer.subscription.created",
    }),
    data: z.object({
      object: z.record(z.string(), z.unknown()).openapi({
        description:
          "Event-specific data object containing metadata.clientId and metadata.userId",
      }),
      previous_attributes: z
        .record(z.string(), z.unknown())
        .optional()
        .openapi({
          description: "Previous attribute values for update events",
        }),
    }),
  })
  .openapi("StripeEventExample", {
    description:
      "Example structure of a Stripe webhook event. See Stripe API docs for complete event schemas.",
  });
