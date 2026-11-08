import type Stripe from "stripe";
import type { DbExecutor } from "@/drizzle/drizzle";
import {
  BILLING_CLIENT_ID,
  SUBSCRIPTION_CONFIG,
  SubscriptionTier,
} from "../../service/stripe";
import {
  emailCheckoutRecovery,
  type CheckoutRecoveryDeps,
} from "../checkout-recovery-email";

const { plans } = SUBSCRIPTION_CONFIG[BILLING_CLIENT_ID];
const yearly = plans.find(
  (plan) =>
    plan.tier === SubscriptionTier.PREMIUM &&
    plan.interval === "year" &&
    !plan.retired,
)!;
const NOW = new Date("2026-11-08T12:00:00Z");

const session = (overrides: object = {}) =>
  ({
    id: "cs_1",
    created: 1_800_000_000,
    customer: null,
    metadata: { userId: "usr_alice", clientId: BILLING_CLIENT_ID },
    after_expiration: {
      recovery: { url: "https://checkout.stripe.com/r/live_1" },
    },
    ...overrides,
  }) as unknown as Stripe.Checkout.Session;

/** One user's claim table, shared across calls like the real one. */
function setup({ sendFails = 0 } = {}) {
  const claimed = new Set<string>();
  let failures = sendFails;
  const create = jest.fn(async () => ({ id: "promo_1", code: "K7QX2M9P" }));
  const update = jest.fn(async () => ({}));
  const sendMail = jest.fn(async () => {
    if (failures > 0) {
      failures -= 1;
      throw new Error("SendGrid down");
    }
  });
  const deps = {
    stripe: {
      getStripeInstance: jest.fn(() => ({
        checkout: {
          sessions: {
            listLineItems: jest.fn(async () => ({
              data: [{ price: { id: yearly.priceId } }],
            })),
            list: jest.fn(() => (async function* () {})()),
          },
        },
        promotionCodes: { create, update },
      })),
      listSubscriptions: jest.fn(async () => []),
    },
    models: {
      user: {
        getById: jest.fn(async () => ({ email: "alice@example.com" })),
      },
      storeSubscription: { findByUserId: jest.fn(async () => []) },
      sentBillingEmail: {
        claim: jest.fn(async (_db: unknown, key: string) => {
          if (claimed.has(key)) return false;
          claimed.add(key);
          return true;
        }),
        release: jest.fn(async (_db: unknown, key: string) => {
          claimed.delete(key);
        }),
      },
    },
    db: {} as DbExecutor,
    sendgrid: { isSuppressed: jest.fn(async () => false), sendMail },
    groupId: 7,
  } as unknown as CheckoutRecoveryDeps;
  const send = (expired = session()) =>
    emailCheckoutRecovery(deps, expired, BILLING_CLIENT_ID);
  return { send, create, update, sendMail, claimed };
}

describe("emailCheckoutRecovery (ADR027 D3, D4, D7)", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates one single-use, 48-hour, first-purchase code and mails it", async () => {
    const { send, create, sendMail } = setup();

    await expect(send(session({ customer: "cus_1" }))).resolves.toBe("sent");

    expect(create).toHaveBeenCalledWith({
      promotion: { type: "coupon", coupon: "checkout-recovery-20" },
      max_redemptions: 1,
      expires_at: NOW.getTime() / 1000 + 48 * 60 * 60,
      restrictions: { first_time_transaction: true },
      customer: "cus_1",
      metadata: {
        userId: "usr_alice",
        sessionId: "cs_1",
        source: "checkout-recovery",
      },
    });
    const mail = (sendMail.mock.calls[0] as unknown[])[0] as {
      to: string;
      subject: string;
      text: string;
      asm: object;
    };
    expect(mail.to).toBe("alice@example.com");
    expect(mail.subject).toBe("Your Premium plan is still waiting");
    expect(mail.asm).toEqual({ groupId: 7 });
    expect(mail.text).toContain("K7QX2M9P for 20% off your first year");
    expect(mail.text).toContain(
      "Finish checkout: https://checkout.stripe.com/r/live_1",
    );
  });

  it("sends once per person, across sessions", async () => {
    const { send, create, sendMail } = setup();

    await expect(send(session({ id: "cs_1" }))).resolves.toBe("sent");
    await expect(send(session({ id: "cs_2" }))).resolves.toBe("already-sent");

    expect(create).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("restricts the code to nobody in particular for a new customer", async () => {
    const { send, create } = setup();

    await send();

    expect(create.mock.calls[0]).not.toHaveProperty("0.customer");
  });

  it("falls back to the pricing page without a recovery URL", async () => {
    const { send, sendMail } = setup();

    await send(session({ after_expiration: null }));

    const mail = (sendMail.mock.calls[0] as unknown[])[0] as { text: string };
    expect(mail.text).toMatch(
      /Finish checkout: https:\/\/beancount\.io\/pricing\?plan=premium&billing=yearly/,
    );
  });

  it("deactivates the code and gives the claim back when the send fails", async () => {
    const { send, update, claimed } = setup({ sendFails: 1 });

    await expect(send()).rejects.toThrow("SendGrid down");

    expect(update).toHaveBeenCalledWith("promo_1", { active: false });
    expect(claimed.size).toBe(0);
  });

  it("sends on Stripe's redelivery after a failed send", async () => {
    const { send, sendMail } = setup({ sendFails: 1 });

    await expect(send()).rejects.toThrow();
    await expect(send()).resolves.toBe("sent");

    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("gives the claim back when the code cannot be created", async () => {
    const { send, create, update, sendMail, claimed } = setup();
    create.mockRejectedValueOnce(new Error("Stripe down"));

    await expect(send()).rejects.toThrow("Stripe down");

    expect(update).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(claimed.size).toBe(0);
  });

  it("still rethrows the send failure when deactivation fails too", async () => {
    const { send, update, claimed } = setup({ sendFails: 1 });
    update.mockRejectedValueOnce(new Error("Stripe down"));

    await expect(send()).rejects.toThrow("SendGrid down");

    expect(claimed.size).toBe(0);
  });

  it("claims nothing for an ineligible session", async () => {
    const { send, create, claimed } = setup();

    await expect(send(session({ metadata: {} }))).resolves.toBe("no-recipient");

    expect(create).not.toHaveBeenCalled();
    expect(claimed.size).toBe(0);
  });
});
