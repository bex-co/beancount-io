import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BillingSettingsPage from "../index";
import { rememberPendingApproval } from "@/features/user-settings/lib/approval-return";

const mockReactNative = vi.hoisted(() => ({ isReactNative: false }));

vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({ useReactNativeContext: () => mockReactNative }),
);
const mockSearch = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => (
    <div data-testid="navigate" data-to={to} />
  ),
  useSearch: () => mockSearch.value,
  useNavigate: () => mockNavigate,
}));
vi.mock("@/common/components/seo/page-seo", () => ({ PageSEO: () => null }));
const mockTakeReturnPath = vi.hoisted(() => vi.fn(() => null));
vi.mock("@/features/user-settings/lib/billing-return", () => ({
  takeReturnPath: mockTakeReturnPath,
}));
const mockAnnounce = vi.hoisted(() => vi.fn());
vi.mock("@/features/user-settings/lib/plan-landed", () => ({
  announcePlanLanded: mockAnnounce,
}));
const mockToast = vi.hoisted(() => ({ info: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));
vi.mock("../../general/subscription-section", () => ({
  SubscriptionSection: ({
    checkoutReturned,
    returnTo,
    onCheckoutDismiss,
    initialTarget,
    onSheetClose,
  }: {
    checkoutReturned?: boolean;
    returnTo?: string;
    onCheckoutDismiss?: () => void;
    initialTarget?: { tier: string; cycle: string; surface: string } | null;
    onSheetClose?: () => void;
  }) => (
    <div
      data-testid="subscription-section"
      data-checkout={String(checkoutReturned)}
      data-return={returnTo ?? ""}
      data-target={
        initialTarget
          ? `${initialTarget.tier}-${initialTarget.cycle}-${initialTarget.surface}`
          : ""
      }
    >
      <button onClick={onCheckoutDismiss}>dismiss</button>
      <button onClick={onSheetClose}>close sheet</button>
    </div>
  ),
}));

describe("BillingSettingsPage", () => {
  beforeEach(() => {
    mockToast.info.mockClear();
    mockNavigate.mockClear();
    mockTakeReturnPath.mockClear();
    mockAnnounce.mockClear();
    window.sessionStorage.clear();
  });

  it("says once that an abandoned Checkout charged nothing, then drops the flag", () => {
    mockSearch.value = { checkout: "canceled", from: "deep_link" };
    try {
      const { rerender } = render(<BillingSettingsPage />);
      rerender(<BillingSettingsPage />);

      expect(mockToast.info).toHaveBeenCalledTimes(1);
      expect(mockToast.info).toHaveBeenCalledWith(
        "userSettings.checkoutCanceled",
      );
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      const [{ search, replace }] = mockNavigate.mock.calls[0] as [
        {
          search: (prev: Record<string, unknown>) => Record<string, unknown>;
          replace: boolean;
        },
      ];
      expect(replace).toBe(true);
      expect(search(mockSearch.value)).toEqual({
        checkout: undefined,
        from: "deep_link",
      });
      // The abandoned Checkout's way back is forgotten, so a later Checkout
      // in this tab does not offer it.
      expect(mockTakeReturnPath).toHaveBeenCalledTimes(1);
    } finally {
      mockSearch.value = {};
    }
  });

  it("says nothing about a cancel on an ordinary visit", () => {
    render(<BillingSettingsPage />);

    expect(mockToast.info).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockTakeReturnPath).not.toHaveBeenCalled();
  });

  it("shows the billing heading and the subscription section on the web", () => {
    render(<BillingSettingsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "userSettings.billing" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("subscription-section")).toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });

  it("sends the native app's web view to general settings instead of billing", () => {
    mockReactNative.isReactNative = true;
    try {
      render(<BillingSettingsPage />);
      expect(screen.getByTestId("navigate")).toHaveAttribute(
        "data-to",
        "/settings/general",
      );
      expect(
        screen.queryByTestId("subscription-section"),
      ).not.toBeInTheDocument();
    } finally {
      mockReactNative.isReactNative = false;
    }
  });

  it("hands a Checkout return to the subscription section and clears it on dismiss", () => {
    mockSearch.value = { checkout: "success", return: "/ledger/alice/books" };
    try {
      render(<BillingSettingsPage />);
      const section = screen.getByTestId("subscription-section");
      expect(section).toHaveAttribute("data-checkout", "true");
      expect(section).toHaveAttribute("data-return", "/ledger/alice/books");

      screen.getByRole("button", { name: "dismiss" }).click();
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/settings/billing",
        search: {},
        replace: true,
      });
    } finally {
      mockSearch.value = {};
    }
  });

  it.each([
    [
      { plan: "growth", billing: "monthly", from: "ledgers_limit" },
      "growth-monthly-ledgers_limit",
    ],
    // A link from outside the app (the pricing page) is a plain deep link.
    [{ plan: "premium" }, "premium-yearly-deep_link"],
    // A plan the schema dropped, or a Checkout return, opens no sheet.
    [{ plan: undefined, billing: "yearly" }, ""],
    [{ plan: "growth", checkout: "success" }, ""],
  ])("opens the change sheet from a deep link %o", (search, target) => {
    mockSearch.value = search;
    try {
      render(<BillingSettingsPage />);
      expect(screen.getByTestId("subscription-section")).toHaveAttribute(
        "data-target",
        target,
      );
    } finally {
      mockSearch.value = {};
    }
  });

  it("takes a deep link's plan out of the URL when the sheet closes, keeping the way back", () => {
    mockSearch.value = {
      plan: "growth",
      billing: "yearly",
      from: "ledgers_limit",
      return: "/ledger/alice/books",
    };
    mockNavigate.mockClear();
    try {
      render(<BillingSettingsPage />);
      screen.getByRole("button", { name: "close sheet" }).click();

      const [{ search, replace }] = mockNavigate.mock.calls[0] as [
        {
          search: (prev: Record<string, unknown>) => Record<string, unknown>;
          replace: boolean;
        },
      ];
      expect(replace).toBe(true);
      expect(search(mockSearch.value)).toEqual({
        plan: undefined,
        billing: undefined,
        from: undefined,
        return: "/ledger/alice/books",
      });
    } finally {
      mockSearch.value = {};
    }
  });

  it("leaves the URL alone when a sheet opened from the page closes", () => {
    mockNavigate.mockClear();
    render(<BillingSettingsPage />);
    screen.getByRole("button", { name: "close sheet" }).click();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  describe("a bank approval coming back from a redirect", () => {
    const pending = {
      invoiceId: "in_redirect",
      amountCharged: 95000,
      currency: "usd",
      priceId: "price_growth_yearly",
      returnTo: "/ledger/alice/books",
    };
    const returned = (
      redirectStatus: string,
      paymentIntent = "pi_redirect",
    ) => {
      mockSearch.value = {
        payment_intent: paymentIntent,
        redirect_status: redirectStatus,
        from: "deep_link",
      };
    };
    const droppedStripeParams = () => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      const [{ search, replace }] = mockNavigate.mock.calls[0] as [
        {
          search: (prev: Record<string, unknown>) => Record<string, unknown>;
          replace: boolean;
        },
      ];
      expect(replace).toBe(true);
      expect(search(mockSearch.value)).toEqual({
        payment_intent: undefined,
        redirect_status: undefined,
        from: "deep_link",
      });
    };

    it("announces the change the sheet remembered, once, and drops Stripe's parameters", () => {
      rememberPendingApproval("pi_redirect_secret_abc", pending);
      returned("succeeded");
      try {
        const { rerender } = render(<BillingSettingsPage />);
        rerender(<BillingSettingsPage />);

        expect(mockAnnounce).toHaveBeenCalledTimes(1);
        expect(mockAnnounce).toHaveBeenCalledWith(
          pending,
          expect.any(Function),
          "/ledger/alice/books",
        );
        droppedStripeParams();
      } finally {
        mockSearch.value = {};
      }
    });

    it("announces nothing when the bank refused, but still drops the parameters", () => {
      rememberPendingApproval("pi_redirect_secret_abc", pending);
      returned("failed");
      try {
        render(<BillingSettingsPage />);

        expect(mockAnnounce).not.toHaveBeenCalled();
        droppedStripeParams();
      } finally {
        mockSearch.value = {};
      }
    });

    it("announces nothing for a payment this tab did not start", () => {
      rememberPendingApproval("pi_other_secret_abc", pending);
      returned("succeeded");
      try {
        render(<BillingSettingsPage />);

        expect(mockAnnounce).not.toHaveBeenCalled();
        droppedStripeParams();
      } finally {
        mockSearch.value = {};
      }
    });
  });
});
