import "reflect-metadata";
import Router from "@koa/router";
import { setStripeWebhookHandler } from "../stripe-webhook-handler";
import { BILLING_CLIENT_ID } from "../../service/stripe";
import { SUBSCRIPTION_PERIOD_VERIFICATION_VERSION } from "../../service/subscription-plan";
import type { AppLayers } from "@/foundation/composition";

jest.mock("@/features/stripe/service/stripe", () => {
  const actual = jest.requireActual("@/features/stripe/service/stripe");
  return {
    ...actual,
    SUBSCRIPTION_CONFIG: {
      "beancount-web-prod": {
        ...actual.SUBSCRIPTION_CONFIG["beancount-web-prod"],
        webhookSecret: "whsec_synthetic",
      },
    },
  };
});
jest.mock("@/server/rest/openapi-registry", () => ({
  registerRoute: jest.fn(),
}));
const mockEmailScheduledChange = jest.fn(async () => "sent");
jest.mock("../../operations/plan-change-email", () => ({
  ...jest.requireActual("../../operations/plan-change-email"),
  emailScheduledChange: (...args: unknown[]) =>
    mockEmailScheduledChange(...(args as [])),
}));

const mockEmailFailedRenewal = jest.fn(async () => "sent");
const mockEmailPlanEnded = jest.fn(async () => "not-applicable");
const mockEmailRenewalReminder = jest.fn(async () => "not-applicable");
jest.mock("../../operations/renewal-email", () => ({
  ...jest.requireActual("../../operations/renewal-email"),
  emailFailedRenewal: (...args: unknown[]) =>
    mockEmailFailedRenewal(...(args as [])),
  emailPlanEnded: (...args: unknown[]) => mockEmailPlanEnded(...(args as [])),
  emailRenewalReminder: (...args: unknown[]) =>
    mockEmailRenewalReminder(...(args as [])),
}));

function setup(event: any) {
  const constructEvent = jest.fn(() => event);
  const retrieveSubscription = jest.fn(async (id: string) => ({
    id,
    schedule: null,
    items: { data: [] },
  }));
  const listInvoicePayments = jest.fn(async () => ({ data: [] as unknown[] }));
  const stripe = {
    getStripeInstance: jest.fn(() => ({
      webhooks: { constructEvent },
      subscriptions: { retrieve: retrieveSubscription },
      invoicePayments: { list: listInvoicePayments },
    })),
    handleCustomerEvent: jest.fn(),
    handleCheckoutSessionCompleted: jest.fn(),
    listSubscriptions: jest.fn(async () => []),
  };
  const paidCustomer = {
    findByStripeCustomerIdAndClientId: jest.fn(async () => ({
      userId: "usr_synthetic",
    })),
    findByUserId: jest.fn(async () => []),
    updatePeriodIfUnchanged: jest.fn(),
  };
  const router = new Router();
  setStripeWebhookHandler(router, {
    services: { stripe },
    clients: { sendgrid: {} },
    database: { db: {}, models: { paidCustomer } },
  } as unknown as AppLayers);
  const handler = router.stack.find((layer) => layer.methods.includes("POST"))!
    .stack[0];
  const ctx: any = {
    request: {
      headers: { "stripe-signature": "sig_synthetic" },
      rawBody: "raw signed payload",
    },
  };
  return {
    stripe,
    paidCustomer,
    constructEvent,
    retrieveSubscription,
    listInvoicePayments,
    ctx,
    run: () => handler(ctx, async () => {}),
  };
}
const subscriptionEvent = (overrides = {}) => ({
  id: "evt_synthetic",
  livemode: true,
  type: "customer.subscription.updated",
  data: { object: { customer: "cus_synthetic", metadata: {} } },
  ...overrides,
});

