import type Stripe from "stripe";
import type { DbExecutor } from "@/drizzle/drizzle";
import { ServiceUnavailableError } from "@/shared/errors";
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
  suppressed = false,
  groupId = 7 as number | null,
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
  const isSuppressed = jest.fn(async () => suppressed);
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
    sendgrid: { isSuppressed },
    groupId: groupId ?? undefined,
  } as unknown as CheckoutRecoveryDeps;
  const check = (session: Stripe.Checkout.Session = expired) =>
    recoveryEligibility(deps, session, BILLING_CLIENT_ID);
  return { check, list, isSuppressed, deps };
}

describe("recoveryEligibility (ADR027 D2, D5, D6)", () => {
  it("accepts a first-time customer who left and did not come back", async () => {
    const { check } = setup();

    await expect(check()).resolves.toEqual({
      eligible: true,
      userId: "usr_alice",
      email: "alice@example.com",
      plan: current,
      groupId: 7,
    });
  });

  it.each<[string, Parameters<typeof setup>[0], string]>([
    ["the email is not configured", { groupId: null }, "disabled"],
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
    ["the user unsubscribed", { suppressed: true }, "unsubscribed"],
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

  it("asks SendGrid last, and only when everything else holds", async () => {
    const { check, isSuppressed } = setup({
      subscriptions: [{ status: "active" }],
    });

    await check();

    expect(isSuppressed).not.toHaveBeenCalled();
  });

  it("lets a provider failure through, so the webhook is redelivered", async () => {
    const { check, deps } = setup();
    (deps.sendgrid.isSuppressed as jest.Mock).mockRejectedValue(
      new ServiceUnavailableError("Email suppression lookup", 5),
    );

    await expect(check()).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});
