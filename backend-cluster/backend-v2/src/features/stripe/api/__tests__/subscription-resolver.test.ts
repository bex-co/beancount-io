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

// Test constants
const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

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
  };
  let mockModels: {
    user: {
      getById: jest.Mock;
    };
    paidCustomer: {
      findByUserIdAndClientId: jest.Mock;
      findByUserIdWithActivePeriod: jest.Mock;
      updateCustomerById: jest.Mock;
      findByUserId: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockStripeService = {
      listSubscriptions: jest.fn(),
      getStripeInstance: jest.fn(),
      cancelSubscription: jest.fn(),
      resumeSubscription: jest.fn(),
      createCustomerPortalSession: jest.fn(),
      upgradeSubscription: jest.fn(),
    };

    mockModels = {
      user: {
        getById: jest.fn(),
      },
      paidCustomer: {
        findByUserIdAndClientId: jest.fn(),
        findByUserIdWithActivePeriod: jest.fn(),
        updateCustomerById: jest.fn(),
        findByUserId: jest.fn(),
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
      mockModels as unknown as Pick<IModels, "paidCustomer" | "user">,
      {} as DbExecutor,
      new AuthorizationService({
        check: async ({ user, object }) => user === object,
      }),
    );
    resolver = new SubscriptionResolver(subscriptions);
  });

  describe("subscriptionStatus", () => {
    it("should return cached subscription status when only hasActiveSubscription requested", async () => {
      // Mock GraphQL info to indicate only hasActiveSubscription is requested
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

      // Mock paidCustomer with valid currentPeriodEnd
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      mockModels.paidCustomer.findByUserIdWithActivePeriod.mockResolvedValue({
        id: "customer-123",
        userId: "user-123",
        stripeCustomerId: "cus_test",
        clientId: "beancount-web-prod",
        currentPeriodEnd: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await resolver.subscriptionStatus(mockContext, mockInfo);

      expect(result.hasActiveSubscription).toBe(true);
      expect(result.subscriptions).toEqual([]);
      expect(mockStripeService.listSubscriptions).not.toHaveBeenCalled();
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
                  id: "price_123",
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

      expect(mockModels.paidCustomer.updateCustomerById).toHaveBeenCalledWith(
        expect.any(Object),
        "customer-123",
        {
          currentPeriodEnd: new Date(newPeriodEnd * 1000),
        },
      );
    });

    it("should not update currentPeriodEnd when dates match", async () => {
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

      expect(mockModels.paidCustomer.updateCustomerById).not.toHaveBeenCalled();
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
        "price_1L9ccEEqsEqs2tLVKPRV17wb", // Valid price ID
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
              price: "price_1L9ccEEqsEqs2tLVKPRV17wb",
              quantity: 1,
            },
          ],
          customer_email: "test@example.com",
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
        "price_1L9ccEEqsEqs2tLVKPRV17wb",
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("cs_test_456");
      expect(mockStripeCheckoutSessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_existing_123",
        }),
      );
      expect(mockModels.user.getById).not.toHaveBeenCalled();
    });

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
        "price_1L9ccEEqsEqs2tLVKPRV17wb",
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
        "price_1L9ccEEqsEqs2tLVKPRV17wb",
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
        mockContext,
      );

      expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith(
        "sub_123",
        "user-123",
        "beancount-web-prod",
      );
      expect(result.success).toBe(true);
    });

    it("should return error when cancellation fails", async () => {
      mockStripeService.cancelSubscription.mockResolvedValue({
        success: false,
        message: "Subscription not found",
      });

      const result = await resolver.cancelSubscription(
        "sub_nonexistent",
        "beancount-web-prod",
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
      const schema = await buildSchema({
        resolvers: [SubscriptionResolver],
        container: { get: () => resolver },
      });
      const result = await graphql({
        schema,
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
});
