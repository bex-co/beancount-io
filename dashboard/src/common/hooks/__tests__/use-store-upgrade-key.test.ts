import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUpgradeChannel } from "../use-store-upgrade-key";

const { billing } = vi.hoisted(() => ({
  billing: { current: null as Record<string, unknown> | null },
}));
vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: billing.current
      ? { subscriptionStatus: { billing: billing.current } }
      : undefined,
  }),
}));

const channel = () => renderHook(useUpgradeChannel).result.current;
const store = (willRenew: boolean) => ({ provider: "APP_STORE", willRenew });

beforeEach(() => {
  billing.current = null;
});

describe("useUpgradeChannel (ADR 001 D14, D15)", () => {
  it("sells here before the status loads and for a Stripe account", () => {
    expect(channel()).toEqual({ storeUpgradeKey: null, sellsHere: true });

    billing.current = { source: "STRIPE", store: null, stripeStartsAt: null };
    expect(channel()).toEqual({ storeUpgradeKey: null, sellsHere: true });
  });

  it("names the app for a store that renews the plan", () => {
    billing.current = {
      source: "GOOGLE_PLAY",
      store: { ...store(true), provider: "GOOGLE_PLAY" },
    };

    expect(channel()).toEqual({
      storeUpgradeKey: "common.upgradeInAndroidApp",
      sellsHere: false,
    });
  });

  it("sells here once the store's renewal is off", () => {
    billing.current = {
      source: "APP_STORE",
      store: store(false),
      stripeStartsAt: null,
    };

    expect(channel().sellsHere).toBe(true);
  });

  it("sells nothing more while a Stripe plan waits to start", () => {
    billing.current = {
      source: "STRIPE",
      store: store(false),
      stripeStartsAt: "2027-03-03T12:00:00Z",
    };

    expect(channel()).toEqual({ storeUpgradeKey: null, sellsHere: false });
  });
});
