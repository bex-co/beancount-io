import "reflect-metadata";
import Router from "@koa/router";
import { setStripeWebhookHandler } from "../stripe-webhook-handler";
import type { AppLayers } from "@/foundation/composition";
import { StripeService } from "@/features/stripe/service/stripe-service";

// Mock logger
jest.mock("@/shared/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock openapi registry
jest.mock("@/server/rest/openapi-registry", () => ({
  registerRoute: jest.fn(),
}));

// Mock the SUBSCRIPTION_CONFIG
jest.mock("@/features/stripe/service/stripe", () => ({
  SUBSCRIPTION_CONFIG: {
    testClient: {
      webhookSecret: "whsec_test_secret",
      secretKey: "sk_test_secret",
    },
  },
}));

// Mock StripeService
jest.mock("@/features/stripe/service/stripe-service");

describe("stripe-webhook-handler", () => {
  let mockRouter: Router;
  let mockLayers: AppLayers;
  let postHandler: Router.Middleware;
  let getHandler: Router.Middleware;

  const createMockContext = (overrides: Partial<Router.RouterContext> = {}) =>
    ({
      request: {
        headers: {},
        rawBody: undefined,
        ...overrides.request,
      },
      status: 0,
      body: undefined,
      ...overrides,
    }) as unknown as Router.RouterContext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup StripeService mock
    (StripeService as jest.Mock).mockImplementation(() => ({
      handleCustomerEvent: jest.fn().mockResolvedValue(undefined),
      handleCheckoutSessionCompleted: jest.fn().mockResolvedValue(undefined),
      getStripeInstance: jest.fn().mockReturnValue({
        webhooks: {
          constructEvent: jest.fn(),
        },
      }),
    }));

    // Create mock router
    mockRouter = {
      post: jest.fn((path: string, handler: Router.Middleware) => {
        if (path === "/api-gateway/stripe/webhook") {
          postHandler = handler;
        }
      }),
      get: jest.fn((path: string, handler: Router.Middleware) => {
        if (path === "/api-gateway/stripe/webhook") {
          getHandler = handler;
        }
      }),
    } as unknown as Router;

    // Create mock layers. `services.stripe` is a getter that constructs via the mocked
    // StripeService, so each test's `(StripeService as jest.Mock)
    // .mockImplementation(...)` still drives `layers.services.stripe`.
    mockLayers = {
      database: {
        db: {} as any,
        models: {
          paidCustomer: {
            findOne: jest.fn(),
          },
        },
      },
      clients: {},
      services: {
        get stripe() {
          return new (StripeService as unknown as new () => unknown)();
        },
      },
      workflows: {},
    } as unknown as AppLayers;

    // Call the function to register routes
    setStripeWebhookHandler(mockRouter, mockLayers);
  });

  describe("setStripeWebhookHandler", () => {
    it("should register POST and GET routes", () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        "/api-gateway/stripe/webhook",
        expect.any(Function),
      );
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/api-gateway/stripe/webhook",
        expect.any(Function),
      );
    });
  });

  describe("GET /api-gateway/stripe/webhook", () => {
    it("should return health check response", async () => {
      const ctx = createMockContext();
      await getHandler(ctx, jest.fn());

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({ ok: true });
    });
  });

  describe("POST /api-gateway/stripe/webhook", () => {
    describe("signature validation", () => {
      it("should return 400 when stripe-signature header is missing", async () => {
        const ctx = createMockContext({
          request: {
            headers: {},
            rawBody: "{}",
          } as unknown as Router.RouterContext["request"],
        });

        await postHandler(ctx, jest.fn());

        expect(ctx.status).toBe(400);
        expect(ctx.body).toEqual({ error: "No Stripe signature found" });
      });
    });

    describe("request body validation", () => {
      it("should return 400 when request body is missing", async () => {
        const ctx = createMockContext({
          request: {
            headers: { "stripe-signature": "sig_test" },
            rawBody: undefined,
          } as unknown as Router.RouterContext["request"],
        });

        await postHandler(ctx, jest.fn());

        expect(ctx.status).toBe(400);
        expect(ctx.body).toEqual({ error: "Missing request body" });
      });

      it("should return 400 when request body is invalid JSON", async () => {
        const ctx = createMockContext({
          request: {
            headers: { "stripe-signature": "sig_test" },
            rawBody: "invalid json",
          } as unknown as Router.RouterContext["request"],
        });

        await postHandler(ctx, jest.fn());

        expect(ctx.status).toBe(400);
        expect(ctx.body).toEqual({ error: "Invalid JSON payload" });
      });
    });

    describe("client ID extraction", () => {
      it("should return 200 with not processed when clientId is missing from metadata", async () => {
        const eventPayload = JSON.stringify({
          id: "evt_test",
          type: "customer.created",
          data: {
            object: {
              id: "cus_test",
              metadata: {},
            },
          },
        });

        const ctx = createMockContext({
          request: {
            headers: { "stripe-signature": "sig_test" },
            rawBody: eventPayload,
          } as unknown as Router.RouterContext["request"],
        });

        await postHandler(ctx, jest.fn());

        expect(ctx.status).toBe(200);
        expect(ctx.body).toEqual({
          received: true,
          processed: false,
          reason: "No client ID in metadata",
        });
      });

      it("should extract clientId from event metadata", async () => {
        const eventPayload = JSON.stringify({
          id: "evt_test",
          type: "customer.created",
          data: {
            object: {
              id: "cus_test",
              metadata: {
                clientId: "testClient",
                userId: "user-123",
              },
            },
          },
        });

        // Mock constructEvent to return the parsed event
        const mockStripe = {
          webhooks: {
            constructEvent: jest.fn().mockReturnValue({
              id: "evt_test",
              type: "customer.created",
              data: {
                object: {
                  id: "cus_test",
                  metadata: {
                    clientId: "testClient",
                    userId: "user-123",
                  },
                },
                previous_attributes: {},
              },
            }),
          },
        };

        (StripeService as jest.Mock).mockImplementation(() => ({
          handleCustomerEvent: jest.fn().mockResolvedValue(undefined),
          handleCheckoutSessionCompleted: jest
            .fn()
            .mockResolvedValue(undefined),
          getStripeInstance: jest.fn().mockReturnValue(mockStripe),
        }));

        const ctx = createMockContext({
          request: {
            headers: { "stripe-signature": "sig_test" },
            rawBody: eventPayload,
          } as unknown as Router.RouterContext["request"],
        });

        await postHandler(ctx, jest.fn());

        expect(ctx.status).toBe(200);
        expect(ctx.body).toEqual({ received: true, processed: true });
      });
    });

    describe("webhook configuration", () => {
      it("should return 400 when client has no webhook secret configured", async () => {
        const eventPayload = JSON.stringify({
          id: "evt_test",
          type: "customer.created",
          data: {
            object: {
              id: "cus_test",
              metadata: {
                clientId: "unknownClient",
              },
            },
          },
        });

        const ctx = createMockContext({
          request: {
            headers: { "stripe-signature": "sig_test" },
            rawBody: eventPayload,
          } as unknown as Router.RouterContext["request"],
        });

        await postHandler(ctx, jest.fn());

        expect(ctx.status).toBe(400);
        expect(ctx.body).toEqual({
          error: "Invalid client configuration for unknownClient",
        });
      });
    });

    describe("event handling", () => {
      const setupValidEvent = (
        eventType: string,
        eventData: Record<string, unknown>,
      ) => {
        const eventPayload = JSON.stringify({
          id: "evt_test",
          type: eventType,
          data: {
            object: {
              id: "obj_test",
              metadata: {
                clientId: "testClient",
                userId: "user-123",
              },
              ...eventData,
            },
          },
        });

        // Setup mock to return event
        const mockStripe = {
          webhooks: {
            constructEvent: jest.fn().mockReturnValue({
              id: "evt_test",
              type: eventType,
              data: {
                object: {
                  id: "obj_test",
                  metadata: {
                    clientId: "testClient",
                    userId: "user-123",
                  },
                  ...eventData,
                },
                previous_attributes: {},
              },
            }),
          },
        };

        const mockHandleCustomerEvent = jest.fn().mockResolvedValue(undefined);
        const mockHandleCheckout = jest.fn().mockResolvedValue(undefined);

        (StripeService as jest.Mock).mockImplementation(() => ({
          handleCustomerEvent: mockHandleCustomerEvent,
          handleCheckoutSessionCompleted: mockHandleCheckout,
          getStripeInstance: jest.fn().mockReturnValue(mockStripe),
        }));

        const ctx = createMockContext({
          request: {
            headers: { "stripe-signature": "sig_test" },
            rawBody: eventPayload,
          } as unknown as Router.RouterContext["request"],
        });

        return {
          ctx,
          mocks: {
            handleCustomerEvent: mockHandleCustomerEvent,
            handleCheckoutSessionCompleted: mockHandleCheckout,
          },
        };
      };

      it("should handle customer.created event", async () => {
        const { ctx, mocks } = setupValidEvent("customer.created", {
          email: "test@example.com",
        });

        await postHandler(ctx, jest.fn());

        expect(mocks.handleCustomerEvent).toHaveBeenCalledWith(
          expect.objectContaining({ id: "obj_test" }),
          "created",
          {},
          "testClient",
          "user-123",
        );
        expect(ctx.status).toBe(200);
      });

      it("should handle customer.updated event", async () => {
        const { ctx, mocks } = setupValidEvent("customer.updated", {
          email: "updated@example.com",
        });

        await postHandler(ctx, jest.fn());

        expect(mocks.handleCustomerEvent).toHaveBeenCalledWith(
          expect.objectContaining({ id: "obj_test" }),
          "updated",
          {},
          "testClient",
          "user-123",
        );
        expect(ctx.status).toBe(200);
      });

      it("should handle checkout.session.completed event", async () => {
        const { ctx, mocks } = setupValidEvent("checkout.session.completed", {
          payment_status: "paid",
        });

        await postHandler(ctx, jest.fn());

        expect(mocks.handleCheckoutSessionCompleted).toHaveBeenCalledWith(
          expect.objectContaining({ id: "obj_test" }),
          "testClient",
          "user-123",
        );
        expect(ctx.status).toBe(200);
      });

      it("should handle unknown event types gracefully", async () => {
        const { ctx } = setupValidEvent("some.unknown.event", {});
        const { logger } = jest.requireMock("@/shared/logger");

        await postHandler(ctx, jest.fn());

        expect(logger.debug).toHaveBeenCalledWith(
          "Unhandled event type received",
          expect.objectContaining({ eventType: "some.unknown.event" }),
        );
        expect(ctx.status).toBe(200);
      });
    });

    describe("error handling", () => {
      it("should return 400 when webhook signature verification fails", async () => {
        const eventPayload = JSON.stringify({
          id: "evt_test",
          type: "customer.created",
          data: {
            object: {
              id: "cus_test",
              metadata: {
                clientId: "testClient",
              },
            },
          },
        });

        // Setup mock to throw on constructEvent
        const mockStripe = {
          webhooks: {
            constructEvent: jest.fn().mockImplementation(() => {
              throw new Error("Signature verification failed");
            }),
          },
        };

        (StripeService as jest.Mock).mockImplementation(() => ({
          handleCustomerEvent: jest.fn().mockResolvedValue(undefined),
          handleCheckoutSessionCompleted: jest
            .fn()
            .mockResolvedValue(undefined),
          getStripeInstance: jest.fn().mockReturnValue(mockStripe),
        }));

        const ctx = createMockContext({
          request: {
            headers: { "stripe-signature": "sig_test" },
            rawBody: eventPayload,
          } as unknown as Router.RouterContext["request"],
        });

        await postHandler(ctx, jest.fn());

        expect(ctx.status).toBe(400);
        expect(ctx.body).toEqual({
          error: "Webhook Error: Signature verification failed",
        });
      });

      it("should handle event processing errors", async () => {
        const eventPayload = JSON.stringify({
          id: "evt_test",
          type: "customer.created",
          data: {
            object: {
              id: "cus_test",
              metadata: {
                clientId: "testClient",
                userId: "user-123",
              },
            },
          },
        });

        // Setup mock to return event and throw on handleCustomerEvent
        const mockStripe = {
          webhooks: {
            constructEvent: jest.fn().mockReturnValue({
              id: "evt_test",
              type: "customer.created",
              data: {
                object: {
                  id: "cus_test",
                  metadata: {
                    clientId: "testClient",
                    userId: "user-123",
                  },
                },
                previous_attributes: {},
              },
            }),
          },
        };

        (StripeService as jest.Mock).mockImplementation(() => ({
          handleCustomerEvent: jest
            .fn()
            .mockRejectedValue(new Error("Database error")),
          handleCheckoutSessionCompleted: jest
            .fn()
            .mockResolvedValue(undefined),
          getStripeInstance: jest.fn().mockReturnValue(mockStripe),
        }));

        const ctx = createMockContext({
          request: {
            headers: { "stripe-signature": "sig_test" },
            rawBody: eventPayload,
          } as unknown as Router.RouterContext["request"],
        });

        await postHandler(ctx, jest.fn());

        expect(ctx.status).toBe(400);
        expect(ctx.body).toEqual({
          error: "Webhook Error: Database error",
        });
      });

      it("should handle non-Error exceptions", async () => {
        const eventPayload = JSON.stringify({
          id: "evt_test",
          type: "customer.created",
          data: {
            object: {
              id: "cus_test",
              metadata: {
                clientId: "testClient",
              },
            },
          },
        });

        // Setup mock to throw non-Error
        const mockStripe = {
          webhooks: {
            constructEvent: jest.fn().mockImplementation(() => {
              throw "String error";
            }),
          },
        };

        (StripeService as jest.Mock).mockImplementation(() => ({
          handleCustomerEvent: jest.fn().mockResolvedValue(undefined),
          handleCheckoutSessionCompleted: jest
            .fn()
            .mockResolvedValue(undefined),
          getStripeInstance: jest.fn().mockReturnValue(mockStripe),
        }));

        const ctx = createMockContext({
          request: {
            headers: { "stripe-signature": "sig_test" },
            rawBody: eventPayload,
          } as unknown as Router.RouterContext["request"],
        });

        await postHandler(ctx, jest.fn());

        expect(ctx.status).toBe(400);
        expect(ctx.body).toEqual({
          error: "Webhook Error: Unknown error",
        });
      });
    });

    describe("userId extraction", () => {
      it("should extract userId from event metadata", async () => {
        const eventPayload = JSON.stringify({
          id: "evt_test",
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test",
              metadata: {
                clientId: "testClient",
                userId: "specific-user-id",
              },
            },
          },
        });

        // Setup mock to return event
        const mockStripe = {
          webhooks: {
            constructEvent: jest.fn().mockReturnValue({
              id: "evt_test",
              type: "checkout.session.completed",
              data: {
                object: {
                  id: "cs_test",
                  metadata: {
                    clientId: "testClient",
                    userId: "specific-user-id",
                  },
                },
              },
            }),
          },
        };

        const mockHandleCheckout = jest.fn().mockResolvedValue(undefined);
        (StripeService as jest.Mock).mockImplementation(() => ({
          handleCustomerEvent: jest.fn().mockResolvedValue(undefined),
          handleCheckoutSessionCompleted: mockHandleCheckout,
          getStripeInstance: jest.fn().mockReturnValue(mockStripe),
        }));

        const ctx = createMockContext({
          request: {
            headers: { "stripe-signature": "sig_test" },
            rawBody: eventPayload,
          } as unknown as Router.RouterContext["request"],
        });

        await postHandler(ctx, jest.fn());

        expect(mockHandleCheckout).toHaveBeenCalledWith(
          expect.anything(),
          "testClient",
          "specific-user-id",
        );
      });

      it("should use 'unknown' when userId is not in metadata", async () => {
        const eventPayload = JSON.stringify({
          id: "evt_test",
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test",
              metadata: {
                clientId: "testClient",
              },
            },
          },
        });

        // Setup mock to return event without userId
        const mockStripe = {
          webhooks: {
            constructEvent: jest.fn().mockReturnValue({
              id: "evt_test",
              type: "checkout.session.completed",
              data: {
                object: {
                  id: "cs_test",
                  metadata: {
                    clientId: "testClient",
                  },
                },
              },
            }),
          },
        };

        const mockHandleCheckout = jest.fn().mockResolvedValue(undefined);
        (StripeService as jest.Mock).mockImplementation(() => ({
          handleCustomerEvent: jest.fn().mockResolvedValue(undefined),
          handleCheckoutSessionCompleted: mockHandleCheckout,
          getStripeInstance: jest.fn().mockReturnValue(mockStripe),
        }));

        const ctx = createMockContext({
          request: {
            headers: { "stripe-signature": "sig_test" },
            rawBody: eventPayload,
          } as unknown as Router.RouterContext["request"],
        });

        await postHandler(ctx, jest.fn());

        expect(mockHandleCheckout).toHaveBeenCalledWith(
          expect.anything(),
          "testClient",
          "unknown",
        );
      });
    });
  });
});