describe("live Stripe webhook boundary", () => {
  it("revalidates and clears a historical period on a verified live webhook", async () => {
    const t = setup(subscriptionEvent());
    const binding = {
      id: "binding_synthetic",
      userId: "usr_synthetic",
      clientId: BILLING_CLIENT_ID,
      stripeCustomerId: "cus_synthetic",
      currentPeriodEnd: new Date(2100000000000),
    };
    t.paidCustomer.findByUserId.mockResolvedValue([binding] as never);
    await t.run();
    expect(t.paidCustomer.updatePeriodIfUnchanged).toHaveBeenCalledWith(
      {},
      binding,
      null,
      SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
      null,
    );
    expect(t.ctx.body.processed).toBe(true);
  });
  it("verifies with the configured live secret before consulting metadata", async () => {
    const t = setup(subscriptionEvent());
    await t.run();
    expect(t.constructEvent).toHaveBeenCalledWith(
      "raw signed payload",
      "sig_synthetic",
      "whsec_synthetic",
    );
    expect(
      t.paidCustomer.findByStripeCustomerIdAndClientId,
    ).toHaveBeenCalledWith({}, "cus_synthetic", BILLING_CLIENT_ID);
    // Webhooks refresh periods only; they never pay to expand schedules.
    expect(t.stripe.listSubscriptions).toHaveBeenCalledWith("usr_synthetic", {
      bindings: [],
      status: "current",
      expandForStatus: false,
    });
    expect(t.ctx.body.processed).toBe(true);
  });
  it.each([
    subscriptionEvent({ livemode: false }),
    subscriptionEvent({
      data: { object: { metadata: { clientId: "beancount-web-dev" } } },
    }),
  ])(
    "acknowledges retired/test events without any billing work",
    async (event) => {
      const t = setup(event);
      await t.run();
      expect(t.ctx.status).toBe(200);
      expect(t.ctx.body.processed).toBe(false);
      expect(
        t.paidCustomer.findByStripeCustomerIdAndClientId,
      ).not.toHaveBeenCalled();
      expect(t.stripe.listSubscriptions).not.toHaveBeenCalled();
    },
  );
  it.each([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ])(
    "re-reads current state for %s rather than copying the event period",
    async (type) => {
      const t = setup(subscriptionEvent({ type }));
      await t.run();
      expect(t.stripe.listSubscriptions).toHaveBeenCalledTimes(1);
      expect(t.paidCustomer.updatePeriodIfUnchanged).not.toHaveBeenCalled();
    },
  );
  it("ignores a mismatched user without updating another binding", async () => {
    const t = setup(
      subscriptionEvent({
        data: {
          object: {
            customer: "cus_synthetic",
            metadata: { userId: "usr_other" },
          },
        },
      }),
    );
    await t.run();
    expect(t.stripe.listSubscriptions).not.toHaveBeenCalled();
    expect(t.ctx.body.processed).toBe(false);
  });
  it("does no work on invalid signatures or missing input", async () => {
    const t = setup(subscriptionEvent());
    t.constructEvent.mockImplementation(() => {
      throw new Error("invalid signature");
    });
    await t.run();
    expect(t.ctx.status).toBe(400);
    expect(t.stripe.listSubscriptions).not.toHaveBeenCalled();
    delete t.ctx.request.headers["stripe-signature"];
    await t.run();
    expect(t.ctx.status).toBe(400);
    t.ctx.request.headers["stripe-signature"] = "sig";
    t.ctx.request.rawBody = "";
    await t.run();
    expect(t.ctx.status).toBe(400);
  });
  it("lets Stripe retry transient provider failures without clearing caches", async () => {
    const t = setup(subscriptionEvent());
    t.stripe.listSubscriptions.mockRejectedValue(
      new Error("unavailable") as never,
    );
    await t.run();
    expect(t.ctx.status).toBe(400);
    expect(t.paidCustomer.updatePeriodIfUnchanged).not.toHaveBeenCalled();
  });
  it("passes verified checkout metadata to customer binding creation", async () => {
    const object = {
      customer: "cus_synthetic",
      metadata: { userId: "usr_synthetic", clientId: BILLING_CLIENT_ID },
    };
    const t = setup(
      subscriptionEvent({
        type: "checkout.session.completed",
        data: { object },
      }),
    );
    await t.run();
    expect(t.stripe.handleCheckoutSessionCompleted).toHaveBeenCalledWith(
      object,
      BILLING_CLIENT_ID,
      "usr_synthetic",
    );
  });
});

