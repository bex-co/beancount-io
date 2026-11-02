import { SubscriptionTier } from "@/features/stripe/service/stripe";
import {
  StoreProvider,
  StoreSubscriptionStatus,
} from "../../data/store-subscription-model";
import { storePlanOverlap } from "../plan-switch";
import { aStoreSubscription, NOW } from "./test-fixtures";

const { PREMIUM, GROWTH, ORGANIZATION } = SubscriptionTier;
const HOUR = 60 * 60 * 1000;
const after = (hours: number) => new Date(NOW.getTime() + hours * HOUR);
const ending = (hours: number, tier = GROWTH) =>
  aStoreSubscription({ willRenew: false, tier, accessEndsAt: after(hours) });

describe("storePlanOverlap (ADR 001 D15)", () => {
  it("defers the first charge for the tier the store already covers", () => {
    expect(storePlanOverlap([ending(240)], GROWTH, NOW)).toEqual({
      provider: StoreProvider.APP_STORE,
      endsAt: after(240),
      deferred: true,
    });
  });

  it("defers the first charge for a lower tier", () => {
    expect(storePlanOverlap([ending(240)], PREMIUM, NOW)?.deferred).toBe(true);
  });

  it("charges a higher tier now, and names the plan it overlaps", () => {
    expect(storePlanOverlap([ending(240)], ORGANIZATION, NOW)).toEqual({
      provider: StoreProvider.APP_STORE,
      endsAt: after(240),
      deferred: false,
    });
  });

  it("charges now when Stripe would refuse so short a deferral", () => {
    expect(storePlanOverlap([ending(48)], GROWTH, NOW)?.deferred).toBe(false);
    expect(storePlanOverlap([ending(49)], GROWTH, NOW)?.deferred).toBe(true);
  });

  it("has nothing to say with no running plan", () => {
    const expired = aStoreSubscription({
      status: StoreSubscriptionStatus.EXPIRED,
      willRenew: false,
    });

    expect(storePlanOverlap([], GROWTH, NOW)).toBeNull();
    expect(storePlanOverlap([expired], GROWTH, NOW)).toBeNull();
  });

  it("waits for the latest plan that covers the tier", () => {
    const rows = [ending(100), ending(300), ending(500, PREMIUM)];

    expect(storePlanOverlap(rows, GROWTH, NOW)?.endsAt).toEqual(after(300));
  });
});
