import "reflect-metadata";
import { SubscriptionResolver } from "../subscription-resolver";
import { IContext } from "@/server/graphql/context";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import { SubscriptionService } from "@/features/stripe/service/subscription-service";
import type { IModels } from "@/foundation/models";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { GraphQLResolveInfo } from "graphql";
import { graphql, Kind } from "graphql";
import { buildSchema } from "type-graphql";
import { config } from "@/config/config";
import { ErrorCategory } from "@/shared/errors";
import { AuthorizationService } from "@/server/api/authorization";
import { SUBSCRIPTION_PERIOD_VERIFICATION_VERSION } from "@/features/stripe/service/subscription-plan";

// Test constants
const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

let currentResolver: SubscriptionResolver;
// One schema for the whole file: building the resolver's schema a second time
// in one process re-binds TypeGraphQL's parameter metadata, after which @Arg and
// @Ctx arrive in the wrong positions for every schema built so far.
const graphqlSchema = buildSchema({
  resolvers: [SubscriptionResolver],
  container: { get: () => currentResolver },
});

describe("SubscriptionResolver", () => {
  let resolver: SubscriptionResolver;
  let mockContext: IContext;
  let mockStripeService: {
    listSubscriptions: jest.Mock;
    getStripeInstance: jest.Mock;
    cancelSubscription: jest.Mock;
    resumeSubscription: jest.Mock;
    createCustomerPortalSession: jest.Mock;
    upgradeSubscription: jest.Mock;
    previewPlanChange: jest.Mock;
    changePlan: jest.Mock;
    defaultCard: jest.Mock;
  };
  let mockModels: {
    storeSubscription: { findByUserId: jest.Mock };
    user: {
      getById: jest.Mock;
    };
    paidCustomer: {
      findByUserIdAndClientId: jest.Mock;
      findByUserIdWithActivePeriod: jest.Mock;
      updateCustomerById: jest.Mock;
      updatePeriodIfUnchanged: jest.Mock;
      findByUserId: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockStripeService = {
      listSubscriptions: jest.fn().mockResolvedValue([]),
      getStripeInstance: jest.fn(),
      cancelSubscription: jest.fn(),
      resumeSubscription: jest.fn(),
      createCustomerPortalSession: jest.fn(),
      upgradeSubscription: jest.fn(),
      previewPlanChange: jest.fn(),
      changePlan: jest.fn(),
      defaultCard: jest.fn().mockResolvedValue(null),
    };

    mockModels = {
      storeSubscription: { findByUserId: jest.fn().mockResolvedValue([]) },
      user: {
        getById: jest.fn(),
      },
      paidCustomer: {
        findByUserIdAndClientId: jest.fn(),
        findByUserIdWithActivePeriod: jest.fn(),
        updateCustomerById: jest.fn(),
        updatePeriodIfUnchanged: jest.fn(),
        findByUserId: jest.fn().mockResolvedValue([]),
      },
    };

    mockContext = {
      userId: "user-123",
      token: "mock-token",
      getCurrentUserId: jest.fn().mockReturnValue("user-123"),
      getCurrentIdentity: jest.fn().mockReturnValue({
        userId: "user-123",
        method: "session",
        scopes: new Set(),
      }),
    } as unknown as IContext;

    const subscriptions = new SubscriptionService(
      mockStripeService as unknown as IStripeService,
      mockModels as unknown as Pick<
        IModels,
        "paidCustomer" | "user" | "storeSubscription"
      >,
      {} as DbExecutor,
      new AuthorizationService({
        check: async ({ user, object }) => user === object,
      }),
    );
    resolver = new SubscriptionResolver(subscriptions);
    currentResolver = resolver;
  });

  describe("subscriptionStatus", () => {
    it("serves a valid owned live cache through GraphQL without reaching Stripe", async () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue({
        id: "customer-123",
        userId: "user-123",
        stripeCustomerId: "cus_live",
        clientId: "beancount-web-prod",
        currentPeriodEnd: futureDate,
        periodVerificationVersion: SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockStripeService.listSubscriptions.mockRejectedValue(
        new Error("Stripe unavailable"),
      );
      const result = await graphql({
        schema: await graphqlSchema,
        source: "query { subscriptionStatus { hasActiveSubscription } }",
        contextValue: {
          ...mockContext,
          identity: mockContext.getCurrentIdentity(),
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.subscriptionStatus).toEqual({
        hasActiveSubscription: true,
      });
      expect(
        mockModels.paidCustomer.findByUserIdWithActivePeriod,
      ).toHaveBeenCalledWith({}, "user-123");
      expect(mockStripeService.listSubscriptions).not.toHaveBeenCalled();
      expect(mockModels.paidCustomer.findByUserId).not.toHaveBeenCalled();
      expect(
        mockModels.paidCustomer.updatePeriodIfUnchanged,
      ).not.toHaveBeenCalled();
    });

    it.each([
      ["retired test binding", { clientId: "beancount-web-dev" }],
      ["another user", { userId: "user-other" }],
      ["missing Stripe customer", { stripeCustomerId: "" }],
      ["expired period", { currentPeriodEnd: new Date(0) }],
      ["missing period", { currentPeriodEnd: undefined }],
      [
        "unverified historical period",
        { periodVerificationVersion: undefined },
      ],
      ["obsolete verification", { periodVerificationVersion: 0 }],
    ])("does not use a cache with %s", async (_reason, override) => {
      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue({
        id: "customer-123",
        userId: "user-123",
        clientId: "beancount-web-prod",
        stripeCustomerId: "cus_live",
        currentPeriodEnd: new Date(Date.now() + 86400000),
        periodVerificationVersion: SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
        ...override,
      });
      const info = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      const result = await resolver.subscriptionStatus(mockContext, info);

      expect(result).toEqual({
        hasActiveSubscription: false,
        subscriptions: [],
      });
      expect(mockStripeService.listSubscriptions).toHaveBeenCalledTimes(1);
      expect(mockStripeService.listSubscriptions).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({ status: "current", expandForStatus: false }),
      );
    });

    const liveSubscription = (status: string, overrides = {}) => {
      const end = Math.floor(Date.now() / 1000) + 86_400;
      return {
        id: "sub_123",
        status,
        livemode: true,
        customer: "cus_live",
        clientId: "beancount-web-prod",
        start_date: end - 86_400 * 30,
        cancel_at: null,
        canceled_at: null,
        cancel_at_period_end: false,
        items: {
          data: [
            {
              id: "item_123",
              quantity: 1,
              current_period_start: end - 86_400 * 30,
              current_period_end: end,
              price: {
                id: "price_1SyPdaEqsEqs2tLViLPUDoVi",
                unit_amount: 9999,
                currency: "usd",
                recurring: { interval: "month", interval_count: 1 },
                product: { id: "prod_1", name: "Growth", deleted: false },
              },
            },
          ],
        },
        ...overrides,
      };
    };
    const selecting = (...fields: string[]) =>
      ({
        fieldNodes: [
          {
            selectionSet: {
              selections: fields.map((value) => ({
                kind: Kind.FIELD,
                name: { value },
              })),
            },
          },
        ],
      }) as unknown as GraphQLResolveInfo;

    // A past-due subscription keeps its plan only while Stripe still retries
    // the renewal (holdsPaidTier); an open invoice with no next attempt is
    // the end of the retries.
    it.each([
      ["past_due", true, true],
      ["past_due", false, false],
      ["unpaid", true, false],
      ["canceled", true, false],
    ])(
      "counts a %s subscription (Stripe retrying: %s) as paid: %s",
      async (status, retrying, expected) => {
        mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue(
          null,
        );
        mockStripeService.listSubscriptions.mockResolvedValue([
          liveSubscription(status, {
            latest_invoice: {
              id: "in_1",
              status: "open",
              next_payment_attempt: retrying
                ? Math.floor(Date.now() / 1000) + 86_400
                : null,
            },
          }),
        ]);

        const result = await resolver.subscriptionStatus(
          mockContext,
          selecting("hasActiveSubscription"),
        );

        expect(result.hasActiveSubscription).toBe(expected);
      },
    );

    // An outage or a binding mismatch is not evidence of no subscription:
    // without a valid cache the read fails instead of answering "not paid".
    it.each([
      ["the active-only check", "{ hasActiveSubscription }"],
      [
        "the full Billing view",
        "{ hasActiveSubscription subscriptions { id } }",
      ],
    ])(
      "surfaces a Stripe failure in %s with no valid cache rather than reporting no subscription",
      async (_label, selection) => {
        mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue(
          null,
        );
        const failure = new Error(
          "Stripe subscription does not match its live customer binding",
        );
        mockStripeService.listSubscriptions.mockRejectedValue(failure);

        const result = await graphql({
          schema: await graphqlSchema,
          source: `query { subscriptionStatus ${selection} }`,
          contextValue: {
            ...mockContext,
            identity: mockContext.getCurrentIdentity(),
          },
        });

        expect(result.data).toBeNull();
        expect(result.errors).toHaveLength(1);
        expect(result.errors?.[0].originalError).toBe(failure);
        expect(mockStripeService.listSubscriptions).toHaveBeenCalledTimes(1);
        expect(
          mockModels.paidCustomer.updatePeriodIfUnchanged,
        ).not.toHaveBeenCalled();
      },
    );

    describe("billing (ADR 001 D13)", () => {
      const billingQuery = `query { subscriptionStatus { billing {
        source duplicateBilling
        store {
          provider productId tier interval status accessEndsAt willRenew
          managementUrl scheduledChange { tier interval }
        }
      } } }`;
      const accessEndsAt = new Date(Date.now() + 86_400_000);
      const googlePlan = {
        provider: "GOOGLE_PLAY",
        productId: "growth",
        basePlanId: "monthly",
        tier: "GROWTH",
        cycle: "month",
        status: "ACTIVE",
        userId: "user-123",
        replacedById: null,
        pendingProductId: "premium",
        accessEndsAt,
        willRenew: true,
      };
      const readBilling = async () => {
        const result = await graphql({
          schema: await graphqlSchema,
          source: billingQuery,
          contextValue: {
            ...mockContext,
            identity: mockContext.getCurrentIdentity(),
          },
        });
        expect(result.errors).toBeUndefined();
        return (result.data?.subscriptionStatus as { billing: unknown })
          .billing;
      };

      it("reports no billing source for a free account", async () => {
        mockStripeService.listSubscriptions.mockResolvedValue([]);

        expect(await readBilling()).toEqual({
          source: "NONE",
          duplicateBilling: false,
          store: null,
        });
      });

      it("reports Stripe for a Stripe subscriber", async () => {
        mockStripeService.listSubscriptions.mockResolvedValue([
          liveSubscription("active"),
        ]);

        expect(await readBilling()).toEqual({
          source: "STRIPE",
          duplicateBilling: false,
          store: null,
        });
      });

      it("reports a store subscription and where it is managed", async () => {
        mockStripeService.listSubscriptions.mockResolvedValue([]);
        mockModels.storeSubscription.findByUserId.mockResolvedValue([
          googlePlan,
        ]);

        expect(await readBilling()).toEqual({
          source: "GOOGLE_PLAY",
          duplicateBilling: false,
          store: {
            provider: "GOOGLE_PLAY",
            productId: "growth",
            tier: "GROWTH",
            interval: "month",
            status: "ACTIVE",
            accessEndsAt: accessEndsAt.toISOString(),
            willRenew: true,
            managementUrl:
              "https://play.google.com/store/account/subscriptions?sku=growth&package=io.beancount.android",
            scheduledChange: { tier: "PREMIUM", interval: "month" },
          },
        });
      });

      it("flags an account billed by Stripe and a store at once", async () => {
        mockStripeService.listSubscriptions.mockResolvedValue([
          liveSubscription("active"),
        ]);
        mockModels.storeSubscription.findByUserId.mockResolvedValue([
          googlePlan,
        ]);

        expect(await readBilling()).toMatchObject({
          source: "GOOGLE_PLAY",
          duplicateBilling: true,
        });
      });

      it("does not count a Stripe plan set to end as renewing", async () => {
        mockStripeService.listSubscriptions.mockResolvedValue([
          liveSubscription("active", { cancel_at_period_end: true }),
        ]);
        mockModels.storeSubscription.findByUserId.mockResolvedValue([
          googlePlan,
        ]);

        expect(await readBilling()).toMatchObject({
          source: "GOOGLE_PLAY",
          duplicateBilling: false,
        });
      });

      it("keeps the active-only check off the store rows", async () => {
        mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue(
          null,
        );
        mockStripeService.listSubscriptions.mockResolvedValue([]);

        await resolver.subscriptionStatus(
          mockContext,
          selecting("hasActiveSubscription"),
        );

        expect(
          mockModels.storeSubscription.findByUserId,
        ).not.toHaveBeenCalled();
      });
    });

    it("gives a past-due subscription's next payment attempt for the banner", async () => {
      const retry = Math.floor(Date.now() / 1000) + 3 * 86_400;
      mockStripeService.listSubscriptions.mockResolvedValue([
        liveSubscription("past_due", {
          latest_invoice: {
            id: "in_1",
            status: "open",
            next_payment_attempt: retry,
          },
        }),
      ]);

      const result = await resolver.subscriptionStatus(
        mockContext,
        selecting("subscriptions"),
      );

      expect(result.subscriptions[0]).toMatchObject({
        status: "past_due",
        nextPaymentAttempt: new Date(retry * 1000),
      });
    });

    it("gives no next attempt to a subscription that is paid up", async () => {
      mockStripeService.listSubscriptions.mockResolvedValue([
        liveSubscription("active", {
          latest_invoice: {
            id: "in_1",
            status: "paid",
            next_payment_attempt: null,
          },
        }),
      ]);

      const result = await resolver.subscriptionStatus(
        mockContext,
        selecting("subscriptions"),
      );

      expect(result.subscriptions[0]?.nextPaymentAttempt).toBeNull();
    });

    it("reports what the latest invoice collected, discounts applied", async () => {
      mockStripeService.listSubscriptions.mockResolvedValue([
        liveSubscription("active", {
          latest_invoice: {
            id: "in_first",
            status: "paid",
            amount_paid: 0,
            currency: "usd",
            billing_reason: "subscription_create",
            next_payment_attempt: null,
            created: 1_800_000_000,
          },
        }),
      ]);

      const result = await resolver.subscriptionStatus(
        mockContext,
        selecting("subscriptions"),
      );

      expect(result.subscriptions[0]?.latestInvoice).toEqual({
        id: "in_first",
        amountPaid: 0,
        currency: "usd",
        billingReason: "subscription_create",
        // So the client can tell a fresh Checkout from an old bookmark.
        created: new Date(1_800_000_000 * 1000),
      });
    });

    it("gives no latest invoice when the listing did not expand it", async () => {
      mockStripeService.listSubscriptions.mockResolvedValue([
        liveSubscription("active", { latest_invoice: "in_unexpanded" }),
      ]);

      const result = await resolver.subscriptionStatus(
        mockContext,
        selecting("subscriptions"),
      );

      expect(result.subscriptions[0]?.latestInvoice).toBeNull();
    });

    it("reports a subscription's scheduled plan change", async () => {
      const end = Math.floor(Date.now() / 1000) + 86_400;
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_live",
          clientId: "beancount-web-prod",
          start_date: end - 86_400 * 30,
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          schedule: {
            id: "sub_sched_1",
            status: "active",
            current_phase: { start_date: end - 86_400 * 30, end_date: end },
            phases: [
              {
                start_date: end - 86_400 * 30,
                items: [{ price: "price_1SyPdaEqsEqs2tLViLPUDoVi" }],
              },
              {
                start_date: end,
                items: [{ price: "price_1RrSOGEqsEqs2tLVFnyB34qG" }],
              },
            ],
          },
          items: {
            data: [
              {
                id: "item_123",
                quantity: 1,
                current_period_start: end - 86_400 * 30,
                current_period_end: end,
                price: {
                  id: "price_1SyPdaEqsEqs2tLViLPUDoVi",
                  unit_amount: 9999,
                  currency: "usd",
                  recurring: { interval: "month", interval_count: 1 },
                  product: { id: "prod_1", name: "Growth", deleted: false },
                },
              },
            ],
          },
        },
      ]);
      const info = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      const result = await resolver.subscriptionStatus(mockContext, info);

      expect(result.subscriptions[0]?.scheduledChange).toEqual({
        priceId: "price_1RrSOGEqsEqs2tLVFnyB34qG",
        effectiveAt: new Date(end * 1000),
      });
    });

    it("queries Stripe for full billing details even with a valid live cache", async () => {
      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue({
        userId: "user-123",
        clientId: "beancount-web-prod",
        stripeCustomerId: "cus_live",
        currentPeriodEnd: new Date(Date.now() + 86400000),
        periodVerificationVersion: SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
      });
      const info = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      const result = await resolver.subscriptionStatus(mockContext, info);

      expect(result).toEqual({
        hasActiveSubscription: false,
        subscriptions: [],
        billing: { source: "NONE", duplicateBilling: false, store: null },
      });
      expect(
        mockModels.paidCustomer.findByUserIdWithActivePeriod,
      ).not.toHaveBeenCalled();
      expect(mockStripeService.listSubscriptions).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({ status: "all", expandForStatus: true }),
      );
    });

    it("should query Stripe when cached subscription is expired", async () => {
      // Mock GraphQL info for hasActiveSubscription only
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                {
                  kind: Kind.FIELD,
                  name: { value: "hasActiveSubscription" },
                },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      // Mock no cached customer (expired customers won't be returned by the query)
      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );

      // Mock Stripe response with valid product ID from SUBSCRIPTION_CONFIG
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "beancount-web-prod",
          start_date: Math.floor(Date.now() / 1000),
          ended_at: Math.floor((Date.now() + THIRTY_DAYS_IN_MS) / 1000), // 30 days from now
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "item_123",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1L9ccEEqsEqs2tLVKPRV17wb", // Valid price ID
                  unit_amount: 999,
                  currency: "usd",
                  recurring: {
                    interval: "month",
                    interval_count: 1,
                  },
                  product: {
                    id: "prod_LrLIJaWkCbz2uA", // Valid product ID from config
                    name: "Premium Plan",
                    description: "Premium subscription",
                    images: [],
                    deleted: false,
                  },
                },
              },
            ],
          },
        },
      ]);

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      expect(mockStripeService.listSubscriptions).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({ status: "current", expandForStatus: false }),
      );
      expect(result.hasActiveSubscription).toBe(true);
    });

    it("should return false when user has no active subscriptions", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      mockStripeService.listSubscriptions.mockResolvedValue([]);

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      expect(result.hasActiveSubscription).toBe(false);
      expect(result.subscriptions).toEqual([]);
    });

    it("should filter subscriptions based on client config", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      // Mock subscription for non-configured client
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "non-existent-client",
          start_date: Math.floor(Date.now() / 1000),
          ended_at: Math.floor((Date.now() + THIRTY_DAYS_IN_MS) / 1000),
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "item_123",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1L9ccEEqsEqs2tLVKPRV17wb",
                  unit_amount: 1000,
                  currency: "usd",
                  recurring: {
                    interval: "month",
                  },
                  product: "prod_123",
                },
              },
            ],
          },
        },
      ]);

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      // Should filter out subscription for non-configured client
      expect(result.hasActiveSubscription).toBe(false);
      expect(result.subscriptions).toEqual([]);
    });

    it("should throw error when userId is not present", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                {
                  kind: Kind.FIELD,
                  name: { value: "hasActiveSubscription" },
                },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      const contextWithoutUserId = {
        ...mockContext,
        userId: "",
        getCurrentUserId: jest.fn().mockImplementation(() => {
          throw new Error("User ID not found in context");
        }),
        getCurrentIdentity: jest.fn().mockImplementation(() => {
          throw new Error("User ID not found in context");
        }),
      } as unknown as IContext;

      await expect(
        resolver.subscriptionStatus(contextWithoutUserId, mockInfo),
      ).rejects.toThrow("User ID not found in context");
    });

    it("should update currentPeriodEnd when subscription changes", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      const newPeriodEnd = Math.floor((Date.now() + THIRTY_DAYS_IN_MS) / 1000);

      // Mock Stripe subscriptions
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "beancount-web-prod",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "item_123",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: newPeriodEnd,
                price: {
                  id: "price_1L9ccEEqsEqs2tLVKPRV17wb",
                  unit_amount: 999,
                  currency: "usd",
                  recurring: {
                    interval: "month",
                    interval_count: 1,
                  },
                  product: {
                    id: "prod_LrLIJaWkCbz2uA",
                    name: "Premium Plan",
                    description: "Premium subscription",
                    images: [],
                    deleted: false,
                  },
                },
              },
            ],
          },
        },
      ]);

      // Existing customer with different currentPeriodEnd
      mockModels.paidCustomer.findByUserId.mockResolvedValue([
        {
          id: "customer-123",
          userId: "user-123",
          stripeCustomerId: "cus_test",
          clientId: "beancount-web-prod",
          currentPeriodEnd: new Date(Date.now() - 86400000), // Yesterday
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      mockStripeService.getStripeInstance.mockReturnValue({
        products: {
          retrieve: jest.fn().mockResolvedValue({
            id: "prod_LrLIJaWkCbz2uA",
            name: "Premium Plan",
            description: "Premium subscription",
            images: [],
            deleted: false,
          }),
        },
      });

      await resolver.subscriptionStatus(mockContext, mockInfo);

      expect(
        mockModels.paidCustomer.updatePeriodIfUnchanged,
      ).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          id: "customer-123",
          stripeCustomerId: "cus_test",
        }),
        new Date(newPeriodEnd * 1000),
        SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
        expect.any(String),
      );
    });

    it("does not rewrite an already verified period when dates match", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      const periodEnd = Math.floor((Date.now() + THIRTY_DAYS_IN_MS) / 1000);
      const exactDate = new Date(periodEnd * 1000);

      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "beancount-web-prod",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "item_123",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: periodEnd,
                price: {
                  id: "price_1L9ccEEqsEqs2tLVKPRV17wb",
                  unit_amount: 999,
                  currency: "usd",
                  recurring: {
                    interval: "month",
                    interval_count: 1,
                  },
                  product: {
                    id: "prod_LrLIJaWkCbz2uA",
                    name: "Premium Plan",
                    description: "Premium subscription",
                    images: [],
                    deleted: false,
                  },
                },
              },
            ],
          },
        },
      ]);

      mockModels.paidCustomer.findByUserId.mockResolvedValue([
        {
          id: "customer-123",
          userId: "user-123",
          stripeCustomerId: "cus_test",
          clientId: "beancount-web-prod",
          currentPeriodEnd: exactDate,
          periodVerificationVersion: SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
          periodTier: "PREMIUM",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      mockStripeService.getStripeInstance.mockReturnValue({
        products: {
          retrieve: jest.fn().mockResolvedValue({
            id: "prod_LrLIJaWkCbz2uA",
            name: "Premium Plan",
            deleted: false,
          }),
        },
      });

      await resolver.subscriptionStatus(mockContext, mockInfo);

      expect(
        mockModels.paidCustomer.updatePeriodIfUnchanged,
      ).not.toHaveBeenCalled();
    });

    it("should handle subscriptions with empty product IDs or plan IDs config", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      // Mock subscriptions with a client that has empty productIds and planIds
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "beancount-web-prod", // This has non-empty productIds
          start_date: Math.floor(Date.now() / 1000),
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "item_123",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_not_in_config",
                  unit_amount: 999,
                  currency: "usd",
                  recurring: {
                    interval: "month",
                    interval_count: 1,
                  },
                  product: {
                    id: "prod_not_in_config",
                    name: "Other Plan",
                    description: "Other subscription",
                    images: [],
                    deleted: false,
                  },
                },
              },
            ],
          },
        },
      ]);

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      // Should filter out subscriptions that don't match config
      expect(result.hasActiveSubscription).toBe(false);
      expect(result.subscriptions).toEqual([]);
    });

    it("should handle deleted products gracefully", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "beancount-web-prod",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "item_123",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1L9ccEEqsEqs2tLVKPRV17wb",
                  unit_amount: 999,
                  currency: "usd",
                  recurring: {
                    interval: "month",
                    interval_count: 1,
                  },
                  product: "prod_LrLIJaWkCbz2uA", // Product as string (needs retrieval)
                },
              },
            ],
          },
        },
      ]);

      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );

      mockStripeService.getStripeInstance.mockReturnValue({
        products: {
          retrieve: jest.fn().mockResolvedValue({
            id: "prod_LrLIJaWkCbz2uA",
            deleted: true, // Deleted product
          }),
        },
      });

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      expect(result.hasActiveSubscription).toBe(true);
      expect(result.subscriptions).toHaveLength(1);
      // Product should be undefined for deleted product
      expect(result.subscriptions[0].items[0].product).toBeUndefined();
    });

    it("should handle partial failures when fetching product details", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      // Mock subscription with two items - one succeeds, one fails
      // Use valid price IDs from SUBSCRIPTION_CONFIG
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_123",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "beancount-web-prod",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "item_123",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1L9ccEEqsEqs2tLVKPRV17wb", // Valid price ID
                  unit_amount: 999,
                  currency: "usd",
                  recurring: {
                    interval: "month",
                    interval_count: 1,
                  },
                  product: "prod_success",
                },
              },
              {
                id: "item_456",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1L9ccEEqsEqs2tLVbeBgHm9p", // Valid price ID
                  unit_amount: 9999,
                  currency: "usd",
                  recurring: {
                    interval: "year",
                    interval_count: 1,
                  },
                  product: "prod_fail",
                },
              },
            ],
          },
        },
      ]);

      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );
      mockModels.paidCustomer.findByUserId.mockResolvedValue([
        {
          id: "customer-123",
          userId: "user-123",
          currentPeriodEnd: null,
        },
      ]);

      // Mock getStripeInstance to return different results for different products
      mockStripeService.getStripeInstance.mockReturnValue({
        products: {
          retrieve: jest.fn().mockImplementation((productId: string) => {
            if (productId === "prod_success") {
              return Promise.resolve({
                id: "prod_success",
                name: "Success Product",
                deleted: false,
              });
            } else {
              // Simulate API failure for second product
              return Promise.reject(new Error("API Error"));
            }
          }),
        },
      });

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      // Should still return the subscription, but with only the successful item
      expect(result.hasActiveSubscription).toBe(true);
      expect(result.subscriptions).toHaveLength(1);
      // Only one item should be present (the successful one)
      expect(result.subscriptions[0].items).toHaveLength(1);
      expect(result.subscriptions[0].items[0].id).toBe("item_123");
      expect(result.subscriptions[0].items[0].product?.name).toBe(
        "Success Product",
      );
    });

    it("should continue with other subscriptions when one subscription item fails to fetch product", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      // Mock one subscription where product retrieval fails
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_with_failing_product",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "beancount-web-prod",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "item_fail",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1L9ccEEqsEqs2tLVbeBgHm9p", // Valid price ID
                  unit_amount: 9999,
                  currency: "usd",
                  recurring: {
                    interval: "year",
                    interval_count: 1,
                  },
                  product: "prod_that_fails", // String product ID that will fail to retrieve
                },
              },
            ],
          },
        },
      ]);

      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );
      mockModels.paidCustomer.findByUserId.mockResolvedValue([
        {
          id: "customer-123",
          userId: "user-123",
          currentPeriodEnd: null,
        },
      ]);

      // Mock getStripeInstance to fail for all product retrievals
      mockStripeService.getStripeInstance.mockReturnValue({
        products: {
          retrieve: jest.fn().mockRejectedValue(new Error("Stripe API Error")),
        },
      });

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      // Should still indicate active subscription even though product fetch failed
      expect(result.hasActiveSubscription).toBe(true);
      // The subscription should be in results but with 0 items (item was filtered out due to error)
      expect(result.subscriptions).toHaveLength(1);
      expect(result.subscriptions[0].id).toBe("sub_with_failing_product");
      // Items that failed to fetch product are filtered out
      expect(result.subscriptions[0].items).toHaveLength(0);
    });

    it("should successfully process multiple subscriptions when all succeed", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      // Mock multiple successful subscriptions with valid product IDs
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_1",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "beancount-web-prod",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "item_1",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1L9ccEEqsEqs2tLVKPRV17wb", // Valid price ID
                  unit_amount: 999,
                  currency: "usd",
                  recurring: {
                    interval: "month",
                    interval_count: 1,
                  },
                  product: {
                    id: "prod_LrLIJaWkCbz2uA", // Valid product ID
                    name: "Product 1",
                    deleted: false,
                  },
                },
              },
            ],
          },
        },
        {
          id: "sub_2",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "beancount-web-prod",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "item_2",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1L9ccEEqsEqs2tLVbeBgHm9p", // Valid price ID
                  unit_amount: 9999,
                  currency: "usd",
                  recurring: {
                    interval: "year",
                    interval_count: 1,
                  },
                  product: {
                    id: "prod_TwIDs5ys1JPw89", // Valid product ID
                    name: "Product 2",
                    deleted: false,
                  },
                },
              },
            ],
          },
        },
      ]);

      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );
      mockModels.paidCustomer.findByUserId.mockResolvedValue([
        {
          id: "customer-123",
          userId: "user-123",
          currentPeriodEnd: null,
        },
      ]);

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      // Should return both subscriptions successfully
      expect(result.hasActiveSubscription).toBe(true);
      expect(result.subscriptions).toHaveLength(2);
      expect(result.subscriptions[0].id).toBe("sub_1");
      expect(result.subscriptions[0].items).toHaveLength(1);
      expect(result.subscriptions[0].items[0].product?.name).toBe("Product 1");
      expect(result.subscriptions[1].id).toBe("sub_2");
      expect(result.subscriptions[1].items).toHaveLength(1);
      expect(result.subscriptions[1].items[0].product?.name).toBe("Product 2");
    });

    it("should handle empty subscription list", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      mockStripeService.listSubscriptions.mockResolvedValue([]);
      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      expect(result.hasActiveSubscription).toBe(false);
      expect(result.subscriptions).toHaveLength(0);
    });

    it("should handle subscription with multiple items where some succeed and some fail", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      // Mock subscription with 3 items - 2 succeed, 1 fails
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_mixed",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "beancount-web-prod",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "item_1_success",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1L9ccEEqsEqs2tLVKPRV17wb",
                  unit_amount: 999,
                  currency: "usd",
                  recurring: {
                    interval: "month",
                    interval_count: 1,
                  },
                  product: "prod_success_1",
                },
              },
              {
                id: "item_2_fail",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1L9ccEEqsEqs2tLVbeBgHm9p",
                  unit_amount: 9999,
                  currency: "usd",
                  recurring: {
                    interval: "year",
                    interval_count: 1,
                  },
                  product: "prod_fail",
                },
              },
              {
                id: "item_3_success",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1RrSOGEqsEqs2tLVFnyB34qG",
                  unit_amount: 1499,
                  currency: "usd",
                  recurring: {
                    interval: "month",
                    interval_count: 1,
                  },
                  product: "prod_success_2",
                },
              },
            ],
          },
        },
      ]);

      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );
      mockModels.paidCustomer.findByUserId.mockResolvedValue([
        {
          id: "customer-123",
          userId: "user-123",
          currentPeriodEnd: null,
        },
      ]);

      // Mock product retrieval: success for prod_success_1 and prod_success_2, fail for prod_fail
      mockStripeService.getStripeInstance.mockReturnValue({
        products: {
          retrieve: jest.fn().mockImplementation((productId: string) => {
            if (productId === "prod_fail") {
              return Promise.reject(new Error("Product not found"));
            }
            return Promise.resolve({
              id: productId,
              name: `Product ${productId}`,
              deleted: false,
            });
          }),
        },
      });

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      // Should return subscription with only the 2 successful items
      expect(result.hasActiveSubscription).toBe(true);
      expect(result.subscriptions).toHaveLength(1);
      expect(result.subscriptions[0].id).toBe("sub_mixed");
      expect(result.subscriptions[0].items).toHaveLength(2);
      expect(result.subscriptions[0].items[0].id).toBe("item_1_success");
      expect(result.subscriptions[0].items[1].id).toBe("item_3_success");
    });

    it("should handle all subscriptions failing gracefully", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      // Mock subscriptions that will fail during processing
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_fail_1",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "beancount-web-prod",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "item_fail_1",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1L9ccEEqsEqs2tLVKPRV17wb",
                  unit_amount: 999,
                  currency: "usd",
                  recurring: {
                    interval: "month",
                    interval_count: 1,
                  },
                  product: "prod_fail",
                },
              },
            ],
          },
        },
      ]);

      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );
      mockModels.paidCustomer.findByUserId.mockResolvedValue([
        {
          id: "customer-123",
          userId: "user-123",
          currentPeriodEnd: null,
        },
      ]);

      // Mock all product retrievals to fail
      mockStripeService.getStripeInstance.mockReturnValue({
        products: {
          retrieve: jest.fn().mockRejectedValue(new Error("API Error")),
        },
      });

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      // hasActiveSubscription is based on filteredSubscriptions, so it should be true
      expect(result.hasActiveSubscription).toBe(true);
      // Subscriptions are still returned but with empty items arrays
      expect(result.subscriptions).toHaveLength(1);
      expect(result.subscriptions[0].items).toHaveLength(0);
    });

    it("should preserve all subscription metadata even when items fail", async () => {
      const mockInfo = {
        fieldNodes: [
          {
            selectionSet: {
              selections: [
                { kind: Kind.FIELD, name: { value: "hasActiveSubscription" } },
                { kind: Kind.FIELD, name: { value: "subscriptions" } },
              ],
            },
          },
        ],
      } as unknown as GraphQLResolveInfo;

      const cancelAt = Math.floor(
        (Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000,
      ); // 7 days from now
      const canceledAt = Math.floor((Date.now() - 1000) / 1000); // 1 second ago

      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_metadata",
          status: "active",
          livemode: true,
          customer: "cus_test",
          clientId: "beancount-web-prod",
          start_date: Math.floor(Date.now() / 1000),
          cancel_at: cancelAt,
          canceled_at: canceledAt,
          cancel_at_period_end: true,
          items: {
            data: [
              {
                id: "item_meta",
                quantity: 1,
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(
                  (Date.now() + THIRTY_DAYS_IN_MS) / 1000,
                ),
                price: {
                  id: "price_1L9ccEEqsEqs2tLVKPRV17wb",
                  unit_amount: 999,
                  currency: "usd",
                  recurring: {
                    interval: "month",
                    interval_count: 1,
                  },
                  product: "prod_fail",
                },
              },
            ],
          },
        },
      ]);

      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );
      mockModels.paidCustomer.findByUserId.mockResolvedValue([
        {
          id: "customer-123",
          userId: "user-123",
          currentPeriodEnd: null,
        },
      ]);

      mockStripeService.getStripeInstance.mockReturnValue({
        products: {
          retrieve: jest.fn().mockRejectedValue(new Error("API Error")),
        },
      });

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      // All subscription metadata should be preserved
      expect(result.subscriptions).toHaveLength(1);
      const sub = result.subscriptions[0];
      expect(sub.id).toBe("sub_metadata");
      expect(sub.status).toBe("active");
      expect(sub.clientId).toBe("beancount-web-prod");
      expect(sub.cancelAt).toEqual(new Date(cancelAt * 1000));
      expect(sub.canceledAt).toEqual(new Date(canceledAt * 1000));
      expect(sub.cancelAtPeriodEnd).toBe(true);
      expect(sub.currentPeriodStart).toBeDefined();
      expect(sub.currentPeriodEnd).toBeDefined();
    });
  });

  describe("createSubscriptionSession", () => {
    beforeEach(() => {
      mockModels.user.getById.mockResolvedValue({
        email: "test@example.com",
      });
    });

    it("should throw error when userId is not present", async () => {
      const contextWithoutUserId = {
        ...mockContext,
        userId: "",
        getCurrentUserId: jest.fn().mockImplementation(() => {
          throw new Error("User ID not found in context");
        }),
        getCurrentIdentity: jest.fn().mockImplementation(() => {
          throw new Error("User ID not found in context");
        }),
      } as unknown as IContext;

      await expect(
        resolver.createSubscriptionSession(
          "beancount.io",
          "price_123",
          contextWithoutUserId,
        ),
      ).rejects.toThrow("User ID not found in context");
    });

    it("should return error for invalid client ID", async () => {
      const result = await resolver.createSubscriptionSession(
        "invalid-client",
        "price_123",
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid client ID");
      expect(mockModels.user.getById).not.toHaveBeenCalled();
      expect(
        mockModels.paidCustomer.findByUserIdAndClientId,
      ).not.toHaveBeenCalled();
    });

    it("should reject the dev client ID when running in production", async () => {
      const originalEnv = config.env;
      config.env = "production";

      try {
        const result = await resolver.createSubscriptionSession(
          "beancount-web-dev",
          "price_1L9cmbEqsEqs2tLVuCG0AcO8",
          mockContext,
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain("Invalid client ID");
        expect(mockModels.user.getById).not.toHaveBeenCalled();
      } finally {
        config.env = originalEnv;
      }
    });

    it("should return error when price ID not allowed for client", async () => {
      const result = await resolver.createSubscriptionSession(
        "beancount-web-prod",
        "invalid-price-id",
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid price ID for client");
      expect(mockModels.user.getById).not.toHaveBeenCalled();
      expect(
        mockModels.paidCustomer.findByUserIdAndClientId,
      ).not.toHaveBeenCalled();
    });

    it("should create session successfully with new customer", async () => {
      const mockStripeCheckoutSessions = {
        create: jest.fn().mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/session/test",
        }),
      };

      mockStripeService.getStripeInstance.mockReturnValue({
        checkout: { sessions: mockStripeCheckoutSessions },
      });

      mockModels.paidCustomer.findByUserIdAndClientId.mockResolvedValue(null); // No existing customer

      const result = await resolver.createSubscriptionSession(
        "beancount-web-prod",
        "price_1RrSOGEqsEqs2tLVFnyB34qG", // Valid price ID
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("cs_test_123");
      expect(result.sessionUrl).toBe(
        "https://checkout.stripe.com/session/test",
      );
      expect(mockStripeCheckoutSessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            {
              price: "price_1RrSOGEqsEqs2tLVFnyB34qG",
              quantity: 1,
            },
          ],
          customer_email: "test@example.com",
          allow_promotion_codes: true,
        }),
      );
      expect(mockModels.user.getById).toHaveBeenCalledTimes(1);
    });

    it("should create session successfully with existing customer", async () => {
      const mockStripeCheckoutSessions = {
        create: jest.fn().mockResolvedValue({
          id: "cs_test_456",
          url: "https://checkout.stripe.com/session/existing",
        }),
      };

      mockStripeService.getStripeInstance.mockReturnValue({
        checkout: { sessions: mockStripeCheckoutSessions },
      });

      mockModels.paidCustomer.findByUserIdAndClientId.mockResolvedValue({
        id: "customer-123",
        userId: "user-123",
        stripeCustomerId: "cus_existing_123",
        clientId: "beancount-web-prod",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await resolver.createSubscriptionSession(
        "beancount-web-prod",
        "price_1RrSOGEqsEqs2tLVFnyB34qG",
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("cs_test_456");
      expect(mockStripeCheckoutSessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_existing_123",
          allow_promotion_codes: true,
        }),
      );
      expect(mockModels.user.getById).not.toHaveBeenCalled();
    });

    it("returns a cancelled Checkout to the pricing page with the plan and cycle still chosen", async () => {
      const mockStripeCheckoutSessions = {
        create: jest.fn().mockResolvedValue({
          id: "cs_1",
          url: "https://checkout.stripe.com/session/1",
        }),
      };
      mockStripeService.getStripeInstance.mockReturnValue({
        checkout: { sessions: mockStripeCheckoutSessions },
      });
      mockModels.paidCustomer.findByUserIdAndClientId.mockResolvedValue(null);

      await resolver.createSubscriptionSession(
        "beancount-web-prod",
        "price_1US5htEqsEqs2tLVENCzLaZB",
        mockContext,
      );
      await resolver.createSubscriptionSession(
        "beancount-web-prod",
        "price_1SyPdaEqsEqs2tLViLPUDoVi",
        mockContext,
      );

      const [yearly, monthly] = mockStripeCheckoutSessions.create.mock.calls;
      expect(yearly[0].cancel_url).toBe(
        "https://beancount.io/pricing?plan=premium&billing=yearly&checkout=canceled",
      );
      expect(monthly[0].cancel_url).toBe(
        "https://beancount.io/pricing?plan=growth&billing=monthly&checkout=canceled",
      );
      // Stripe fills in the literal placeholder; percent-encoded braces would
      // reach the confirmation unfilled.
      expect(yearly[0].success_url).toBe(
        "https://beancount.io/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      );
    });

    it("returns a Checkout cancelled from Billing to Billing, which says nothing was charged", async () => {
      const create = jest.fn().mockResolvedValue({
        id: "cs_2",
        url: "https://checkout.stripe.com/session/2",
      });
      mockStripeService.getStripeInstance.mockReturnValue({
        checkout: { sessions: { create } },
      });
      mockModels.paidCustomer.findByUserIdAndClientId.mockResolvedValue(null);

      await resolver.createSubscriptionSession(
        "beancount-web-prod",
        "price_1US5htEqsEqs2tLVENCzLaZB",
        mockContext,
        "BILLING",
      );
      await resolver.createSubscriptionSession(
        "beancount-web-prod",
        "price_1US5htEqsEqs2tLVENCzLaZB",
        mockContext,
        null,
      );

      const [fromBilling, unspecified] = create.mock.calls;
      expect(fromBilling[0].cancel_url).toBe(
        "https://beancount.io/settings/billing?checkout=canceled",
      );
      expect(fromBilling[0].success_url).toBe(
        "https://beancount.io/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      );
      // An omitted or null argument is the pricing page's call.
      expect(unspecified[0].cancel_url).toBe(
        "https://beancount.io/pricing?plan=premium&billing=yearly&checkout=canceled",
      );
    });

    // The pricing page's contract (w1/m39 README): every price it sells, under
    // the client it sends, must open Checkout. Written out rather than read
    // from SUBSCRIPTION_CONFIG, so dropping a sold price from the server's
    // catalog fails here instead of passing by construction.
    it.each([
      ["Premium monthly", "price_1RrSOGEqsEqs2tLVFnyB34qG"],
      ["Premium yearly", "price_1US5htEqsEqs2tLVENCzLaZB"],
      ["Growth monthly", "price_1SyPdaEqsEqs2tLViLPUDoVi"],
      ["Growth yearly", "price_1SyPdbEqsEqs2tLV7PJyWZed"],
      ["Organization monthly", "price_1SyPdcEqsEqs2tLVCWEgU1PZ"],
      ["Organization yearly", "price_1SyPdfEqsEqs2tLVmK6zCrP6"],
    ])(
      "opens Checkout through GraphQL for the pricing page's %s price",
      async (_label, priceId) => {
        const create = jest.fn().mockResolvedValue({
          id: "cs_pricing",
          url: "https://checkout.stripe.com/c/pay/cs_pricing",
        });
        mockStripeService.getStripeInstance.mockReturnValue({
          checkout: { sessions: { create } },
        });
        mockModels.paidCustomer.findByUserIdAndClientId.mockResolvedValue(null);
        const identity = mockContext.getCurrentIdentity();

        const result = await graphql({
          schema: await graphqlSchema,
          source: `mutation Checkout($clientId: String!, $priceId: String!) {
            createSubscriptionSession(clientId: $clientId, priceId: $priceId) {
              success message sessionUrl
            }
          }`,
          variableValues: { clientId: "beancount-web-prod", priceId },
          contextValue: { ...mockContext, identity },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.createSubscriptionSession).toEqual({
          success: true,
          message: null,
          sessionUrl: "https://checkout.stripe.com/c/pay/cs_pricing",
        });
        expect(create).toHaveBeenCalledTimes(1);
        const [session] = create.mock.calls[0];
        expect(session.line_items[0].price).toBe(priceId);
        expect(session.allow_promotion_codes).toBe(true);
      },
    );

    it.each([
      ["$9.99 monthly", "price_1L9ccEEqsEqs2tLVKPRV17wb"],
      ["$99.99 yearly", "price_1L9ccEEqsEqs2tLVbeBgHm9p"],
    ])(
      "never sells the retired %s Premium price, though its subscribers keep it",
      async (_label, priceId) => {
        const create = jest.fn();
        mockStripeService.getStripeInstance.mockReturnValue({
          checkout: { sessions: { create } },
        });
        mockModels.paidCustomer.findByUserIdAndClientId.mockResolvedValue(null);

        const result = await resolver.createSubscriptionSession(
          "beancount-web-prod",
          priceId,
          mockContext,
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain("no longer offered");
        expect(create).not.toHaveBeenCalled();
      },
    );

    it.each([
      ["an active subscription", { status: "active" }],
      [
        "a past-due subscription Stripe is still retrying",
        {
          status: "past_due",
          latest_invoice: {
            id: "in_1",
            status: "open",
            next_payment_attempt: Math.floor(Date.now() / 1000) + 86_400,
          },
        },
      ],
    ])(
      "refuses a second Checkout to a customer who already pays with %s, so nobody is billed twice",
      async (_label, state) => {
        const mockStripeCheckoutSessions = { create: jest.fn() };
        mockStripeService.getStripeInstance.mockReturnValue({
          checkout: { sessions: mockStripeCheckoutSessions },
        });
        const binding = {
          id: "customer-123",
          userId: "user-123",
          stripeCustomerId: "cus_existing_123",
          clientId: "beancount-web-prod",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockModels.paidCustomer.findByUserIdAndClientId.mockResolvedValue(
          binding,
        );
        mockStripeService.listSubscriptions.mockResolvedValue([
          {
            id: "sub_live",
            livemode: true,
            clientId: "beancount-web-prod",
            items: {
              data: [{ price: { id: "price_1RrSOGEqsEqs2tLVFnyB34qG" } }],
            },
            ...state,
          },
        ]);

        const result = await resolver.createSubscriptionSession(
          "beancount-web-prod",
          "price_1US5htEqsEqs2tLVENCzLaZB",
          mockContext,
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain("already have an active subscription");
        expect(mockStripeCheckoutSessions.create).not.toHaveBeenCalled();
        expect(mockStripeService.listSubscriptions).toHaveBeenCalledWith(
          "user-123",
          { status: "current", bindings: [binding] },
        );
      },
    );

    it("should handle Stripe API errors gracefully", async () => {
      const mockStripeCheckoutSessions = {
        create: jest.fn().mockRejectedValue(new Error("Stripe API error")),
      };

      mockStripeService.getStripeInstance.mockReturnValue({
        checkout: { sessions: mockStripeCheckoutSessions },
      });

      mockModels.paidCustomer.findByUserIdAndClientId.mockResolvedValue(null);

      const result = await resolver.createSubscriptionSession(
        "beancount-web-prod",
        "price_1RrSOGEqsEqs2tLVFnyB34qG",
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("error occurred");
    });

    it("should handle null session URL from Stripe", async () => {
      const mockStripeCheckoutSessions = {
        create: jest.fn().mockResolvedValue({
          id: "cs_test_789",
          url: null,
        }),
      };

      mockStripeService.getStripeInstance.mockReturnValue({
        checkout: { sessions: mockStripeCheckoutSessions },
      });

      mockModels.paidCustomer.findByUserIdAndClientId.mockResolvedValue(null);

      const result = await resolver.createSubscriptionSession(
        "beancount-web-prod",
        "price_1RrSOGEqsEqs2tLVFnyB34qG",
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("cs_test_789");
      expect(result.sessionUrl).toBeUndefined();
    });
  });

  describe("cancelSubscription", () => {
    beforeEach(() => {
      mockStripeService.cancelSubscription = jest.fn();
    });

    it("rejects a scoped token before calling Stripe", async () => {
      const scopedContext = {
        ...mockContext,
        getCurrentIdentity: jest.fn().mockReturnValue({
          userId: "user-123",
          method: "oauth",
          scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
        }),
      } as unknown as IContext;

      await expect(
        resolver.cancelSubscription(
          "sub_123",
          "beancount-web-prod",
          undefined,
          scopedContext,
        ),
      ).rejects.toMatchObject({ category: ErrorCategory.FORBIDDEN });
      expect(mockStripeService.cancelSubscription).not.toHaveBeenCalled();
    });

    it("should throw error when userId is not present", async () => {
      const contextWithoutUserId = {
        ...mockContext,
        userId: "",
        getCurrentUserId: jest.fn().mockImplementation(() => {
          throw new Error("User ID not found in context");
        }),
        getCurrentIdentity: jest.fn().mockImplementation(() => {
          throw new Error("User ID not found in context");
        }),
      } as unknown as IContext;

      await expect(
        resolver.cancelSubscription(
          "sub_123",
          "beancount-web-prod",
          undefined,
          contextWithoutUserId,
        ),
      ).rejects.toThrow("User ID not found in context");
    });

    it("should cancel subscription successfully", async () => {
      mockStripeService.cancelSubscription.mockResolvedValue({
        success: true,
        message: "Subscription cancelled",
      });

      const result = await resolver.cancelSubscription(
        "sub_123",
        "beancount-web-prod",
        undefined,
        mockContext,
      );

      expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith(
        "sub_123",
        "user-123",
        "beancount-web-prod",
        undefined,
      );
      expect(result.success).toBe(true);
    });

    it("passes the subscriber's reason through", async () => {
      mockStripeService.cancelSubscription.mockResolvedValue({ success: true });

      await resolver.cancelSubscription(
        "sub_123",
        "beancount-web-prod",
        "TOO_EXPENSIVE",
        mockContext,
      );

      expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith(
        "sub_123",
        "user-123",
        "beancount-web-prod",
        "TOO_EXPENSIVE",
      );
    });

    it("should return error when cancellation fails", async () => {
      mockStripeService.cancelSubscription.mockResolvedValue({
        success: false,
        message: "Subscription not found",
      });

      const result = await resolver.cancelSubscription(
        "sub_nonexistent",
        "beancount-web-prod",
        undefined,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });
  });

  describe("resumeSubscription", () => {
    beforeEach(() => {
      mockStripeService.resumeSubscription = jest.fn();
    });

    it("should throw error when userId is not present", async () => {
      const contextWithoutUserId = {
        ...mockContext,
        userId: "",
        getCurrentUserId: jest.fn().mockImplementation(() => {
          throw new Error("User ID not found in context");
        }),
        getCurrentIdentity: jest.fn().mockImplementation(() => {
          throw new Error("User ID not found in context");
        }),
      } as unknown as IContext;

      await expect(
        resolver.resumeSubscription(
          "sub_123",
          "beancount-web-prod",
          contextWithoutUserId,
        ),
      ).rejects.toThrow("User ID not found in context");
    });

    it("should resume subscription successfully", async () => {
      mockStripeService.resumeSubscription.mockResolvedValue({
        success: true,
        message: "Subscription resumed successfully.",
      });

      const result = await resolver.resumeSubscription(
        "sub_123",
        "beancount-web-prod",
        mockContext,
      );

      expect(mockStripeService.resumeSubscription).toHaveBeenCalledWith(
        "sub_123",
        "user-123",
        "beancount-web-prod",
      );
      expect(result.success).toBe(true);
    });

    it("should return error when resume fails", async () => {
      mockStripeService.resumeSubscription.mockResolvedValue({
        success: false,
        message: "Subscription not found",
      });

      const result = await resolver.resumeSubscription(
        "sub_nonexistent",
        "beancount-web-prod",
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });
  });

  describe("createStripePortalSession", () => {
    let mockCreateCustomerPortalSession: jest.Mock;

    beforeEach(() => {
      mockCreateCustomerPortalSession = jest.fn();
      mockStripeService.createCustomerPortalSession =
        mockCreateCustomerPortalSession;
    });

    it("should throw error when userId is not present", async () => {
      const contextWithoutUserId = {
        ...mockContext,
        userId: "",
        getCurrentUserId: jest.fn().mockImplementation(() => {
          throw new Error("User ID not found in context");
        }),
        getCurrentIdentity: jest.fn().mockImplementation(() => {
          throw new Error("User ID not found in context");
        }),
      } as unknown as IContext;

      await expect(
        resolver.createStripePortalSession(
          "beancount-web-prod",
          contextWithoutUserId,
        ),
      ).rejects.toThrow("User ID not found in context");
    });

    it("should create portal session successfully", async () => {
      mockCreateCustomerPortalSession.mockResolvedValue({
        success: true,
        sessionId: "bps_123",
        sessionUrl: "https://billing.stripe.com/session/test",
      });

      const result = await resolver.createStripePortalSession(
        "beancount-web-prod",
        mockContext,
      );

      expect(mockCreateCustomerPortalSession).toHaveBeenCalledWith(
        "user-123",
        "beancount-web-prod",
      );
      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("bps_123");
      expect(result.sessionUrl).toBe("https://billing.stripe.com/session/test");
    });

    it("should return error when portal session creation fails", async () => {
      mockCreateCustomerPortalSession.mockResolvedValue({
        success: false,
        message: "Customer not found",
      });

      const result = await resolver.createStripePortalSession(
        "beancount-web-prod",
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Customer not found");
    });

    it("should handle undefined session URL gracefully", async () => {
      mockCreateCustomerPortalSession.mockResolvedValue({
        success: true,
        sessionId: "bps_456",
        sessionUrl: undefined,
      });

      const result = await resolver.createStripePortalSession(
        "beancount-web-prod",
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("bps_456");
      expect(result.sessionUrl).toBeUndefined();
    });
  });

  describe("allTierQuotas", () => {
    it("is reachable anonymously through the real GraphQL schema", async () => {
      const result = await graphql({
        schema: await graphqlSchema,
        source: "query { allTierQuotas { tier } }",
        contextValue: { identity: undefined },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.allTierQuotas).toHaveLength(5);
    });

    it("should return quota items for all 5 tiers", async () => {
      const result = await resolver.allTierQuotas();
      expect(result).toHaveLength(5);
      expect(result.map((r) => r.tier)).toEqual(
        expect.arrayContaining([
          "FREE",
          "PREMIUM",
          "GROWTH",
          "ORGANIZATION",
          "ENTERPRISE",
        ]),
      );
    });

    it("should return correct limits for PREMIUM", async () => {
      const premium = (await resolver.allTierQuotas()).find(
        (r) => r.tier === "PREMIUM",
      );
      expect(premium).toEqual({
        tier: "PREMIUM",
        aiCfoTokensMax: 500_000,
        maxLedgers: 5,
        maxCollaboratorsPerLedger: 5,
        maxDirectives: -1,
      });
    });

    it("should return -1 for ENTERPRISE (unlimited)", async () => {
      const ent = (await resolver.allTierQuotas()).find(
        (r) => r.tier === "ENTERPRISE",
      );
      expect(ent?.aiCfoTokensMax).toBe(-1);
      expect(ent?.maxLedgers).toBe(-1);
      expect(ent?.maxCollaboratorsPerLedger).toBe(-1);
    });

    it("should return correct limits for FREE", async () => {
      const free = (await resolver.allTierQuotas()).find(
        (r) => r.tier === "FREE",
      );
      expect(free).toEqual({
        tier: "FREE",
        aiCfoTokensMax: 20_000,
        maxLedgers: 1,
        maxCollaboratorsPerLedger: 1,
        maxDirectives: 1000,
      });
    });
  });
  describe("previewPlanChange", () => {
    const PREVIEW_QUERY = `query Preview($clientId: String!, $priceId: String!) {
      previewPlanChange(clientId: $clientId, priceId: $priceId) {
        kind
        effect
        refusal
        currentPriceId
        targetPriceId
        currency
        amountDueToday
        creditApplied
        nextAmount
        nextChargeAt
        effectiveAt
        prorationDate
        alternativePriceId
        limitChanges { limit from to }
        paymentMethod { brand last4 }
      }
    }`;

    async function execute(identity: unknown) {
      return graphql({
        schema: await graphqlSchema,
        source: PREVIEW_QUERY,
        variableValues: {
          clientId: "beancount-web-prod",
          priceId: "price_1L9ccEEqsEqs2tLVbeBgHm9p",
        },
        contextValue: {
          ...mockContext,
          identity,
          getCurrentIdentity: () => identity,
        },
      });
    }

    it("returns the server's classification and Stripe's amounts through GraphQL", async () => {
      mockStripeService.previewPlanChange.mockResolvedValue({
        kind: "TO_YEARLY",
        effect: "IMMEDIATE",
        refusal: null,
        currentPriceId: "price_1RrSOGEqsEqs2tLVFnyB34qG",
        targetPriceId: "price_1L9ccEEqsEqs2tLVbeBgHm9p",
        currency: "usd",
        amountDueToday: 9000,
        creditApplied: 999,
        nextAmount: 9999,
        nextChargeAt: new Date("2027-10-17T12:00:00Z"),
        effectiveAt: new Date("2026-10-17T12:00:00Z"),
        prorationDate: 1792238400,
        alternativePriceId: null,
        limitChanges: [{ limit: "maxLedgers", from: 5, to: 5 }],
        paymentMethod: { brand: "visa", last4: "4242" },
      });

      const result = await execute(mockContext.getCurrentIdentity());
      expect(result.errors).toBeUndefined();
      expect(result.data?.previewPlanChange).toMatchObject({
        kind: "TO_YEARLY",
        effect: "IMMEDIATE",
        refusal: null,
        amountDueToday: 9000,
        creditApplied: 999,
        nextChargeAt: "2027-10-17T12:00:00.000Z",
        prorationDate: 1792238400,
        paymentMethod: { brand: "visa", last4: "4242" },
      });
      expect(mockStripeService.previewPlanChange).toHaveBeenCalledWith(
        "user-123",
        "beancount-web-prod",
        "price_1L9ccEEqsEqs2tLVbeBgHm9p",
      );
    });

    it("refuses an OAuth credential before any Stripe work", async () => {
      const result = await execute({
        userId: "user-123",
        method: "oauth",
        scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
      });

      expect(result.errors?.[0]?.originalError).toMatchObject({
        category: ErrorCategory.FORBIDDEN,
      });
      expect(result.data).toBeNull();
      expect(mockStripeService.previewPlanChange).not.toHaveBeenCalled();
    });
  });
  describe("changePlan", () => {
    const CHANGE_MUTATION = `mutation Change($clientId: String!, $priceId: String!, $prorationDate: Int) {
      changePlan(clientId: $clientId, priceId: $priceId, prorationDate: $prorationDate) {
        status kind refusal message clientSecret hostedInvoiceUrl subscriptionId newTier currentPeriodEnd
      }
    }`;

    async function execute(identity: unknown, prorationDate: number | null) {
      return graphql({
        schema: await graphqlSchema,
        source: CHANGE_MUTATION,
        variableValues: {
          clientId: "beancount-web-prod",
          priceId: "price_1L9ccEEqsEqs2tLVbeBgHm9p",
          prorationDate,
        },
        contextValue: {
          ...mockContext,
          identity,
          getCurrentIdentity: () => identity,
        },
      });
    }

    it("passes the previewed proration time through and returns the authentication handoff", async () => {
      mockStripeService.changePlan.mockResolvedValue({
        status: "REQUIRES_ACTION",
        kind: "TO_YEARLY",
        refusal: null,
        message: "Your bank needs to approve this payment.",
        clientSecret: "pi_1_secret",
        hostedInvoiceUrl: "https://invoice.stripe.com/i/in_1",
        subscriptionId: "sub_1",
        newTier: "PREMIUM",
        currentPeriodEnd: null,
      });

      const result = await execute(
        mockContext.getCurrentIdentity(),
        1792238400,
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.changePlan).toMatchObject({
        status: "REQUIRES_ACTION",
        kind: "TO_YEARLY",
        clientSecret: "pi_1_secret",
        hostedInvoiceUrl: "https://invoice.stripe.com/i/in_1",
      });
      expect(mockStripeService.changePlan).toHaveBeenCalledWith(
        "user-123",
        "beancount-web-prod",
        "price_1L9ccEEqsEqs2tLVbeBgHm9p",
        1792238400,
      );
    });

    it("refuses an OAuth credential before any Stripe work", async () => {
      const result = await execute(
        {
          userId: "user-123",
          method: "oauth",
          scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
        },
        null,
      );

      expect(result.errors?.[0]?.originalError).toMatchObject({
        category: ErrorCategory.FORBIDDEN,
      });
      expect(mockStripeService.changePlan).not.toHaveBeenCalled();
    });
  });
});