describe("a scheduled plan change taking effect", () => {
  it("refreshes the binding from the subscription's new price at the phase change", async () => {
    // Stripe moves the subscription to the scheduled price and sends
    // customer.subscription.updated; the schedule may still be attached.
    const PERIOD_END = 2_100_000_000;
    const t = setup(subscriptionEvent());
    const binding = {
      id: "binding_synthetic",
      userId: "usr_synthetic",
      clientId: BILLING_CLIENT_ID,
      stripeCustomerId: "cus_synthetic",
    };
    t.paidCustomer.findByUserId.mockResolvedValue([binding] as never);
    t.stripe.listSubscriptions.mockResolvedValue([
      {
        id: "sub_synthetic",
        customer: "cus_synthetic",
        clientId: BILLING_CLIENT_ID,
        livemode: true,
        status: "active",
        schedule: "sub_sched_synthetic",
        items: {
          data: [
            {
              price: { id: "price_1RrSOGEqsEqs2tLVFnyB34qG" },
              current_period_end: PERIOD_END,
            },
          ],
        },
      },
    ] as never);

    await t.run();

    expect(t.paidCustomer.updatePeriodIfUnchanged).toHaveBeenCalledWith(
      {},
      binding,
      new Date(PERIOD_END * 1000),
      SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
      "PREMIUM",
    );
  });
});

describe("upcoming invoices", () => {
  const GROWTH_YEARLY = "price_1SyPdbEqsEqs2tLV7PJyWZed";
  const PREMIUM_YEARLY = "price_1US5htEqsEqs2tLVENCzLaZB";
  const RENEWAL = 1_823_774_400;
  const upcoming = (price = PREMIUM_YEARLY) => ({
    id: "evt_synthetic",
    livemode: true,
    type: "invoice.upcoming",
    data: {
      object: {
        customer: "cus_synthetic",
        metadata: {},
        lines: { data: [{ pricing: { price_details: { price } } }] },
        parent: { subscription_details: { subscription: "sub_synthetic" } },
      },
    },
  });
  /** Growth yearly, scheduled to become Premium yearly at this renewal. */
  const withChange = (changeAt = RENEWAL) => ({
    id: "sub_synthetic",
    schedule: {
      id: "sub_sched_synthetic",
      status: "active",
      current_phase: { start_date: RENEWAL - 31_536_000, end_date: changeAt },
      phases: [
        { start_date: RENEWAL - 31_536_000, items: [{ price: GROWTH_YEARLY }] },
        { start_date: changeAt, items: [{ price: PREMIUM_YEARLY }] },
      ],
    },
    items: {
      data: [{ price: { id: GROWTH_YEARLY }, current_period_end: RENEWAL }],
    },
  });

  beforeEach(() => {
    mockEmailScheduledChange.mockClear();
    mockEmailRenewalReminder.mockClear();
  });

  it("reminds the bound subscriber about the plan change this renewal brings", async () => {
    const t = setup(upcoming());
    t.retrieveSubscription.mockResolvedValue(withChange() as never);
    await t.run();

    expect(t.retrieveSubscription).toHaveBeenCalledWith("sub_synthetic", {
      expand: ["schedule"],
    });
    expect(mockEmailScheduledChange).toHaveBeenCalledWith(
      expect.objectContaining({ sendgrid: {} }),
      "reminder",
      "usr_synthetic",
      BILLING_CLIENT_ID,
      expect.objectContaining({
        scheduleId: "sub_sched_synthetic",
        change: {
          priceId: PREMIUM_YEARLY,
          effectiveAt: new Date(RENEWAL * 1000),
        },
      }),
    );
    expect(mockEmailRenewalReminder).not.toHaveBeenCalled();
    expect(t.ctx.status).toBe(200);
    expect(t.ctx.body.processed).toBe(true);
  });

  it("sends the renewal reminder instead when no change lands at this renewal", async () => {
    const plain = setup(upcoming());
    await plain.run();
    const later = setup(upcoming());
    later.retrieveSubscription.mockResolvedValue(
      withChange(RENEWAL + 31_536_000) as never,
    );
    await later.run();

    expect(mockEmailScheduledChange).not.toHaveBeenCalled();
    expect(mockEmailRenewalReminder).toHaveBeenCalledTimes(2);
    expect(mockEmailRenewalReminder).toHaveBeenLastCalledWith(
      expect.objectContaining({ sendgrid: {} }),
      "usr_synthetic",
      BILLING_CLIENT_ID,
      expect.objectContaining({ customer: "cus_synthetic" }),
      expect.objectContaining({ id: "sub_synthetic" }),
    );
    expect(later.ctx.body.processed).toBe(false);
  });

  it("reports a sent renewal reminder as processed, and redelivers a failed one", async () => {
    mockEmailRenewalReminder.mockResolvedValueOnce("sent");
    const sent = setup(upcoming());
    await sent.run();
    mockEmailRenewalReminder.mockRejectedValueOnce(new Error("SendGrid down"));
    const failed = setup(upcoming());
    await failed.run();

    expect(sent.ctx.body.processed).toBe(true);
    expect(failed.ctx.status).toBe(400);
  });

  it("answers with an error when the reminder cannot be sent, so Stripe redelivers", async () => {
    mockEmailScheduledChange.mockRejectedValueOnce(new Error("SendGrid down"));
    const t = setup(upcoming());
    t.retrieveSubscription.mockResolvedValue(withChange() as never);
    await t.run();

    expect(t.ctx.status).toBe(400);
  });

  it("leaves another product's renewal before any lookup", async () => {
    const t = setup(upcoming("price_other_product"));
    await t.run();

    expect(
      t.paidCustomer.findByStripeCustomerIdAndClientId,
    ).not.toHaveBeenCalled();
    expect(t.retrieveSubscription).not.toHaveBeenCalled();
  });

  it("ignores an upcoming invoice for a customer no account binds", async () => {
    const t = setup(upcoming());
    t.paidCustomer.findByStripeCustomerIdAndClientId.mockResolvedValue(
      null as never,
    );
    await t.run();

    expect(t.retrieveSubscription).not.toHaveBeenCalled();
    expect(mockEmailScheduledChange).not.toHaveBeenCalled();
    expect(mockEmailRenewalReminder).not.toHaveBeenCalled();
    expect(t.ctx.body.processed).toBe(false);
  });
});

