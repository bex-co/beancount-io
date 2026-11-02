import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import { aStoreSubscription } from "@/features/store-billing/service/__tests__/test-fixtures";
import type { IAuthorizationService } from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";
import {
  BILLING_CLIENT_ID,
  SUBSCRIPTION_CONFIG,
  SubscriptionTier,
} from "../stripe";
import type { IStripeService } from "../stripe-service";
import { SubscriptionService } from "../subscription-service";

const identity: Identity = {
  userId: "usr_alice",
  method: "session",
  scopes: new Set(),
};
const { plans } = SUBSCRIPTION_CONFIG[BILLING_CLIENT_ID];
const priceOf = (tier: SubscriptionTier) =>
  plans.find((plan) => plan.tier === tier && !plan.retired)!.priceId;

const END = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
const endingGrowth = aStoreSubscription({
  willRenew: false,
  tier: SubscriptionTier.GROWTH,
  accessEndsAt: END,
});

function setup({
  storeRows = [endingGrowth] as object[],
  stripeRows = [] as object[],
  binding = null as object | null,
  preview = {} as object,
} = {}) {
  const create = jest.fn(async () => ({
    id: "cs_1",
    url: "https://checkout.example",
  }));
  const stripe = {
    getStripeInstance: jest.fn(() => ({
      checkout: { sessions: { create } },
    })),
    listSubscriptions: jest.fn(async () => stripeRows),
    defaultCard: jest.fn(async () => null),
    previewPlanChange: jest.fn(async () => preview),
  };
  const models = {
    storeSubscription: { findByUserId: jest.fn(async () => storeRows) },
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
  return { service, create, stripe };
}

const checkout = (service: SubscriptionService, tier: SubscriptionTier) =>
  service.createSubscriptionSession(identity, BILLING_CLIENT_ID, priceOf(tier));

type CheckoutArgs = { subscription_data?: { trial_end?: number } };
const trialEnd = (create: jest.Mock) =>
  (create.mock.calls[0][0] as CheckoutArgs).subscription_data?.trial_end;

const stripeSubscription = (status: string, overrides: object = {}) => ({
  id: "sub_1",
  trial_end: status === "trialing" ? Math.floor(END.getTime() / 1000) : null,
  clientId: BILLING_CLIENT_ID,
  livemode: true,
  status,
  customer: "cus_1",
  cancel_at_period_end: false,
  cancel_at: null,
  items: {
    data: [
      {
        id: "si_1",
        current_period_start: 1,
        current_period_end: 2,
        price: {
          id: priceOf(SubscriptionTier.GROWTH),
          product: { id: "prod_1", name: "Growth", deleted: false },
          unit_amount: 9999,
          currency: "usd",
          recurring: { interval: "month", interval_count: 1 },
        },
      },
    ],
  },
  ...overrides,
});

describe("switching from a store to Stripe (ADR 001 D15)", () => {
  it("starts a covered plan when the store plan ends", async () => {
    const { service, create } = setup();

    const result = await checkout(service, SubscriptionTier.GROWTH);

    expect(result.success).toBe(true);
    expect(trialEnd(create)).toBe(Math.floor(END.getTime() / 1000));
  });

  it("charges a higher tier at once", async () => {
    const { service, create } = setup();

    await checkout(service, SubscriptionTier.ORGANIZATION);

    expect(trialEnd(create)).toBeUndefined();
  });

  it("changes nothing for an account with no store plan", async () => {
    const { service, create } = setup({ storeRows: [] });

    await checkout(service, SubscriptionTier.GROWTH);

    expect(trialEnd(create)).toBeUndefined();
  });

  it("refuses a second Checkout while a deferred plan waits to start", async () => {
    const { service, create } = setup({
      binding: { stripeCustomerId: "cus_1" },
      stripeRows: [stripeSubscription("trialing")],
    });

    const result = await checkout(service, SubscriptionTier.GROWTH);

    expect(result.success).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("previews a deferred purchase as nothing due until the store plan ends", async () => {
    const preview = {
      kind: "NEW",
      targetPriceId: priceOf(SubscriptionTier.GROWTH),
      amountDueToday: 9999,
      nextChargeAt: null,
    };
    const { service } = setup({ preview });

    await expect(
      service.previewPlanChange(
        identity,
        BILLING_CLIENT_ID,
        preview.targetPriceId,
      ),
    ).resolves.toMatchObject({
      amountDueToday: 0,
      effectiveAt: END,
      nextChargeAt: END,
      storeOverlap: { endsAt: END, deferred: true },
    });
  });

  it("keeps a higher tier's price today and names the overlap", async () => {
    const preview = {
      kind: "NEW",
      targetPriceId: priceOf(SubscriptionTier.ORGANIZATION),
      amountDueToday: 49999,
      nextChargeAt: null,
    };
    const { service } = setup({ preview });

    await expect(
      service.previewPlanChange(
        identity,
        BILLING_CLIENT_ID,
        preview.targetPriceId,
      ),
    ).resolves.toMatchObject({
      amountDueToday: 49999,
      storeOverlap: { deferred: false },
    });
  });

  it("leaves a change to an existing Stripe plan alone", async () => {
    const preview = {
      kind: "UPGRADE",
      targetPriceId: priceOf(SubscriptionTier.GROWTH),
      amountDueToday: 500,
    };
    const { service } = setup({ preview });

    await expect(
      service.previewPlanChange(
        identity,
        BILLING_CLIENT_ID,
        preview.targetPriceId,
      ),
    ).resolves.toEqual(preview);
  });

  it("reports Stripe as the source once a deferred plan is bought", async () => {
    const { service } = setup({
      stripeRows: [stripeSubscription("trialing")],
    });

    const status = await service.subscriptionStatus(identity, "full");

    expect(status.hasActiveSubscription).toBe(false);
    expect(status.billing).toMatchObject({
      source: "STRIPE",
      duplicateBilling: false,
      stripeRenews: true,
      // Stripe counts in whole seconds.
      stripeStartsAt: new Date(Math.floor(END.getTime() / 1000) * 1000),
      store: { willRenew: false },
    });
  });

  it("answers who bills the plan without Stripe's product and card details", async () => {
    const { service, stripe } = setup({
      stripeRows: [stripeSubscription("trialing")],
    });

    const status = await service.subscriptionStatus(identity, "billing");

    expect(status.subscriptions).toEqual([]);
    expect(status.billing).toMatchObject({ source: "STRIPE" });
    expect(stripe.defaultCard).not.toHaveBeenCalled();
    expect(stripe.listSubscriptions).toHaveBeenCalledWith(
      "usr_alice",
      expect.objectContaining({ status: "current" }),
    );
  });

  it("flags paying twice if the store renews again over a deferred plan", async () => {
    const { service } = setup({
      storeRows: [aStoreSubscription({ accessEndsAt: END })],
      stripeRows: [stripeSubscription("trialing")],
    });

    const status = await service.subscriptionStatus(identity, "full");

    // Both sources are named, so the banner can say Stripe is one of them.
    expect(status.billing).toMatchObject({
      duplicateBilling: true,
      stripeRenews: true,
    });
  });
});
