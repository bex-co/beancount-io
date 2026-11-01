import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import {
  StoreProvider,
  StoreSubscriptionStatus,
} from "@/features/store-billing/data/store-subscription-model";
import type { IAuthorizationService } from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";
import { BilledByStoreError, ErrorCategory } from "@/shared/errors";
import { BILLING_CLIENT_ID, SUBSCRIPTION_CONFIG } from "../stripe";
import type { IStripeService } from "../stripe-service";
import { SubscriptionService } from "../subscription-service";

const identity: Identity = {
  userId: "usr_alice",
  method: "session",
  scopes: new Set(),
};
const PRICE = SUBSCRIPTION_CONFIG[BILLING_CLIENT_ID].plans.find(
  (plan) => !plan.retired,
)!.priceId;

const renewing = {
  provider: StoreProvider.GOOGLE_PLAY,
  status: StoreSubscriptionStatus.ACTIVE,
  willRenew: true,
  replacedById: null,
};

function setup(storeRows: object[]) {
  const stripe = {
    getStripeInstance: jest.fn(() => {
      throw new Error("Checkout reached Stripe");
    }),
    resumeSubscription: jest.fn(async () => ({ success: true })),
    upgradeSubscription: jest.fn(async () => ({ success: true })),
    previewPlanChange: jest.fn(async () => ({})),
    changePlan: jest.fn(async () => ({})),
    cancelSubscription: jest.fn(async () => ({ success: true })),
    createCustomerPortalSession: jest.fn(async () => ({ success: true })),
  };
  const models = {
    storeSubscription: { findByUserId: jest.fn(async () => storeRows) },
    paidCustomer: { findByUserIdAndClientId: jest.fn(async () => null) },
    user: { getById: jest.fn(async () => null) },
  };
  const authorization = { authorizeOrThrow: jest.fn(async () => undefined) };
  const service = new SubscriptionService(
    stripe as unknown as IStripeService,
    models as unknown as Pick<
      IModels,
      "paidCustomer" | "user" | "storeSubscription"
    >,
    {} as DbExecutor,
    authorization as unknown as IAuthorizationService,
  );
  return { service, stripe, models };
}

type Setup = ReturnType<typeof setup>;
const GUARDED_VERBS: [string, (s: Setup["service"]) => Promise<unknown>][] = [
  [
    "createSubscriptionSession",
    (s) => s.createSubscriptionSession(identity, BILLING_CLIENT_ID, PRICE),
  ],
  [
    "upgradeSubscription",
    (s) => s.upgradeSubscription(identity, BILLING_CLIENT_ID, PRICE),
  ],
  [
    "previewPlanChange",
    (s) => s.previewPlanChange(identity, BILLING_CLIENT_ID, PRICE),
  ],
  ["changePlan", (s) => s.changePlan(identity, BILLING_CLIENT_ID, PRICE)],
  [
    "resumeSubscription",
    (s) => s.resumeSubscription(identity, "sub_1", BILLING_CLIENT_ID),
  ],
];

describe("one renewing source per account (ADR 001 D5)", () => {
  describe.each(GUARDED_VERBS)("%s", (_, call) => {
    it("refuses while a store subscription will renew, before Stripe", async () => {
      const { service, stripe } = setup([renewing]);

      const refusal = await call(service).catch(
        (error: BilledByStoreError) => error,
      );

      expect(refusal).toBeInstanceOf(BilledByStoreError);
      expect(refusal).toMatchObject({
        category: ErrorCategory.BILLED_BY_STORE,
        metadata: { provider: "GOOGLE_PLAY" },
        message: expect.stringContaining("Google Play"),
      });
      for (const method of Object.values(stripe)) {
        expect(method).not.toHaveBeenCalled();
      }
    });

    it.each([
      ["no store subscription", []],
      ["a store plan with renewal off", [{ ...renewing, willRenew: false }]],
      [
        "an expired store plan",
        [{ ...renewing, status: StoreSubscriptionStatus.EXPIRED }],
      ],
    ])("is not refused with %s", async (_label, rows) => {
      const { service } = setup(rows);

      const outcome = await call(service).catch((error) => error);

      expect(outcome).not.toBeInstanceOf(BilledByStoreError);
    });
  });

  it("names the App Store for an App Store subscription", async () => {
    const { service } = setup([
      { ...renewing, provider: StoreProvider.APP_STORE },
    ]);

    await expect(
      service.changePlan(identity, BILLING_CLIENT_ID, PRICE),
    ).rejects.toThrow("the App Store");
  });

  it("reads the requester's own store subscriptions", async () => {
    const { service, models } = setup([]);

    await service.changePlan(identity, BILLING_CLIENT_ID, PRICE);

    expect(models.storeSubscription.findByUserId).toHaveBeenCalledWith(
      expect.anything(),
      "usr_alice",
    );
  });

  // Paying twice has to have a way out, and the portal offers only payment
  // details: its pinned configuration disables plan changes and cancellation.
  it.each([
    [
      "cancelling the Stripe subscription",
      (s: Setup["service"]) =>
        s.cancelSubscription(identity, "sub_1", BILLING_CLIENT_ID),
    ],
    [
      "opening the billing portal",
      (s: Setup["service"]) =>
        s.createStripePortalSession(identity, BILLING_CLIENT_ID),
    ],
  ])("still allows %s", async (_, call) => {
    const { service } = setup([renewing]);

    await expect(call(service)).resolves.toEqual({ success: true });
  });
});