describe("failed renewal charges", () => {
  const PREMIUM_YEARLY = "price_1US5htEqsEqs2tLVENCzLaZB";
  const NEXT_ATTEMPT = 1_824_000_000;
  const FINALIZED = 1_823_000_000;
  const DAY = 24 * 60 * 60;
  /** A failed charge `days` after the renewal invoice was finalized. */
  const failed = (invoice: Record<string, unknown> = {}, days = 7) => ({
    id: "evt_synthetic",
    livemode: true,
    type: "invoice.payment_failed",
    created: FINALIZED + days * DAY,
    data: {
      object: {
        id: "in_synthetic",
        customer: "cus_synthetic",
        metadata: {},
        billing_reason: "subscription_cycle",
        attempt_count: 2,
        created: FINALIZED - 3600,
        status_transitions: { finalized_at: FINALIZED },
        next_payment_attempt: NEXT_ATTEMPT,
        amount_due: 14388,
        currency: "usd",
        lines: {
          data: [{ pricing: { price_details: { price: PREMIUM_YEARLY } } }],
        },
        ...invoice,
      },
    },
  });

  beforeEach(() => mockEmailFailedRenewal.mockClear());

  it("emails the bound subscriber once a renewal has been failing for a week", async () => {
    const t = setup(failed());
    await t.run();

    expect(mockEmailFailedRenewal).toHaveBeenCalledWith(
      expect.objectContaining({ sendgrid: {} }),
      "usr_synthetic",
      BILLING_CLIENT_ID,
      expect.objectContaining({ id: "in_synthetic" }),
      expect.objectContaining({ priceId: PREMIUM_YEARLY }),
    );
    expect(t.listInvoicePayments).toHaveBeenCalledWith({
      invoice: "in_synthetic",
      expand: ["data.payment.payment_intent"],
    });
    expect(t.ctx.status).toBe(200);
    expect(t.ctx.body.processed).toBe(true);
  });

  it("emails a week in even when the failure does not say when Stripe retries", async () => {
    const t = setup(failed({ next_payment_attempt: null }));
    await t.run();

    expect(mockEmailFailedRenewal).toHaveBeenCalledTimes(1);
  });

  it("stays quiet through the first week, before any lookup: most renewals recover", async () => {
    for (const days of [0, 3, 5.9]) {
      const t = setup(failed({ attempt_count: 1 }, days));
      await t.run();

      expect(t.ctx.body.processed).toBe(false);
      expect(
        t.paidCustomer.findByStripeCustomerIdAndClientId,
      ).not.toHaveBeenCalled();
    }
    expect(mockEmailFailedRenewal).not.toHaveBeenCalled();
  });

  it("times the failure by the event, not by when it is delivered", async () => {
    jest.useFakeTimers({ now: (FINALIZED + 60 * DAY) * 1000 });
    try {
      const t = setup(failed({ attempt_count: 1 }, 1));
      await t.run();
    } finally {
      jest.useRealTimers();
    }

    expect(mockEmailFailedRenewal).not.toHaveBeenCalled();
  });

  it("leaves a charge waiting on the bank to Stripe's confirm-payment email", async () => {
    const t = setup(failed());
    t.listInvoicePayments.mockResolvedValue({
      data: [{ payment: { payment_intent: { status: "requires_action" } } }],
    });
    await t.run();

    expect(mockEmailFailedRenewal).not.toHaveBeenCalled();
    expect(t.ctx.body.processed).toBe(false);
  });

  it("leaves plan-change charges and other products' invoices before any lookup", async () => {
    const change = setup(failed({ billing_reason: "subscription_update" }));
    await change.run();
    const other = setup(
      failed({
        lines: {
          data: [{ pricing: { price_details: { price: "price_other" } } }],
        },
      }),
    );
    await other.run();

    for (const t of [change, other]) {
      expect(
        t.paidCustomer.findByStripeCustomerIdAndClientId,
      ).not.toHaveBeenCalled();
      expect(t.listInvoicePayments).not.toHaveBeenCalled();
    }
    expect(mockEmailFailedRenewal).not.toHaveBeenCalled();
  });

  it("ignores a failed charge for a customer no account binds", async () => {
    const t = setup(failed());
    t.paidCustomer.findByStripeCustomerIdAndClientId.mockResolvedValue(
      null as never,
    );
    await t.run();

    expect(t.listInvoicePayments).not.toHaveBeenCalled();
    expect(mockEmailFailedRenewal).not.toHaveBeenCalled();
  });

  it("answers with an error when the email cannot be sent, so Stripe redelivers", async () => {
    mockEmailFailedRenewal.mockRejectedValueOnce(new Error("SendGrid down"));
    const t = setup(failed());
    await t.run();

    expect(t.ctx.status).toBe(400);
  });
});

