import { SUBSCRIPTION_PERIOD_VERIFICATION_VERSION } from "./subscription-plan";
import { StripeService } from "./stripe-service";
import type { IPaidCustomerModel } from "@/features/stripe/data/paid-customer-model";
import type { PaidCustomer } from "@/features/stripe/data/paid-customer-model/types";
import type { IStoreSubscriptionModel } from "@/features/store-billing/data/store-subscription-model";
import type { IModels } from "@/foundation/models";
import type Stripe from "stripe";
import { BILLING_CLIENT_ID, SUBSCRIPTION_CONFIG } from "./stripe";
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
  let mockModels: jest.Mocked<
    Pick<IModels, "paidCustomer" | "storeSubscription">
  >;
  const findStoreSubscriptions = jest.fn();
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
  let mockStripeSchedules: { retrieve: jest.Mock; release: jest.Mock };
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

    // Create mock models container
    mockModels = {
      paidCustomer: mockIPaidCustomerModel,
      storeSubscription: {
        findByUserId: findStoreSubscriptions,
      } as unknown as jest.Mocked<IStoreSubscriptionModel>,
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

    mockStripeSchedules = {
      retrieve: jest.fn(async () => ({ id: "sub_sched_1", status: "active" })),
      release: jest.fn(async () => ({ id: "sub_sched_1", status: "released" })),
    };

    mockStripeInstance = {
      subscriptions: mockStripeSubscriptions,
      customers: mockStripeCustomers,
      subscriptionSchedules: mockStripeSchedules,
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
      const clientId = BILLING_CLIENT_ID;
      const instance1 = stripeUseCase.getStripeInstance(clientId);
      const instance2 = stripeUseCase.getStripeInstance(clientId);

      expect(instance1).toBe(instance2);
    });

    it("should throw error when no API key is available", () => {
      const plan = SUBSCRIPTION_CONFIG[BILLING_CLIENT_ID];
      const key = plan.stripePriKey;
      plan.stripePriKey = "";
      try {
        expect(() =>
          stripeUseCase.getStripeInstance(BILLING_CLIENT_ID),
        ).toThrow(/No Stripe API key found/);
      } finally {
        plan.stripePriKey = key;
      }
      expect(() =>
        stripeUseCase.getStripeInstance("beancount-web-dev"),
      ).toThrow(/Invalid Stripe client ID/);
    });
  });

  describe("cancelSubscription", () => {
    const subscriptionId = "sub_123";
    const userId = "user_123";
    const clientId = BILLING_CLIENT_ID;

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
        customer: "cus_123",
        livemode: true,
      } as Stripe.Subscription);
      mockStripeSubscriptions.update.mockResolvedValue({
        id: subscriptionId,
        customer: "cus_123",
        livemode: true,
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
        {
          cancel_at_period_end: true,
          cancellation_details: { feedback: "" },
        },
      );
      expect(mockStripeSubscriptions.cancel).not.toHaveBeenCalled();
    });

    it("records the subscriber's reason with Stripe's cancellation details", async () => {
      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue({
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: "cus_123",
      } as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
      >);
      mockStripeSubscriptions.retrieve.mockResolvedValue({
        id: subscriptionId,
        customer: "cus_123",
        livemode: true,
      } as unknown as Stripe.Subscription);
      mockStripeSubscriptions.update.mockResolvedValue({});

      await stripeUseCase.cancelSubscription(
        subscriptionId,
        userId,
        clientId,
        "MISSING_FEATURES",
      );

      expect(mockStripeSubscriptions.update).toHaveBeenCalledWith(
        subscriptionId,
        {
          cancel_at_period_end: true,
          cancellation_details: { feedback: "missing_features" },
        },
      );
    });

    it("releases a pending scheduled change before cancelling, which Stripe would otherwise refuse", async () => {
      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue({
        id: "customer_doc_id",
        userId,
        clientId,
        stripeCustomerId: "cus_123",
      } as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
      >);
      mockStripeSubscriptions.retrieve.mockResolvedValue({
        id: subscriptionId,
        customer: "cus_123",
        livemode: true,
        schedule: "sub_sched_1",
      } as unknown as Stripe.Subscription);
      mockStripeSubscriptions.update.mockResolvedValue({});

      const result = await stripeUseCase.cancelSubscription(
        subscriptionId,
        userId,
        clientId,
      );

      expect(result.success).toBe(true);
      expect(mockStripeSchedules.release).toHaveBeenCalledWith("sub_sched_1");
      expect(
        mockStripeSchedules.release.mock.invocationCallOrder[0],
      ).toBeLessThan(
        mockStripeSubscriptions.update.mock.invocationCallOrder[0],
      );
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
        customer: "cus_123",
        livemode: true,
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

  describe("lastVerifiedTier", () => {
    const future = new Date(Date.now() + 86_400_000);
    const binding = (overrides: Record<string, unknown>) => ({
      id: "pc",
      userId: "user_123",
      clientId: BILLING_CLIENT_ID,
      stripeCustomerId: "cus_123",
      currentPeriodEnd: future,
      periodVerificationVersion: SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
      periodTier: "GROWTH",
      ...overrides,
    });

    beforeEach(() => {
      (
        mockIPaidCustomerModel as unknown as { findByUserId: jest.Mock }
      ).findByUserId = jest.fn();
    });
    const withBindings = (...rows: unknown[]) =>
      (
        mockIPaidCustomerModel as unknown as { findByUserId: jest.Mock }
      ).findByUserId.mockResolvedValue(rows);

    it("returns the tier a current verified period paid for", async () => {
      withBindings(binding({}));
      await expect(stripeUseCase.lastVerifiedTier("user_123")).resolves.toBe(
        "GROWTH",
      );
    });

    it.each([
      ["an expired period", { currentPeriodEnd: new Date(0) }],
      ["an older verification", { periodVerificationVersion: 1 }],
      ["no recorded tier", { periodTier: undefined }],
      ["an unknown tier", { periodTier: "PLATINUM" }],
    ])("trusts nothing with %s", async (_label, overrides) => {
      withBindings(binding(overrides));
      await expect(
        stripeUseCase.lastVerifiedTier("user_123"),
      ).resolves.toBeNull();
    });
  });

  describe("grantedStoreTiers", () => {
    const row = (overrides: Record<string, unknown>) => ({
      userId: "user_123",
      replacedById: null,
      status: "ACTIVE",
      tier: "GROWTH",
      accessEndsAt: new Date(Date.now() + 86_400_000),
      ...overrides,
    });

    it("returns only what the user's rows grant now", async () => {
      findStoreSubscriptions.mockResolvedValue([
        row({}),
        row({ tier: "PREMIUM", status: "GRACE" }),
        row({ tier: "ORGANIZATION", status: "EXPIRED" }),
        row({ tier: "ORGANIZATION", accessEndsAt: new Date(0) }),
      ]);
      await expect(
        stripeUseCase.grantedStoreTiers("user_123"),
      ).resolves.toEqual(["GROWTH", "PREMIUM"]);
      expect(findStoreSubscriptions).toHaveBeenCalledWith(
        expect.anything(),
        "user_123",
      );
    });

    it("returns nothing without store rows", async () => {
      findStoreSubscriptions.mockResolvedValue([]);
      await expect(
        stripeUseCase.grantedStoreTiers("user_123"),
      ).resolves.toEqual([]);
    });
  });

  describe("cancelScheduledPlanChange", () => {
    const userId = "user_123";
    const clientId = BILLING_CLIENT_ID;
    const GROWTH_MONTHLY = "price_1SyPdaEqsEqs2tLViLPUDoVi";
    const PREMIUM_MONTHLY = "price_1RrSOGEqsEqs2tLVFnyB34qG";
    const pending = {
      id: "sub_sched_1",
      status: "active",
      current_phase: { start_date: 1, end_date: 2 },
      phases: [
        { start_date: 1, items: [{ price: GROWTH_MONTHLY }] },
        { start_date: 2, items: [{ price: PREMIUM_MONTHLY }] },
      ],
    };
    const subscriptionOn = (schedule: unknown) => ({
      id: "sub_1",
      customer: "cus_123",
      livemode: true,
      status: "active",
      schedule,
      items: { data: [{ id: "si_1", price: { id: GROWTH_MONTHLY } }] },
    });

    beforeEach(() => {
      stripeUseCase.getStripeInstance = jest
        .fn()
        .mockReturnValue(mockStripeInstance);
      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue({
        userId,
        clientId,
        stripeCustomerId: "cus_123",
      } as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
      >);
    });

    it("releases the schedule and leaves the current plan as it is", async () => {
      mockStripeSubscriptions.list.mockResolvedValue({
        data: [subscriptionOn(pending)],
      });

      const result = await stripeUseCase.cancelScheduledPlanChange(
        userId,
        clientId,
      );

      expect(result.success).toBe(true);
      expect(mockStripeSchedules.release).toHaveBeenCalledWith("sub_sched_1");
      expect(mockStripeSubscriptions.update).not.toHaveBeenCalled();
    });

    it("is a harmless success when nothing is scheduled, so a repeated undo is fine", async () => {
      mockStripeSubscriptions.list.mockResolvedValue({
        data: [subscriptionOn(null)],
      });

      await expect(
        stripeUseCase.cancelScheduledPlanChange(userId, clientId),
      ).resolves.toEqual({
        success: true,
        message: "No plan change is scheduled.",
      });
      expect(mockStripeSchedules.release).not.toHaveBeenCalled();
    });

    it("refuses to guess between two active subscriptions", async () => {
      mockStripeSubscriptions.list.mockResolvedValue({
        data: [
          subscriptionOn(pending),
          { ...subscriptionOn(pending), id: "sub_2" },
        ],
      });

      const result = await stripeUseCase.cancelScheduledPlanChange(
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(mockStripeSchedules.release).not.toHaveBeenCalled();
    });

    it("reports a Stripe failure without throwing", async () => {
      mockStripeSubscriptions.list.mockResolvedValue({
        data: [subscriptionOn(pending)],
      });
      mockStripeSchedules.release.mockRejectedValueOnce(new Error("boom"));

      const result = await stripeUseCase.cancelScheduledPlanChange(
        userId,
        clientId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("try again");
    });
  });

  describe("deleteSubscription", () => {
    const subscriptionId = "sub_123";
    const userId = "user_123";
    const clientId = BILLING_CLIENT_ID;

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
        customer: "cus_123",
        livemode: true,
      } as Stripe.Subscription);
      mockStripeSubscriptions.cancel.mockResolvedValue({
        id: subscriptionId,
        customer: "cus_123",
        livemode: true,
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
        customer: "cus_123",
        livemode: true,
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
    const clientId = BILLING_CLIENT_ID;

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
        customer: "cus_123",
        livemode: true,
      } as Stripe.Subscription);
      mockStripeSubscriptions.update.mockResolvedValue({
        id: subscriptionId,
        customer: "cus_123",
        livemode: true,
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
        {
          cancel_at_period_end: false,
          cancellation_details: { feedback: "" },
        },
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
        customer: "cus_123",
        livemode: true,
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
        clientId: BILLING_CLIENT_ID,
        stripeCustomerId: "cus_123",
      };

      const mockSubscriptions = {
        data: [
          {
            id: "sub_1",
            status: "active",
            livemode: true,
            customer: "cus_123",
          },
          {
            id: "sub_2",
            status: "canceled",
            livemode: true,
            customer: "cus_123",
          },
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

    it("paginates all owned live subscriptions and supports active-only reads", async () => {
      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue({
        userId,
        clientId: BILLING_CLIENT_ID,
        stripeCustomerId: "cus_123",
      } as any);
      mockStripeSubscriptions.list
        .mockResolvedValueOnce({
          has_more: true,
          data: [
            {
              id: "sub_old",
              customer: "cus_123",
              livemode: true,
              status: "canceled",
            },
          ],
        })
        .mockResolvedValueOnce({
          has_more: false,
          data: [
            {
              id: "sub_active",
              customer: "cus_123",
              livemode: true,
              status: "active",
            },
          ],
        });
      expect(
        (await stripeUseCase.listSubscriptions(userId)).map((sub) => sub.id),
      ).toEqual(["sub_old", "sub_active"]);
      expect(mockStripeSubscriptions.list).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ starting_after: "sub_old", status: "all" }),
      );
      mockStripeSubscriptions.list.mockResolvedValue({
        has_more: false,
        data: [],
      });
      await stripeUseCase.listSubscriptions(userId, { status: "active" });
      expect(mockStripeSubscriptions.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "active" }),
      );
    });
    // Stripe's default listing (no `status`) is every subscription that is
    // not canceled, which is how a past-due one reaches the tier check; its
    // grace is read from latest_invoice.next_payment_attempt.
    it.each([
      [
        "a tier lookup",
        { status: "current" },
        undefined,
        ["data.latest_invoice"],
      ],
      [
        "a current read for Billing status",
        { status: "current", expandForStatus: true },
        undefined,
        ["data.schedule", "data.latest_invoice", "data.discounts.source.coupon"],
      ],
      [
        "the full Billing view",
        { status: "all", expandForStatus: true },
        "all",
        ["data.schedule", "data.latest_invoice", "data.discounts.source.coupon"],
      ],
    ] as const)(
      "asks Stripe for %s with the latest invoice a past-due grace needs",
      async (_label, options, status, expand) => {
        const binding = {
          userId,
          clientId: BILLING_CLIENT_ID,
          stripeCustomerId: "cus_123",
        } as unknown as PaidCustomer;
        mockStripeSubscriptions.list.mockResolvedValue({
          has_more: false,
          data: [],
        });

        await stripeUseCase.listSubscriptions(userId, {
          ...options,
          bindings: [binding],
        });

        expect(mockStripeSubscriptions.list).toHaveBeenCalledTimes(1);
        const [params] = mockStripeSubscriptions.list.mock.calls[0];
        expect(params.customer).toBe("cus_123");
        if (status) expect(params.status).toBe(status);
        else expect(params).not.toHaveProperty("status");
        expect(params.expand).toEqual(expect.arrayContaining([...expand]));
        expect(
          mockIPaidCustomerModel.findByUserIdAndClientId,
        ).not.toHaveBeenCalled();
      },
    );
    it.each([
      { customer: "cus_foreign", livemode: true },
      { customer: "cus_123", livemode: false },
    ])(
      "rejects a foreign or test subscription without returning a paid result",
      async (fields) => {
        mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue({
          userId,
          clientId: BILLING_CLIENT_ID,
          stripeCustomerId: "cus_123",
        } as any);
        mockStripeSubscriptions.list.mockResolvedValue({
          has_more: false,
          data: [{ id: "sub_foreign", ...fields }],
        });
        await expect(stripeUseCase.listSubscriptions(userId)).rejects.toThrow(
          "does not match",
        );
      },
    );

    it("should handle errors when listing subscriptions for a client", async () => {
      const mockCustomer = {
        userId,
        clientId: BILLING_CLIENT_ID,
        stripeCustomerId: "cus_123",
      };

      mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
        mockCustomer as unknown as Awaited<
          ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
        >,
      );
      mockStripeSubscriptions.list.mockRejectedValue(new Error("API error"));

      await expect(stripeUseCase.listSubscriptions(userId)).rejects.toThrow(
        "API error",
      );
    });

    it("should return empty array on general error", async () => {
      mockIPaidCustomerModel.findByUserIdAndClientId.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(stripeUseCase.listSubscriptions(userId)).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("handleCustomerEvent", () => {
    const clientId = BILLING_CLIENT_ID;
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
        livemode: true,
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
        livemode: true,
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
        livemode: true,
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

    it("rejects metadata attempting to change the trusted client", async () => {
      await expect(
        stripeUseCase.handleCustomerEvent(
          {
            id: customerId,
            livemode: true,
            metadata: { clientId: "beancount-web-dev" },
          } as any,
          "created",
          {},
          clientId,
          userId,
        ),
      ).rejects.toThrow("Invalid live customer ownership");
      expect(mockIPaidCustomerModel.create).not.toHaveBeenCalled();
    });

    it("should throw error when no clientId available", async () => {
      const mockCustomer = {
        id: customerId,
        livemode: true,
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
      ).rejects.toThrow("Invalid live customer ownership");
    });
  });

  describe("handleCheckoutSessionCompleted", () => {
    const clientId = BILLING_CLIENT_ID;
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
        livemode: true,
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
        object: "customer",
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
        livemode: true,
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
    const clientId = BILLING_CLIENT_ID;
    const customerId = "cus_123";

    it("should rethrow errors from database operations", async () => {
      const mockCustomer = {
        id: customerId,
        livemode: true,
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

    it("rejects a Stripe customer already owned by another user", async () => {
      mockIPaidCustomerModel.findByStripeCustomerIdAndClientId.mockResolvedValue(
        { userId: "other-user" } as any,
      );
      await expect(
        stripeUseCase.handleCustomerEvent(
          { id: "cus_123", livemode: true, metadata: {} } as any,
          "updated",
          {},
          BILLING_CLIENT_ID,
          "user_123",
        ),
      ).rejects.toThrow("belongs to another user");
      expect(mockIPaidCustomerModel.updateCustomerById).not.toHaveBeenCalled();
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
      // Pinned, so the portal offers no plan switch or cancellation.
      expect(mockStripeBillingPortal.sessions.create).toHaveBeenCalledWith({
        customer: "cus_123",
        return_url: "https://beancount.io/settings/billing",
        configuration:
          SUBSCRIPTION_CONFIG[BILLING_CLIENT_ID].portalConfigurationId,
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
