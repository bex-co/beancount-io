import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { IAuthorizationService } from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";
import {
  BILLING_CLIENT_ID,
  SUBSCRIPTION_CONFIG,
  SubscriptionTier,
} from "../stripe";
import type { IStripeService } from "../stripe-service";
import {
  CHECKOUT_SESSION_LIFETIME_SECONDS,
  SubscriptionService,
} from "../subscription-service";

const identity: Identity = {
  userId: "usr_alice",
  method: "session",
  scopes: new Set(),
};
const priceId = SUBSCRIPTION_CONFIG[BILLING_CLIENT_ID].plans.find(
  (plan) => plan.tier === SubscriptionTier.GROWTH && !plan.retired,
)!.priceId;
const NOW = new Date("2026-11-08T12:00:00Z");

function setup(binding: object | null) {
  const create = jest.fn(async () => ({
    id: "cs_1",
    url: "https://checkout.example",
  }));
  const stripe = {
    getStripeInstance: jest.fn(() => ({ checkout: { sessions: { create } } })),
    listSubscriptions: jest.fn(async () => []),
  };
  const models = {
    storeSubscription: { findByUserId: jest.fn(async () => []) },
    paidCustomer: {
      findByUserIdAndClientId: jest.fn(async () => binding),
      findByUserId: jest.fn(async () => []),
    },
    user: { getById: jest.fn(async () => ({ email: "alice@example.com" })) },
  };
  const service = new SubscriptionService(
    stripe as unknown as IStripeService,
    models as unknown as Pick<
      IModels,
      "paidCustomer" | "user" | "storeSubscription"
    >,
    {} as DbExecutor,
    {
      authorizeOrThrow: jest.fn(async () => undefined),
    } as unknown as IAuthorizationService,
  );
  return { service, create };
}

describe("Checkout session lifetime and recovery (ADR027 D1, D3)", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ["a new customer", null],
    ["a returning Stripe customer", { stripeCustomerId: "cus_1" }],
  ])(
    "expires after 90 minutes with recovery on for %s",
    async (_label, binding) => {
      const { service, create } = setup(binding);

      const result = await service.createSubscriptionSession(
        identity,
        BILLING_CLIENT_ID,
        priceId,
      );

      expect(result.success).toBe(true);
      const args = (create.mock.calls[0] as unknown[])[0] as Record<
        string,
        unknown
      >;
      expect(CHECKOUT_SESSION_LIFETIME_SECONDS).toBe(90 * 60);
      expect(args.expires_at).toBe(NOW.getTime() / 1000 + 90 * 60);
      expect(args.after_expiration).toEqual({
        recovery: { enabled: true, allow_promotion_codes: true },
      });
      expect(args).not.toHaveProperty("consent_collection");
    },
  );
});
