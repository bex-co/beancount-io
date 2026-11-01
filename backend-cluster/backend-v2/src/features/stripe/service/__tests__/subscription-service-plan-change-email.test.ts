import { SubscriptionService } from "../subscription-service";
import { BILLING_CLIENT_ID } from "../stripe";

const GROWTH_YEARLY = "price_1SyPdbEqsEqs2tLV7PJyWZed";
const PREMIUM_YEARLY = "price_1US5htEqsEqs2tLVENCzLaZB";
const at = new Date(1_823_774_400 * 1000); // 2027-10-17T12:00:00Z

const identity = {
  userId: "usr_1",
  method: "session",
  scopes: new Set<string>(),
} as never;

/** What the apply operation reports after scheduling Premium yearly. */
function scheduled(previous: { priceId: string; effectiveAt: Date } | null) {
  return {
    status: "SCHEDULED",
    kind: "DOWNGRADE",
    subscriptionId: "sub_1",
    effectiveAt: at,
    scheduledNotice: {
      subscriptionId: "sub_1",
      scheduleId: "sub_sched_1",
      currentPriceId: GROWTH_YEARLY,
      change: { priceId: PREMIUM_YEARLY, effectiveAt: at },
      previous,
    },
  };
}

function setup(result: object) {
  const getStripeInstance = jest.fn();
  const sendMail = jest.fn(async () => undefined);
  const service = new SubscriptionService(
    { changePlan: jest.fn(async () => result), getStripeInstance } as never,
    {
      user: { getById: async () => ({ email: "subscriber@example.test" }) },
      storeSubscription: { findByUserId: async () => [] },
    } as never,
    {} as never,
    { authorizeOrThrow: jest.fn(async () => undefined) } as never,
    {
      sendgrid: { sendMail } as never,
      sentBillingEmail: {
        claim: jest.fn(async () => true),
        release: jest.fn(),
      } as never,
    },
  );
  const confirm = () =>
    service.changePlan(identity, BILLING_CLIENT_ID, PREMIUM_YEARLY);
  return { confirm, sendMail, getStripeInstance };
}

describe("SubscriptionService.changePlan confirmation email", () => {
  it("confirms a newly scheduled change from what was scheduled, without another Stripe read", async () => {
    const { confirm, sendMail, getStripeInstance } = setup(scheduled(null));

    const result = await confirm();

    expect(result.status).toBe("SCHEDULED");
    // The email's facts stay inside the service.
    expect(result).not.toHaveProperty("scheduledNotice");
    expect(getStripeInstance).not.toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Your plan changes to Premium · Yearly on October 17, 2027",
      }),
    );
  });

  it("announces nothing when a confirm leaves the schedule as it was", async () => {
    const { confirm, sendMail } = setup(
      scheduled({ priceId: PREMIUM_YEARLY, effectiveAt: at }),
    );

    await confirm();

    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends nothing for an immediate change", async () => {
    const { confirm, sendMail } = setup({
      status: "ACTIVE",
      subscriptionId: "sub_1",
    });

    await confirm();

    expect(sendMail).not.toHaveBeenCalled();
  });

  it("still reports the scheduled change when its email cannot be sent", async () => {
    const { confirm, sendMail } = setup(scheduled(null));
    sendMail.mockRejectedValueOnce(new Error("SendGrid down"));

    await expect(confirm()).resolves.toMatchObject({ status: "SCHEDULED" });
  });
});
