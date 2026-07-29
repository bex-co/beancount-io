import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSubscriptionStatus } from "../use-subscription-status";

const mockRefetch = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(() => ({
    data: null,
    loading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

import { useQuery } from "@apollo/client/react";
const mockUseQuery = vi.mocked(useQuery);

function makeSubscriptionData(overrides?: {
  hasActiveSubscription?: boolean;
  subscriptions?: Array<{
    currentPeriodEnd?: string | null;
    cancelAt?: string | null;
    canceledAt?: string | null;
  }>;
}) {
  return {
    subscriptionStatus: {
      hasActiveSubscription: overrides?.hasActiveSubscription ?? true,
      subscriptions: (overrides?.subscriptions ?? []).map((s) => ({
        id: "sub_1",
        clientId: "client_1",
        status: "active",
        cancelAt: s.cancelAt ?? null,
        canceledAt: s.canceledAt ?? null,
        currentPeriodEnd: s.currentPeriodEnd ?? null,
        items: [],
      })),
    },
  };
}

describe("useSubscriptionStatus", () => {
  describe("hasActiveStripeSubscription", () => {
    it("returns false when no data", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        refetch: mockRefetch,
      } as never);
      const { result } = renderHook(() => useSubscriptionStatus());
      expect(result.current.hasActiveStripeSubscription).toBe(false);
    });

    it("returns true when hasActiveSubscription is true", () => {
      mockUseQuery.mockReturnValue({
        data: makeSubscriptionData({
          hasActiveSubscription: true,
          subscriptions: [{ currentPeriodEnd: "2025-12-31T00:00:00Z" }],
        }),
        loading: false,
        error: null,
        refetch: mockRefetch,
      } as never);
      const { result } = renderHook(() => useSubscriptionStatus());
      expect(result.current.hasActiveStripeSubscription).toBe(true);
    });

    it("returns false when hasActiveSubscription is false", () => {
      mockUseQuery.mockReturnValue({
        data: makeSubscriptionData({ hasActiveSubscription: false }),
        loading: false,
        error: null,
        refetch: mockRefetch,
      } as never);
      const { result } = renderHook(() => useSubscriptionStatus());
      expect(result.current.hasActiveStripeSubscription).toBe(false);
    });
  });

  describe("renewalDate derivation", () => {
    it("returns null when no active subscription", () => {
      mockUseQuery.mockReturnValue({
        data: makeSubscriptionData({ hasActiveSubscription: false }),
        loading: false,
        error: null,
        refetch: mockRefetch,
      } as never);
      const { result } = renderHook(() => useSubscriptionStatus());
      expect(result.current.renewalDate).toBeNull();
    });

    it("returns null when subscription has cancelAt set", () => {
      mockUseQuery.mockReturnValue({
        data: makeSubscriptionData({
          hasActiveSubscription: true,
          subscriptions: [
            {
              currentPeriodEnd: "2025-12-31T00:00:00Z",
              cancelAt: "2025-12-31T00:00:00Z",
            },
          ],
        }),
        loading: false,
        error: null,
        refetch: mockRefetch,
      } as never);
      const { result } = renderHook(() => useSubscriptionStatus());
      expect(result.current.renewalDate).toBeNull();
    });

    it("returns null when subscription has canceledAt set", () => {
      mockUseQuery.mockReturnValue({
        data: makeSubscriptionData({
          hasActiveSubscription: true,
          subscriptions: [
            {
              currentPeriodEnd: "2025-12-31T00:00:00Z",
              canceledAt: "2025-11-30T00:00:00Z",
            },
          ],
        }),
        loading: false,
        error: null,
        refetch: mockRefetch,
      } as never);
      const { result } = renderHook(() => useSubscriptionStatus());
      expect(result.current.renewalDate).toBeNull();
    });

    it("returns null when subscription has no currentPeriodEnd", () => {
      mockUseQuery.mockReturnValue({
        data: makeSubscriptionData({
          hasActiveSubscription: true,
          subscriptions: [{ currentPeriodEnd: null }],
        }),
        loading: false,
        error: null,
        refetch: mockRefetch,
      } as never);
      const { result } = renderHook(() => useSubscriptionStatus());
      expect(result.current.renewalDate).toBeNull();
    });

    it("returns formatted date for active subscription with valid end date", () => {
      mockUseQuery.mockReturnValue({
        data: makeSubscriptionData({
          hasActiveSubscription: true,
          subscriptions: [{ currentPeriodEnd: "2025-12-31T00:00:00Z" }],
        }),
        loading: false,
        error: null,
        refetch: mockRefetch,
      } as never);
      const { result } = renderHook(() => useSubscriptionStatus());
      expect(result.current.renewalDate).toBe(
        new Date("2025-12-31T00:00:00Z").toLocaleDateString(),
      );
    });
  });

  describe("loading and error passthrough", () => {
    it("exposes loading state", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: mockRefetch,
      } as never);
      const { result } = renderHook(() => useSubscriptionStatus());
      expect(result.current.loading).toBe(true);
    });

    it("exposes error state", () => {
      const err = new Error("fetch failed");
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: err,
        refetch: mockRefetch,
      } as never);
      const { result } = renderHook(() => useSubscriptionStatus());
      expect(result.current.error).toBe(err);
    });
  });
});
