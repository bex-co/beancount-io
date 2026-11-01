import { StripeService } from "../stripe-service";
import type { IPaidCustomerModel } from "@/features/stripe/data/paid-customer-model";
import type { IModels } from "@/foundation/models";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// Mock the Stripe module
jest.mock("stripe");

// Mock the config module
jest.mock("@/config/config", () => ({
  config: {
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
  },
  __esModule: true,
}));

describe("StripeService.upgradeSubscription", () => {
  let stripeUseCase: StripeService;
  let mockIPaidCustomerModel: jest.Mocked<IPaidCustomerModel>;
  let mockModels: jest.Mocked<IModels>;
  let mockPostgresDb: NodePgDatabase;
  let mockStripeSubscriptions: {
    list: jest.Mock;
    update: jest.Mock;
  };
  let mockPaymentIntents: { retrieve: jest.Mock };
  let mockStripeInstance: unknown;

  const userId = "user_123";
  const clientId = "beancount-web-prod";
  // Use a real price ID from SUBSCRIPTION_CONFIG for beancount-web-prod
  const premiumPriceId = "price_1RrSOGEqsEqs2tLVFnyB34qG"; // Premium monthly
  const growthPriceId = "price_1SyPdaEqsEqs2tLViLPUDoVi"; // Growth monthly

  beforeEach(() => {
    mockIPaidCustomerModel = {
      findByUserIdAndClientId: jest.fn(),
      findByStripeCustomerIdAndClientId: jest.fn(),
      create: jest.fn(),
      updateCustomerById: jest.fn(),
      updatePeriodIfUnchanged: jest.fn().mockResolvedValue(true),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    } as unknown as jest.Mocked<IPaidCustomerModel>;

    mockModels = {
      paidCustomer: mockIPaidCustomerModel,
      sentBillingEmail: {} as any,
      jwt: {} as any,
      oauthGrant: {} as any,
      emailToken: {} as any,
      magicLinkToken: {} as any,
      signupOtpSession: {} as any,
      cliAuthSession: {} as any,
      user: {} as any,
      plaidItem: {} as any,
      plaidAccount: {} as any,
      plaidTransaction: {} as any,
      plaidSyncLog: {} as any,
      featureUsage: {} as any,
      apiKey: {} as any,
      auditEvent: {} as any,
      authMail: {} as any,
      billingIdentity: {} as any,
      storeSubscription: {} as any,
      storeBillingEvent: {} as any,
    } as jest.Mocked<IModels>;

    mockPostgresDb = {} as NodePgDatabase;

    mockStripeSubscriptions = {
      list: jest.fn(),
      update: jest.fn(),
    };

    mockPaymentIntents = { retrieve: jest.fn() };

    mockStripeInstance = {
      subscriptions: mockStripeSubscriptions,
      paymentIntents: mockPaymentIntents,
    };

    stripeUseCase = new StripeService(mockModels, mockPostgresDb);
    stripeUseCase.getStripeInstance = jest
      .fn()
      .mockReturnValue(mockStripeInstance);
  });

  it("should successfully upgrade from Premium to Growth", async () => {
    const mockCustomer = {
      id: "customer_doc_id",
      userId,
      clientId,
      stripeCustomerId: "cus_123",
    };

    mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
      mockCustomer as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
      >,
    );

    mockStripeSubscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_123",
          items: {
            data: [{ id: "si_123", price: { id: premiumPriceId } }],
          },
        },
      ],
    });

    mockStripeSubscriptions.update.mockResolvedValue({
      id: "sub_123",
      status: "active",
      livemode: true,
      customer: "cus_123",
      items: {
        data: [
          {
            id: "si_123",
            price: { id: growthPriceId },
            current_period_end: 1700000000,
          },
        ],
      },
    });

    const result = await stripeUseCase.upgradeSubscription(
      userId,
      clientId,
      growthPriceId,
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain("upgraded successfully");
    expect(result.subscriptionId).toBe("sub_123");
    expect(result.newTier).toBe("GROWTH");
    expect(mockStripeSubscriptions.update).toHaveBeenCalledWith(
      "sub_123",
      {
        items: [{ id: "si_123", price: growthPriceId }],
        cancel_at_period_end: false,
        payment_behavior: "pending_if_incomplete",
        proration_behavior: "always_invoice",
        proration_date: expect.any(Number),
        expand: ["latest_invoice.payments"],
      },
      { idempotencyKey: expect.stringMatching(/^plan-change:sub_123:/) },
    );
    // The new period is recorded through the verified write, so the
    // paid-status cache keeps answering without Stripe.
    expect(mockIPaidCustomerModel.updatePeriodIfUnchanged).toHaveBeenCalledWith(
      expect.any(Object),
      mockCustomer,
      new Date(1700000000 * 1000),
      expect.any(Number),
      "GROWTH",
    );
    expect(mockIPaidCustomerModel.updateCustomerById).not.toHaveBeenCalled();
  });

  it("should reject same-plan upgrade attempt", async () => {
    const mockCustomer = {
      id: "customer_doc_id",
      userId,
      clientId,
      stripeCustomerId: "cus_123",
    };

    mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
      mockCustomer as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
      >,
    );

    mockStripeSubscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_123",
          items: {
            data: [{ id: "si_123", price: { id: premiumPriceId } }],
          },
        },
      ],
    });

    const result = await stripeUseCase.upgradeSubscription(
      userId,
      clientId,
      premiumPriceId,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("already on this plan");
    expect(mockStripeSubscriptions.update).not.toHaveBeenCalled();
  });

  it("should return error when no customer record exists", async () => {
    mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(null);

    const result = await stripeUseCase.upgradeSubscription(
      userId,
      clientId,
      growthPriceId,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("no subscription to change");
  });

  it("should return error when no active subscription found", async () => {
    const mockCustomer = {
      id: "customer_doc_id",
      userId,
      clientId,
      stripeCustomerId: "cus_123",
    };

    mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
      mockCustomer as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
      >,
    );

    mockStripeSubscriptions.list.mockResolvedValue({ data: [] });

    const result = await stripeUseCase.upgradeSubscription(
      userId,
      clientId,
      growthPriceId,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("no subscription to change");
  });

  it("explains that a retired price is no longer offered, with no Stripe call", async () => {
    const result = await stripeUseCase.upgradeSubscription(
      userId,
      clientId,
      "price_1L9ccEEqsEqs2tLVKPRV17wb",
    );

    expect(result).toEqual({
      success: false,
      message: "Validation failed for priceId: This price is no longer offered",
    });
    expect(mockStripeSubscriptions.list).not.toHaveBeenCalled();
  });

  it("should return error for invalid clientId", async () => {
    const result = await stripeUseCase.upgradeSubscription(
      userId,
      "invalid-client",
      growthPriceId,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("Invalid client ID");
  });

  it("should reject the dev client ID when running in production", async () => {
    const { config } = jest.requireMock("@/config/config") as {
      config: { env: string };
    };
    const originalEnv = config.env;
    config.env = "production";

    try {
      const result = await stripeUseCase.upgradeSubscription(
        userId,
        "beancount-web-dev",
        "price_1SyPCqEqsEqs2tLV16VV8qR1", // Growth yearly (dev)
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid client ID");
    } finally {
      config.env = originalEnv;
    }
  });

  it("should return error for invalid priceId", async () => {
    const result = await stripeUseCase.upgradeSubscription(
      userId,
      clientId,
      "price_invalid",
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("Invalid price ID");
  });

  it("should return clientSecret when 3DS is required", async () => {
    const mockCustomer = {
      id: "customer_doc_id",
      userId,
      clientId,
      stripeCustomerId: "cus_123",
    };

    mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
      mockCustomer as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
      >,
    );

    mockStripeSubscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_123",
          items: {
            data: [{ id: "si_123", price: { id: premiumPriceId } }],
          },
        },
      ],
    });

    // With pending_if_incomplete Stripe keeps the old price active and holds
    // the change; the payment is read from the invoice's payment records.
    mockStripeSubscriptions.update.mockResolvedValue({
      id: "sub_123",
      status: "active",
      livemode: true,
      customer: "cus_123",
      pending_update: { subscription_items: [] },
      latest_invoice: {
        hosted_invoice_url: "https://invoice.stripe.com/i/in_123",
        payments: {
          data: [
            { payment: { type: "payment_intent", payment_intent: "pi_123" } },
          ],
        },
      },
      items: {
        data: [{ id: "si_123", price: { id: premiumPriceId } }],
      },
    });
    mockPaymentIntents.retrieve.mockResolvedValue({
      status: "requires_action",
      client_secret: "pi_secret_123",
    });

    const result = await stripeUseCase.upgradeSubscription(
      userId,
      clientId,
      growthPriceId,
    );

    expect(result.success).toBe(false);
    expect(result.clientSecret).toBe("pi_secret_123");
    expect(result.message).toContain("bank needs to approve");
    expect(mockPaymentIntents.retrieve).toHaveBeenCalledWith("pi_123");
  });

  it("should return error when payment fails", async () => {
    const mockCustomer = {
      id: "customer_doc_id",
      userId,
      clientId,
      stripeCustomerId: "cus_123",
    };

    mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
      mockCustomer as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
      >,
    );

    mockStripeSubscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_123",
          items: {
            data: [{ id: "si_123", price: { id: premiumPriceId } }],
          },
        },
      ],
    });

    mockStripeSubscriptions.update.mockResolvedValue({
      id: "sub_123",
      status: "active",
      livemode: true,
      customer: "cus_123",
      pending_update: { subscription_items: [] },
      latest_invoice: {
        payments: {
          data: [
            { payment: { type: "payment_intent", payment_intent: "pi_123" } },
          ],
        },
      },
      items: {
        data: [{ id: "si_123", price: { id: premiumPriceId } }],
      },
    });
    mockPaymentIntents.retrieve.mockResolvedValue({
      status: "requires_payment_method",
    });

    const result = await stripeUseCase.upgradeSubscription(
      userId,
      clientId,
      growthPriceId,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("plan was not changed");
    expect(
      mockIPaidCustomerModel.updatePeriodIfUnchanged,
    ).not.toHaveBeenCalled();
  });

  it("should handle Stripe API error", async () => {
    const mockCustomer = {
      id: "customer_doc_id",
      userId,
      clientId,
      stripeCustomerId: "cus_123",
    };

    mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
      mockCustomer as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
      >,
    );

    mockStripeSubscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_123",
          items: {
            data: [{ id: "si_123", price: { id: premiumPriceId } }],
          },
        },
      ],
    });

    mockStripeSubscriptions.update.mockRejectedValue(
      new Error("Network error"),
    );

    const result = await stripeUseCase.upgradeSubscription(
      userId,
      clientId,
      growthPriceId,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("error occurred");
  });

  it("refuses a downgrade instead of applying it immediately", async () => {
    const mockCustomer = {
      id: "customer_doc_id",
      userId,
      clientId,
      stripeCustomerId: "cus_123",
    };

    mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
      mockCustomer as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
      >,
    );

    // Currently on Growth, downgrading to Premium
    mockStripeSubscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_123",
          items: {
            data: [{ id: "si_123", price: { id: growthPriceId } }],
          },
        },
      ],
    });

    mockStripeSubscriptions.update.mockResolvedValue({
      id: "sub_123",
      status: "active",
      livemode: true,
      customer: "cus_123",
      items: {
        data: [
          {
            id: "si_123",
            price: { id: premiumPriceId },
            current_period_end: 1700000000,
          },
        ],
      },
    });

    const result = await stripeUseCase.upgradeSubscription(
      userId,
      clientId,
      premiumPriceId,
    );

    // A downgrade takes effect at the end of the paid period (PRFAQ005), so
    // the immediate-change path must not move the subscription.
    expect(result.success).toBe(false);
    expect(result.message).toContain("end of your billing period");
    expect(mockStripeSubscriptions.update).not.toHaveBeenCalled();
  });

  it("should handle subscription not found Stripe error", async () => {
    const mockCustomer = {
      id: "customer_doc_id",
      userId,
      clientId,
      stripeCustomerId: "cus_123",
    };

    mockIPaidCustomerModel.findByUserIdAndClientId.mockResolvedValue(
      mockCustomer as unknown as Awaited<
        ReturnType<typeof mockIPaidCustomerModel.findByUserIdAndClientId>
      >,
    );

    mockStripeSubscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_123",
          items: {
            data: [{ id: "si_123", price: { id: premiumPriceId } }],
          },
        },
      ],
    });

    const error = new Error("No such subscription: sub_123");
    Object.assign(error, { name: "StripeInvalidRequestError" });
    mockStripeSubscriptions.update.mockRejectedValue(error);

    const result = await stripeUseCase.upgradeSubscription(
      userId,
      clientId,
      growthPriceId,
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Subscription not found");
  });
});
