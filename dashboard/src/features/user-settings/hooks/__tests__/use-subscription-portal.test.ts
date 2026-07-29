import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSubscriptionPortal } from "../use-subscription-portal";

const { mockMutate, mockToastError } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [mockMutate, { loading: false }],
}));

vi.mock("sonner", () => ({
  toast: { error: mockToastError },
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

describe("useSubscriptionPortal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
      configurable: true,
    });
  });

  it("redirects to sessionUrl on success", async () => {
    mockMutate.mockResolvedValue({
      data: {
        createStripePortalSession: {
          success: true,
          sessionUrl: "https://billing.stripe.com/session/abc",
        },
      },
    });

    const { result } = renderHook(() => useSubscriptionPortal());

    await act(async () => {
      await result.current.handleManageBilling("client_1");
    });

    expect(window.location.href).toBe("https://billing.stripe.com/session/abc");
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("shows error toast when success is false", async () => {
    mockMutate.mockResolvedValue({
      data: {
        createStripePortalSession: {
          success: false,
          sessionUrl: null,
          message: "Portal unavailable",
        },
      },
    });

    const { result } = renderHook(() => useSubscriptionPortal());

    await act(async () => {
      await result.current.handleManageBilling("client_1");
    });

    expect(mockToastError).toHaveBeenCalledWith("Portal unavailable");
  });

  it("shows fallback error toast when success is false and no message", async () => {
    mockMutate.mockResolvedValue({
      data: {
        createStripePortalSession: {
          success: false,
          sessionUrl: null,
          message: null,
        },
      },
    });

    const { result } = renderHook(() => useSubscriptionPortal());

    await act(async () => {
      await result.current.handleManageBilling("client_1");
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "userSettings.unableToOpenBillingPortal",
    );
  });

  it("shows error toast when mutation throws", async () => {
    mockMutate.mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useSubscriptionPortal());

    await act(async () => {
      await result.current.handleManageBilling("client_1");
    });

    expect(mockToastError).toHaveBeenCalledWith("common.errors.generic");
  });
});
