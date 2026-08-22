import { StripeService } from "./stripe-service";
import type { IPaidCustomerModel } from "@/features/stripe/data/paid-customer-model";
import type { IModels } from "@/foundation/models";
import type Stripe from "stripe";
import { config } from "@/config/config";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// Mock the Stripe module
jest.mock("stripe");

// Mock the config module
jest.mock("@/config/config", () => {
  const originalConfig = {
    stripe: {
      privateKey: "sk_test_fake_key",
      publicKey: "pk_test_fake_key",
      webhookSecret: "whsec_test_fake",
      dev: {
        privateKey: "sk_test_dev_fake_key",
        publicKey: "pk_test_dev_fake_key",
        webhookSecret: "whsec_test_dev_fake",
      },
    },
    env: "test",
  };

  return {
    config: originalConfig,
    __esModule: true,
  };
});

describe("StripeService", () => {
  let stripeUseCase: StripeService;
  let mockIPaidCustomerModel: jest.Mocked<IPaidCustomerModel>;
  let mockModels: jest.Mocked<Pick<IModels, "paidCustomer">>;
  let mockPostgresDb: NodePgDatabase;
  let mockStripeSubscriptions: {
    retrieve: jest.Mock;
    cancel: jest.Mock;
    update: jest.Mock;
    list: jest.Mock;
  };
  let mockStripeCustomers: {
    retrieve: jest.Mock;
  };
  let mockStripeInstance: unknown;

  beforeEach(() => {
    // Create mock paid customer model
    mockIPaidCustomerModel = {
      findByUserIdAndClientId: jest.fn(),
      findByStripeCustomerIdAndClientId: jest.fn(),
      create: jest.fn(),
      updateCustomerById: jest.fn(),
      // Deprecated methods (for backward compatibility if needed)
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    } as unknown as jest.Mocked<IPaidCustomerModel>;

    // Create mock models container — StripeService only touches paidCustomer
    mockModels = {
      paidCustomer: mockIPaidCustomerModel,
    };

    // Create mock PostgresDb
    mockPostgresDb = {} as NodePgDatabase;

    // Create mock Stripe methods
    mockStripeSubscriptions = {
      retrieve: jest.fn(),
      cancel: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
    };

    mockStripeCustomers = {
      retrieve: jest.fn(),
    };

    mockStripeInstance = {
      subscriptions: mockStripeSubscriptions,
      customers: mockStripeCustomers,
    };

    stripeUseCase = new StripeService(mockModels, mockPostgresDb);
  });

  describe("getStripeInstance", () => {
    it("should throw error when clientId is not provided", () => {
      expect(() => stripeUseCase.getStripeInstance("")).toThrow(
        "Client ID is required to get a Stripe instance",
      );
    });

    it("should return cached instance for same clientId", () => {
      // Config is mocked with a fallback key
      const clientId = "test-client";
      const instance1 = stripeUseCase.getStripeInstance(clientId);
      const instance2 = stripeUseCase.getStripeInstance(clientId);

      expect(instance1).toBe(instance2);
    });

    it("should throw error when no API key is available", () => {
      // Temporarily override the stripe config to have no key
      const originalPrivateKey = config.stripe.privateKey;
      config.stripe.privateKey = "";

      const clientId = "unknown-client-without-config";

      expect(() => stripeUseCase.getStripeInstance(clientId)).toThrow(
        /No Stripe API key found/,
      );

      // Restore original value
      config.stripe.privateKey = originalPrivateKey;
    });
  });

  describe("cancelSubscription", () => {
    const subscriptionId = "sub_123";
    const userId = "user_123";
    const clientId = "client_123";

    beforeEach(() => {
      // Mock getStripeInstance to return our mock
      stripeUseCase.getStripeInstance = jest
        .fn()
        .mockReturnValue(mockStripeInstance);
    });

    it("should successfully schedule cancellation at period end", async () => {
      const mockCustomer = {
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: "cus_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );
      mockStripeSubscriptions.retrieve.mockResolvedValue({
        id: subscriptionId,
      } as Stripe.Subscription);
      mockStripeSubscriptions.update.mockResolvedValue({
        id: subscriptionId,
        cancel_at_period_end: true,
      } as Stripe.Subscription);

      const result = await stripeUseCase.cancelSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("canceled successfully");
      expect(result.message).toContain("end of the current billing period");
      expect(mockStripeSubscriptions.update).toHaveBeenCalledWith(
        subscriptionId,
        { cancel_at_period_end: true },
      );
      expect(mockStripeSubscriptions.cancel).not.toHaveBeenCalled();
    });

    it("should return error when customer is not authorized", async () => {
      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(null);

      const result = await stripeUseCase.cancelSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("not authorized");
      expect(mockStripeSubscriptions.update).not.toHaveBeenCalled();
    });

    it("should return error when customer has no Stripe customer ID", async () => {
      const mockCustomer = {
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );

      const result = await stripeUseCase.cancelSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("not authorized");
    });

    it("should handle subscription not found error", async () => {
      const mockCustomer = {
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: "cus_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );

      const error = new Error("No such subscription: sub_123");
      Object.assign(error, { name: "StripeInvalidRequestError" });
      mockStripeSubscriptions.retrieve.mockRejectedValue(error);

      const result = await stripeUseCase.cancelSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Subscription not found");
    });

    it("should handle general errors gracefully", async () => {
      const mockCustomer = {
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: "cus_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );
      mockStripeSubscriptions.retrieve.mockResolvedValue({
        id: subscriptionId,
      } as Stripe.Subscription);
      mockStripeSubscriptions.update.mockRejectedValue(
        new Error("Network error"),
      );

      const result = await stripeUseCase.cancelSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("error occurred");
    });
  });

  describe("deleteSubscription", () => {
    const subscriptionId = "sub_123";
    const userId = "user_123";
    const clientId = "client_123";

    beforeEach(() => {
      // Mock getStripeInstance to return our mock
      stripeUseCase.getStripeInstance = jest
        .fn()
        .mockReturnValue(mockStripeInstance);
    });

    it("should successfully delete a subscription immediately", async () => {
      const mockCustomer = {
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: "cus_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );
      mockStripeSubscriptions.retrieve.mockResolvedValue({
        id: subscriptionId,
      } as Stripe.Subscription);
      mockStripeSubscriptions.cancel.mockResolvedValue({
        id: subscriptionId,
      } as Stripe.Subscription);

      const result = await stripeUseCase.deleteSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("deleted successfully");
      expect(mockStripeSubscriptions.cancel).toHaveBeenCalledWith(
        subscriptionId,
      );
      expect(mockStripeSubscriptions.update).not.toHaveBeenCalled();
    });

    it("should return error when customer is not authorized", async () => {
      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(null);

      const result = await stripeUseCase.deleteSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("not authorized");
      expect(mockStripeSubscriptions.cancel).not.toHaveBeenCalled();
    });

    it("should return error when customer has no Stripe customer ID", async () => {
      const mockCustomer = {
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );

      const result = await stripeUseCase.deleteSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("not authorized");
    });

    it("should handle subscription not found error", async () => {
      const mockCustomer = {
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: "cus_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );

      const error = new Error("No such subscription: sub_123");
      Object.assign(error, { name: "StripeInvalidRequestError" });
      mockStripeSubscriptions.retrieve.mockRejectedValue(error);

      const result = await stripeUseCase.deleteSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Subscription not found");
    });

    it("should handle general errors gracefully", async () => {
      const mockCustomer = {
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: "cus_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );
      mockStripeSubscriptions.retrieve.mockResolvedValue({
        id: subscriptionId,
      } as Stripe.Subscription);
      mockStripeSubscriptions.cancel.mockRejectedValue(
        new Error("Network error"),
      );

      const result = await stripeUseCase.deleteSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("error occurred");
    });
  });

  describe("resumeSubscription", () => {
    const subscriptionId = "sub_123";
    const userId = "user_123";
    const clientId = "client_123";

    beforeEach(() => {
      // Mock getStripeInstance to return our mock
      stripeUseCase.getStripeInstance = jest
        .fn()
        .mockReturnValue(mockStripeInstance);
    });

    it("should successfully resume a subscription", async () => {
      const mockCustomer = {
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: "cus_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );
      mockStripeSubscriptions.retrieve.mockResolvedValue({
        id: subscriptionId,
      } as Stripe.Subscription);
      mockStripeSubscriptions.update.mockResolvedValue({
        id: subscriptionId,
        cancel_at_period_end: false,
      } as Stripe.Subscription);

      const result = await stripeUseCase.resumeSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("resumed successfully");
      expect(mockStripeSubscriptions.update).toHaveBeenCalledWith(
        subscriptionId,
        { cancel_at_period_end: false },
      );
    });

    it("should return error when customer is not authorized", async () => {
      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(null);

      const result = await stripeUseCase.resumeSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("not authorized");
      expect(mockStripeSubscriptions.update).not.toHaveBeenCalled();
    });

    it("should return error when customer has no Stripe customer ID", async () => {
      const mockCustomer = {
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );

      const result = await stripeUseCase.resumeSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("not authorized");
    });

    it("should handle subscription not found error", async () => {
      const mockCustomer = {
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: "cus_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );

      const error = new Error("No such subscription: sub_123");
      Object.assign(error, { name: "StripeInvalidRequestError" });
      mockStripeSubscriptions.retrieve.mockRejectedValue(error);

      const result = await stripeUseCase.resumeSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Subscription not found");
    });

    it("should handle general errors gracefully", async () => {
      const mockCustomer = {
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: "cus_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );
      mockStripeSubscriptions.retrieve.mockResolvedValue({
        id: subscriptionId,
      } as Stripe.Subscription);
      mockStripeSubscriptions.update.mockRejectedValue(
        new Error("Network error"),
      );

      const result = await stripeUseCase.resumeSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("error occurred");
    });
  });

  describe("listSubscriptions", () => {
    const userId = "user_123";

    beforeEach(() => {
      stripeUseCase.getStripeInstance = jest
        .fn()
        .mockReturnValue(mockStripeInstance);
    });

    it("should return empty array when no customers exist", async () => {
      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(null);

      const result = await stripeUseCase.listSubscriptions(userId);

      expect(result).toEqual([]);
    });

    it("should list subscriptions for a customer", async () => {
      const mockCustomer = {
        userId,
        clientId: "beancount_io",
        stripeCustomerId: "cus_123",
      };

      const mockSubscriptions = {
        data: [
          { id: "sub_1", status: "active" },
          { id: "sub_2", status: "canceled" },
        ],
      };

      // Return customer for all queries in this test
      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );

      mockStripeSubscriptions.list.mockResolvedValue(
        mockSubscriptions as unknown as Stripe.ApiList<Stripe.Subscription>,
      );

      const result = await stripeUseCase.listSubscriptions(userId);

      // Should have subscriptions (multiple clients in SUBSCRIPTION_CONFIG)
      expect(result.length).toBeGreaterThanOrEqual(2);
      // All subscriptions should have clientId attached
      expect(result.every((sub) => typeof sub.clientId === "string")).toBe(
        true,
      );
    });

    it("should handle errors when listing subscriptions for a client", async () => {
      const mockCustomer = {
        userId,
        clientId: "beancount_io",
        stripeCustomerId: "cus_123",
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );
      mockStripeSubscriptions.list.mockRejectedValue(new Error("API error"));

      const result = await stripeUseCase.listSubscriptions(userId);

      // Should return empty array on error for individual client
      expect(result).toEqual([]);
    });

    it("should return empty array on general error", async () => {
      mockIPaidCustomerModel.findByUserIdAndClientId.mockRejectedValue(
        new Error("Database error"),
      );

      const result = await stripeUseCase.listSubscriptions(userId);

      expect(result).toEqual([]);
    });
  });

  describe("handleCustomerEvent", () => {
    const clientId = "test_client";
    const userId = "user_123";
    const customerId = "cus_123";

    beforeEach(() => {
      stripeUseCase.getStripeInstance = jest
        .fn()
        .mockReturnValue(mockStripeInstance);
    });

    it("should create a new customer when not found", async () => {
      const mockCustomer = {
        id: customerId,
        email: "test@example.com",
        metadata: { clientId },
      } as unknown as Stripe.Customer;

      mockIPaidCustomerModel.findByStripeCustomerIdAndClientId.mockResolvedValue(
        null,
      );
      mockIPaidCustomerModel.create.mockResolvedValue({
        userId,
        stripeCustomerId: customerId,
        clientId,
        email: "test@example.com",
      } as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.create>
      >);

      await stripeUseCase.handleCustomerEvent(
        mockCustomer,
        "created",
        {},
        clientId,
        userId,
      );

      expect(mockIPaidCustomerModel.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userId,
          stripeCustomerId: customerId,
          clientId,
          email: "test@example.com",
        }),
      );
    });

    it("should update customer email when changed", async () => {
      const mockCustomer = {
        id: customerId,
        email: "newemail@example.com",
        metadata: { clientId },
      } as unknown as Stripe.Customer;

      const existingCustomer = {
        id: "doc_id",
        userId,
        stripeCustomerId: customerId,
        clientId,
        email: "oldemail@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByStripeCustomerIdAndClientId.mockResolvedValue(
        existingCustomer as unknown as Awaited<
          ReturnType<
            typeof mockIPaidCustomerModel.findByStripeCustomerIdAndClientId
          >
        >,
      );
      mockIPaidCustomerModel.updateCustomerById.mockResolvedValue(
        existingCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.updateCustomerById>
        >,
      );

      await stripeUseCase.handleCustomerEvent(
        mockCustomer,
        "updated",
        { email: "oldemail@example.com" },
        clientId,
        userId,
      );

      expect(mockIPaidCustomerModel.updateCustomerById).toHaveBeenCalledWith(
        expect.any(Object),
        "doc_id",
        expect.objectContaining({
          email: "newemail@example.com",
        }),
      );
    });

    it("should not update when no changes detected", async () => {
      const mockCustomer = {
        id: customerId,
        email: "test@example.com",
        metadata: { clientId },
      } as unknown as Stripe.Customer;

      const existingCustomer = {
        id: "doc_id",
        userId,
        stripeCustomerId: customerId,
        clientId,
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByStripeCustomerIdAndClientId.mockResolvedValue(
        existingCustomer as unknown as Awaited<
          ReturnType<
            typeof mockIPaidCustomerModel.findByStripeCustomerIdAndClientId
          >
        >,
      );

      await stripeUseCase.handleCustomerEvent(
        mockCustomer,
        "updated",
        {},
        clientId,
        userId,
      );

      expect(mockIPaidCustomerModel.updateCustomerById).not.toHaveBeenCalled();
    });

    it("should use clientId from metadata when available", async () => {
      const metadataClientId = "metadata_client";
      const mockCustomer = {
        id: customerId,
        email: "test@example.com",
        metadata: { clientId: metadataClientId },
      } as unknown as Stripe.Customer;

      mockIPaidCustomerModel.findByStripeCustomerIdAndClientId.mockResolvedValue(
        null,
      );
      mockIPaidCustomerModel.create.mockResolvedValue({
        userId,
        stripeCustomerId: customerId,
        clientId: metadataClientId,
        email: "test@example.com",
      } as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.create>
      >);

      await stripeUseCase.handleCustomerEvent(
        mockCustomer,
        "created",
        {},
        clientId,
        userId,
      );

      expect(mockIPaidCustomerModel.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          clientId: metadataClientId,
        }),
      );
    });

    it("should throw error when no clientId available", async () => {
      const mockCustomer = {
        id: customerId,
        email: "test@example.com",
        metadata: {},
      } as unknown as Stripe.Customer;

      await expect(
        stripeUseCase.handleCustomerEvent(
          mockCustomer,
          "created",
          {},
          "", // Empty clientId
          userId,
        ),
      ).rejects.toThrow("No client ID available for customer");
    });
  });

  describe("handleCheckoutSessionCompleted", () => {
    const clientId = "test_client";
    const userId = "user_123";
    const customerId = "cus_123";

    beforeEach(() => {
      stripeUseCase.getStripeInstance = jest
        .fn()
        .mockReturnValue(mockStripeInstance);
    });

    it("should process checkout session with valid customer", async () => {
      const mockSession: Stripe.Checkout.Session = {
        customer: customerId,
      } as Stripe.Checkout.Session;

      const mockCustomer = {
        id: customerId,
        email: "test@example.com",
        deleted: false,
        metadata: { clientId },
      } as unknown as Stripe.Customer;

      mockStripeCustomers.retrieve.mockResolvedValue(mockCustomer);
      mockIPaidCustomerModel.findByStripeCustomerIdAndClientId.mockResolvedValue(
        null,
      );
      mockIPaidCustomerModel.create.mockResolvedValue({
        userId,
        stripeCustomerId: customerId,
        clientId,
      } as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.create>
      >);

      await stripeUseCase.handleCheckoutSessionCompleted(
        mockSession,
        clientId,
        userId,
      );

      expect(mockStripeCustomers.retrieve).toHaveBeenCalledWith(customerId);
      expect(mockIPaidCustomerModel.create).toHaveBeenCalled();
    });

    it("should handle missing customer ID in session", async () => {
      const mockSession: Stripe.Checkout.Session = {
        customer: null,
      } as unknown as Stripe.Checkout.Session;

      await stripeUseCase.handleCheckoutSessionCompleted(
        mockSession,
        clientId,
        userId,
      );

      expect(mockStripeCustomers.retrieve).not.toHaveBeenCalled();
    });

    it("should handle deleted customer", async () => {
      const mockSession: Stripe.Checkout.Session = {
        customer: customerId,
      } as Stripe.Checkout.Session;

      const mockCustomer = {
        id: customerId,
        deleted: true,
      } as Stripe.DeletedCustomer;

      mockStripeCustomers.retrieve.mockResolvedValue(mockCustomer);

      await stripeUseCase.handleCheckoutSessionCompleted(
        mockSession,
        clientId,
        userId,
      );

      expect(mockIPaidCustomerModel.create).not.toHaveBeenCalled();
    });

    it("should handle errors in customer retrieval", async () => {
      const mockSession: Stripe.Checkout.Session = {
        customer: customerId,
      } as Stripe.Checkout.Session;

      mockStripeCustomers.retrieve.mockRejectedValue(new Error("API error"));

      // Should not throw
      await expect(
        stripeUseCase.handleCheckoutSessionCompleted(
          mockSession,
          clientId,
          userId,
        ),
      ).resolves.toBeUndefined();
    });

    it("should handle errors in onCheckoutSessionCompleted hook", async () => {
      // Create a subclass that overrides onCheckoutSessionCompleted to throw
      class TestStripeService extends StripeService {
        protected async onCheckoutSessionCompleted(): Promise<void> {
          throw new Error("Hook error");
        }
      }

      const testUseCase = new TestStripeService(mockModels, mockPostgresDb);
      testUseCase.getStripeInstance = jest
        .fn()
        .mockReturnValue(mockStripeInstance);

      const mockSession: Stripe.Checkout.Session = {
        customer: customerId,
      } as Stripe.Checkout.Session;

      const mockCustomer = {
        id: customerId,
        email: "test@example.com",
        deleted: false,
        metadata: { clientId },
      } as unknown as Stripe.Customer;

      mockStripeCustomers.retrieve.mockResolvedValue(mockCustomer);
      mockIPaidCustomerModel.findByStripeCustomerIdAndClientId.mockResolvedValue(
        null,
      );
      mockIPaidCustomerModel.create.mockResolvedValue({
        userId,
        stripeCustomerId: customerId,
        clientId,
      } as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.create>
      >);

      // Should not throw even when hook throws
      await expect(
        testUseCase.handleCheckoutSessionCompleted(
          mockSession,
          clientId,
          userId,
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe("handleCustomerEvent error handling", () => {
    const userId = "user_123";
    const clientId = "test_client";
    const customerId = "cus_123";

    it("should rethrow errors from database operations", async () => {
      const mockCustomer = {
        id: customerId,
        email: "test@example.com",
        metadata: { clientId },
      } as unknown as Stripe.Customer;

      mockIPaidCustomerModel.findByStripeCustomerIdAndClientId.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        stripeUseCase.handleCustomerEvent(
          mockCustomer,
          "created",
          {},
          clientId,
          userId,
        ),
      ).rejects.toThrow("Database error");
    });

    it("should update customer when clientId changes", async () => {
      const mockCustomer = {
        id: customerId,
        email: "test@example.com",
        metadata: { clientId: "new_client_id" },
      } as unknown as Stripe.Customer;

      const existingCustomer = {
        id: "doc_id",
        userId,
        stripeCustomerId: customerId,
        clientId: "old_client_id",
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIPaidCustomerModel.findByStripeCustomerIdAndClientId.mockResolvedValue(
        existingCustomer as unknown as Awaited<
          ReturnType<
            typeof mockIPaidCustomerModel.findByStripeCustomerIdAndClientId
          >
        >,
      );
      mockIPaidCustomerModel.updateCustomerById.mockResolvedValue(
        existingCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.updateCustomerById>
        >,
      );

      await stripeUseCase.handleCustomerEvent(
        mockCustomer,
        "updated",
        {},
        "old_client_id",
        userId,
      );

      expect(mockIPaidCustomerModel.updateCustomerById).toHaveBeenCalledWith(
        expect.any(Object),
        "doc_id",
        expect.objectContaining({
          clientId: "new_client_id",
        }),
      );
    });
  });

  describe("createCustomerPortalSession", () => {
    const userId = "user_123";
    const clientId = "beancount-web-prod";
    let mockStripeBillingPortal: {
      sessions: {
        create: jest.Mock;
      };
    };

    beforeEach(() => {
      mockStripeBillingPortal = {
        sessions: {
          create: jest.fn(),
        },
      };

      const mockStripe = {
        subscriptions: mockStripeSubscriptions,
        customers: mockStripeCustomers,
        billingPortal: mockStripeBillingPortal,
      };

      stripeUseCase.getStripeInstance = jest.fn().mockReturnValue(mockStripe);
    });

    it("should return error for invalid clientId", async () => {
      const result = await stripeUseCase.createCustomerPortalSession(
        userId,
        "invalid-client",
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid client ID");
    });

    it("should return error when customer not found", async () => {
      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(null);

      const result = await stripeUseCase.createCustomerPortalSession(
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain(
        "could not find an active Stripe customer",
      );
    });

    it("should return error when customer has no stripeCustomerId", async () => {
      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue({
        userId,
        clientId,
        stripeCustomerId: null,
      } as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
      >);

      const result = await stripeUseCase.createCustomerPortalSession(
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain(
        "could not find an active Stripe customer",
      );
    });

    it("should successfully create portal session", async () => {
      const mockCustomer = {
        userId,
        clientId,
        stripeCustomerId: "cus_123",
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );
      mockStripeBillingPortal.sessions.create.mockResolvedValue({
        id: "session_123",
        url: "https://billing.stripe.com/session/123",
      });

      const result = await stripeUseCase.createCustomerPortalSession(
        userId,
        clientId,
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("session_123");
      expect(result.sessionUrl).toBe("https://billing.stripe.com/session/123");
      expect(mockStripeBillingPortal.sessions.create).toHaveBeenCalledWith({
        customer: "cus_123",
        return_url: expect.any(String),
      });
    });

    it("should handle portal session with null url", async () => {
      const mockCustomer = {
        userId,
        clientId,
        stripeCustomerId: "cus_123",
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );
      mockStripeBillingPortal.sessions.create.mockResolvedValue({
        id: "session_123",
        url: null,
      });

      const result = await stripeUseCase.createCustomerPortalSession(
        userId,
        clientId,
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("session_123");
      expect(result.sessionUrl).toBeUndefined();
    });

    it("should handle Stripe API error", async () => {
      const mockCustomer = {
        userId,
        clientId,
        stripeCustomerId: "cus_123",
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );
      mockStripeBillingPortal.sessions.create.mockRejectedValue(
        new Error("Stripe API error"),
      );

      const result = await stripeUseCase.createCustomerPortalSession(
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("unable to open the billing portal");
    });
  });

  describe("getStripeInstance with configured client", () => {
    it("should create instance with client stripePriKey when configured", () => {
      // For a configured client like "beancount-web-prod", getStripeInstance
      // should use the stripePriKey from config
      // The config is mocked to provide valid keys

      // Create a fresh instance without any cached Stripe objects
      const freshStripeService = new StripeService(mockModels, mockPostgresDb);

      // Get instance for beancount-web-prod which has stripePriKey from mocked config
      const instance =
        freshStripeService.getStripeInstance("beancount-web-prod");
      expect(instance).toBeDefined();

      // Get it again - should return cached instance
      const instance2 =
        freshStripeService.getStripeInstance("beancount-web-prod");
      expect(instance).toBe(instance2);
    });
  });
});
