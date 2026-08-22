import {
  stripeWebhookHeadersSchema,
  stripeWebhookSuccessResponseSchema,
  stripeWebhookErrorResponseSchema,
  stripeWebhookHealthResponseSchema,
  stripeEventExampleSchema,
} from "../stripe-webhook-schemas";

describe("Stripe Webhook Schemas", () => {
  describe("stripeWebhookHeadersSchema", () => {
    it("should accept valid headers with signature", () => {
      const result = stripeWebhookHeadersSchema.safeParse({
        "stripe-signature":
          "t=1614556800,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd",
      });
      expect(result.success).toBe(true);
    });

    it("should accept headers with optional event ID", () => {
      const result = stripeWebhookHeadersSchema.safeParse({
        "stripe-signature": "t=123,v1=abc",
        "stripe-event-id": "evt_1234567890abcdef",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data["stripe-event-id"]).toBe("evt_1234567890abcdef");
      }
    });

    it("should require stripe-signature", () => {
      const result = stripeWebhookHeadersSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject non-string signature", () => {
      const result = stripeWebhookHeadersSchema.safeParse({
        "stripe-signature": 12345,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("stripeWebhookSuccessResponseSchema", () => {
    it("should accept valid success response", () => {
      const result = stripeWebhookSuccessResponseSchema.safeParse({
        received: true,
        processed: true,
      });
      expect(result.success).toBe(true);
    });

    it("should accept response with processed=false and reason", () => {
      const result = stripeWebhookSuccessResponseSchema.safeParse({
        received: true,
        processed: false,
        reason: "No client ID in metadata",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe("No client ID in metadata");
      }
    });

    it("should require received to be true", () => {
      const result = stripeWebhookSuccessResponseSchema.safeParse({
        received: false,
        processed: true,
      });
      expect(result.success).toBe(false);
    });

    it("should require processed field", () => {
      const result = stripeWebhookSuccessResponseSchema.safeParse({
        received: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("stripeWebhookErrorResponseSchema", () => {
    it("should accept valid error response", () => {
      const result = stripeWebhookErrorResponseSchema.safeParse({
        error: "Webhook Error: Invalid signature",
      });
      expect(result.success).toBe(true);
    });

    it("should require error field", () => {
      const result = stripeWebhookErrorResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject non-string error", () => {
      const result = stripeWebhookErrorResponseSchema.safeParse({
        error: { message: "error" },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("stripeWebhookHealthResponseSchema", () => {
    it("should accept valid health response", () => {
      const result = stripeWebhookHealthResponseSchema.safeParse({
        ok: true,
      });
      expect(result.success).toBe(true);
    });

    it("should require ok to be true", () => {
      const result = stripeWebhookHealthResponseSchema.safeParse({
        ok: false,
      });
      expect(result.success).toBe(false);
    });

    it("should require ok field", () => {
      const result = stripeWebhookHealthResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("stripeEventExampleSchema", () => {
    it("should accept valid stripe event", () => {
      const result = stripeEventExampleSchema.safeParse({
        id: "evt_1234567890abcdef",
        object: "event",
        type: "customer.subscription.created",
        data: {
          object: {
            metadata: { clientId: "test-client", userId: "user-123" },
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it("should accept event with previous_attributes", () => {
      const result = stripeEventExampleSchema.safeParse({
        id: "evt_1234567890abcdef",
        object: "event",
        type: "customer.subscription.updated",
        data: {
          object: {},
          previous_attributes: {
            status: "active",
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it("should require object to be 'event'", () => {
      const result = stripeEventExampleSchema.safeParse({
        id: "evt_1234567890abcdef",
        object: "subscription",
        type: "customer.subscription.created",
        data: { object: {} },
      });
      expect(result.success).toBe(false);
    });

    it("should require data.object", () => {
      const result = stripeEventExampleSchema.safeParse({
        id: "evt_1234567890abcdef",
        object: "event",
        type: "customer.subscription.created",
        data: {},
      });
      expect(result.success).toBe(false);
    });
  });
});