describe("a plan ending", () => {
  const ended = (type = "customer.subscription.deleted") =>
    subscriptionEvent({
      type,
      data: {
        object: {
          id: "sub_synthetic",
          customer: "cus_synthetic",
          metadata: {},
          status: "canceled",
          cancellation_details: { reason: "payment_failed" },
        },
      },
    });

  beforeEach(() => mockEmailPlanEnded.mockClear());

  it("tells the bound subscriber, after the cached plan is refreshed", async () => {
    const t = setup(ended());
    t.stripe.listSubscriptions.mockImplementation(async () => {
      expect(mockEmailPlanEnded).not.toHaveBeenCalled();
      return [];
    });
    await t.run();

    expect(t.stripe.listSubscriptions).toHaveBeenCalled();
    expect(mockEmailPlanEnded).toHaveBeenCalledWith(
      expect.objectContaining({ sendgrid: {} }),
      "usr_synthetic",
      BILLING_CLIENT_ID,
      expect.objectContaining({ id: "sub_synthetic" }),
    );
    expect(t.ctx.body.processed).toBe(true);
  });

  it("tells nobody on a subscription that was only updated", async () => {
    const t = setup(ended("customer.subscription.updated"));
    await t.run();

    expect(mockEmailPlanEnded).not.toHaveBeenCalled();
  });

  it("answers with an error when the email cannot be sent, so Stripe redelivers", async () => {
    mockEmailPlanEnded.mockRejectedValueOnce(new Error("SendGrid down"));
    const t = setup(ended());
    await t.run();

    expect(t.ctx.status).toBe(400);
  });
});
