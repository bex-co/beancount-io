import type Stripe from "stripe";
import type { DbExecutor } from "@/drizzle/drizzle";
import {
  BILLING_CLIENT_ID,
  SUBSCRIPTION_CONFIG,
  SubscriptionTier,
} from "../../service/stripe";
import {
  recoveryEligibility,
  type CheckoutRecoveryDeps,
} from "../checkout-recovery-email";

const { plans } = SUBSCRIPTION_CONFIG[BILLING_CLIENT_ID];
const current = plans.find(
  (plan) => plan.tier === SubscriptionTier.PREMIUM && !plan.retired,
)!;
const retired = plans.find((plan) => plan.retired)!;

const expired = {
  id: "cs_expired",
  created: 1_800_000_000,
  customer: null,
  metadata: { userId: "usr_alice", clientId: BILLING_CLIENT_ID },
} as unknown as Stripe.Checkout.Session;

type Later = { id: string; status: string; userId: string };

function setup({
  email = "alice@example.com" as string | null,
  priceId = current.priceId,
  subscriptions = [] as { status: string }[],
  storeRows = [] as object[],
  later = [] as Later[],
} = {}) {
  const list = jest.fn(() =>
    (async function* () {
      for (const each of later) {
        yield {
          id: each.id,
          status: each.status,
          metadata: { userId: each.userId },
        };
      }
    })(),
  );
  const deps = {
    stripe: {
      getStripeInstance: jest.fn(() => ({
        checkout: {
          sessions: {
            listLineItems: jest.fn(async () => ({
              data: [{ price: { id: priceId } }],
            })),
            list,
          },
        },
      })),
      listSubscriptions: jest.fn(async () => subscriptions),
    },
    models: {
      user: { getById: jest.fn(async () => (email ? { email } : null)) },
      storeSubscription: { findByUserId: jest.fn(async () => storeRows) },
      sentBillingEmail: { claim: jest.fn(), release: jest.fn() },
    },
    db: {} as DbExecutor,
    sendgrid: {},
    groupId: 7,
  } as unknown as CheckoutRecoveryDeps;
  const check = (session: Stripe.Checkout.Session = expired) =>
    recoveryEligibility(deps, session, BILLING_CLIENT_ID);
  return { check, list, deps };
}

describe("recoveryEligibility (ADR027 D2, D5)", () => {
  it("accepts a first-time customer who left and did not come back", async () => {
    const { check } = setup();

    await expect(check()).resolves.toEqual({
      eligible: true,
      userId: "usr_alice",
      email: "alice@example.com",
      plan: current,
    });
  });

  it.each<[string, Parameters<typeof setup>[0], string]>([
    ["the user has no email", { email: null }, "no-recipient"],
    [
      "the price is not one of ours",
      { priceId: "price_other" },
      "unknown-plan",
    ],
    [
      "the user paid for a subscription that has since ended",
      { subscriptions: [{ status: "canceled" }] },
      "paid-before",
    ],
    [
      "the user pays in an app store",
      { storeRows: [{ id: "store_1" }] },
      "paid-before",
    ],
    [
      "a later session for the user completed",
      { later: [{ id: "cs_2", status: "complete", userId: "usr_alice" }] },
      "back-in-checkout",
    ],
    [
      "the user is in a later session right now",
      { later: [{ id: "cs_2", status: "open", userId: "usr_alice" }] },
      "back-in-checkout",
    ],
  ])("refuses when %s", async (_label, options, reason) => {
    const { check } = setup(options);

    await expect(check()).resolves.toEqual({ eligible: false, reason });
  });

  it("refuses a retired price", async () => {
    const { check } = setup({ priceId: retired.priceId });

    await expect(check()).resolves.toEqual({
      eligible: false,
      reason: "unknown-plan",
    });
  });

  it("refuses a session that names no user", async () => {
    const { check } = setup();

    await expect(
      check({ ...expired, metadata: {} } as Stripe.Checkout.Session),
    ).resolves.toEqual({ eligible: false, reason: "no-recipient" });
  });

  it("counts a subscription that never got paid as no purchase", async () => {
    const { check } = setup({
      subscriptions: [{ status: "incomplete_expired" }],
    });

    await expect(check()).resolves.toMatchObject({ eligible: true });
  });

  it.each([
    [
      "another user's session",
      { id: "cs_2", status: "complete", userId: "usr_bob" },
    ],
    [
      "the expired session itself",
      { id: "cs_expired", status: "open", userId: "usr_alice" },
    ],
    [
      "an earlier abandonment",
      { id: "cs_0", status: "expired", userId: "usr_alice" },
    ],
  ])("ignores %s", async (_label, later) => {
    const { check } = setup({ later: [later] });

    await expect(check()).resolves.toMatchObject({ eligible: true });
  });

  it("lists later sessions from the expired one's creation, by customer when known", async () => {
    const { check, list } = setup();

    await check({ ...expired, customer: "cus_1" } as Stripe.Checkout.Session);

    expect(list).toHaveBeenCalledWith({
      created: { gte: expired.created },
      customer: "cus_1",
      limit: 100,
    });
  });

  it("lets a provider failure through, so the webhook is redelivered", async () => {
    const { check, deps } = setup();
    const outage = new Error("Stripe is unavailable");
    (deps.stripe.listSubscriptions as jest.Mock).mockRejectedValue(outage);

    await expect(check()).rejects.toBe(outage);
  });
});
