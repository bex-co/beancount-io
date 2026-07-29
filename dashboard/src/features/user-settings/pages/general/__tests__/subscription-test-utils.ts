import type { GetSubscriptionStatusQuery } from "@/graphql/definitions";

export const MOCK_TIER_QUOTAS = [
  {
    tier: "FREE",
    aiCfoTokensMax: 50_000,
    maxLedgers: 1,
    maxCollaboratorsPerLedger: 1,
    maxDirectives: 1000,
  },
  {
    tier: "PREMIUM",
    aiCfoTokensMax: 500_000,
    maxLedgers: 5,
    maxCollaboratorsPerLedger: 5,
    maxDirectives: -1,
  },
  {
    tier: "GROWTH",
    aiCfoTokensMax: 2_000_000,
    maxLedgers: 20,
    maxCollaboratorsPerLedger: 10,
    maxDirectives: -1,
  },
  {
    tier: "ORGANIZATION",
    aiCfoTokensMax: 10_000_000,
    maxLedgers: 100,
    maxCollaboratorsPerLedger: 50,
    maxDirectives: -1,
  },
  {
    tier: "ENTERPRISE",
    aiCfoTokensMax: -1,
    maxLedgers: -1,
    maxCollaboratorsPerLedger: -1,
    maxDirectives: -1,
  },
];

export const mockActiveSubscriptionData: GetSubscriptionStatusQuery = {
  subscriptionStatus: {
    __typename: "CustomerSubscriptionStatus",
    hasActiveSubscription: true,
    subscriptions: [
      {
        __typename: "Subscription",
        id: "sub_123",
        clientId: "test-client",
        status: "active",
        cancelAt: null,
        canceledAt: null,
        cancelAtPeriodEnd: false,
        currentPeriodStart: "2024-12-01T00:00:00Z",
        currentPeriodEnd: "2024-12-31T23:59:59Z",
        items: [
          {
            __typename: "SubscriptionItem",
            id: "si_1",
            product: {
              __typename: "SubscriptionProduct",
              id: "prod_1",
              name: "Pro Plan",
              description: null,
              images: null,
            },
            price: {
              __typename: "SubscriptionPrice",
              id: "price_1",
              amount: 2900,
              currency: "usd",
              interval: "month",
              intervalCount: null,
              trialPeriodDays: null,
            },
            quantity: 1,
          },
        ],
      },
    ],
  },
};

export const mockNoSubscriptionData: GetSubscriptionStatusQuery = {
  subscriptionStatus: {
    __typename: "CustomerSubscriptionStatus",
    hasActiveSubscription: false,
    subscriptions: [],
  },
};

export const mockCanceledSubscriptionData: GetSubscriptionStatusQuery = {
  subscriptionStatus: {
    __typename: "CustomerSubscriptionStatus",
    hasActiveSubscription: true,
    subscriptions: [
      {
        __typename: "Subscription",
        id: "sub_456",
        clientId: "test-client",
        status: "active",
        cancelAt: "2024-12-31T23:59:59Z",
        canceledAt: null,
        cancelAtPeriodEnd: true,
        currentPeriodStart: "2024-12-01T00:00:00Z",
        currentPeriodEnd: "2024-12-31T23:59:59Z",
        items: [
          {
            __typename: "SubscriptionItem",
            id: "si_1",
            product: {
              __typename: "SubscriptionProduct",
              id: "prod_1",
              name: "Pro Plan",
              description: null,
              images: null,
            },
            price: {
              __typename: "SubscriptionPrice",
              id: "price_1",
              amount: 2900,
              currency: "usd",
              interval: "month",
              intervalCount: null,
              trialPeriodDays: null,
            },
            quantity: 1,
          },
        ],
      },
    ],
  },
};
