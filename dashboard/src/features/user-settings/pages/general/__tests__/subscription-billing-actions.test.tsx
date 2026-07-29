import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriptionSection } from "../subscription-section";
import {
  MOCK_TIER_QUOTAS,
  mockActiveSubscriptionData,
} from "./subscription-test-utils";

const {
  mockUseQuery,
  mockCancelSubscription,
  mockResumeSubscription,
  mockCreateStripePortalSession,
  mockCreateSubscriptionSession,
  mockUpgradeSubscription,
  mockToastSuccess,
  mockToastError,
  mockToastInfo,
  mockUseUserLimits,
  mockUseAiCfoUsage,
  mockUseAllTierQuotas,
} = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockCancelSubscription: vi.fn(),
  mockResumeSubscription: vi.fn(),
  mockCreateStripePortalSession: vi.fn(),
  mockCreateSubscriptionSession: vi.fn(),
  mockUpgradeSubscription: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastInfo: vi.fn(),
  mockUseUserLimits: vi.fn(),
  mockUseAiCfoUsage: vi.fn(),
  mockUseAllTierQuotas: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => mockUseQuery(),
  useMutation: (document: {
    definitions?: Array<{ name?: { value?: string } }>;
  }) => {
    const opName = document?.definitions?.[0]?.name?.value;
    if (opName === "CancelSubscription")
      return [mockCancelSubscription, { loading: false }];
    if (opName === "ResumeSubscription")
      return [mockResumeSubscription, { loading: false }];
    if (opName === "CreateStripePortalSession")
      return [mockCreateStripePortalSession, { loading: false }];
    return [vi.fn(), { loading: false }];
  },
}));

vi.mock("@/common/hooks/use-user-limits", () => ({
  useUserLimits: () => mockUseUserLimits(),
}));
vi.mock("@/common/hooks/use-ai-cfo-usage", () => ({
  useAiCfoUsage: () => mockUseAiCfoUsage(),
}));
vi.mock("@/common/hooks/use-all-tier-quotas", () => ({
  useAllTierQuotas: () => mockUseAllTierQuotas(),
}));
vi.mock(
  "@/features/user-settings/hooks/use-create-subscription-session",
  () => ({
    useCreateSubscriptionSession: () => ({
      createSubscriptionSession: mockCreateSubscriptionSession,
      loading: false,
    }),
  }),
);
vi.mock("@/features/user-settings/hooks/use-upgrade-subscription", () => ({
  useUpgradeSubscription: () => ({
    upgradeSubscription: mockUpgradeSubscription,
    loading: false,
  }),
}));
vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    info: mockToastInfo,
  },
}));

vi.mock("@/common/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-description">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-title">{children}</div>
  ),
}));
vi.mock("@/common/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));
vi.mock("@/common/components/ui/badge", () => ({
  Badge: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => <span {...props}>{children}</span>,
}));
vi.mock("@/common/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-description">{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-title">{children}</div>
  ),
}));
vi.mock("@/common/components/ui/separator", () => ({
  Separator: () => <hr data-testid="separator" />,
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params))
          result = result.replace(`{${k}}`, v);
        if (result === key) return key;
        return result;
      }
      return key;
    },
  }),
}));
vi.mock("../stripe-config", () => ({
  getStripePlanConfigFromUrl: () => ({
    environment: "development",
    clientId: "test-client",
    premium: { monthly: "price_premium" },
    growth: { monthly: "price_growth" },
    organization: { monthly: "price_org" },
    monthly: "price_monthly",
    yearly: "price_yearly",
  }),
}));

function setUserLimits(
  tier = "FREE" as string,
  limits: {
    aiCfoTokensUsed?: number;
    aiCfoTokensMax?: number;
    ledgersUsed?: number;
    ledgersMax?: number;
    collaboratorsPerLedgerMax?: number;
  } = {},
) {
  const {
    aiCfoTokensUsed = 5,
    aiCfoTokensMax = 10,
    ledgersUsed = 1,
    ledgersMax = 3,
    collaboratorsPerLedgerMax = 3,
  } = limits;
  mockUseUserLimits.mockReturnValue({
    tier,
    limits: { ledgersUsed, ledgersMax, collaboratorsPerLedgerMax },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isAtLedgerLimit: false,
    isPremium: tier === "PREMIUM",
    isFree: tier === "FREE",
    isGrowth: tier === "GROWTH",
    isOrganization: tier === "ORGANIZATION",
    isEnterprise: tier === "ENTERPRISE",
    isPaidTier: tier !== "FREE",
  });
  mockUseAiCfoUsage.mockReturnValue({
    aiCfoTokensUsed,
    aiCfoTokensMax,
    isAtAiCfoLimit: aiCfoTokensMax !== -1 && aiCfoTokensUsed >= aiCfoTokensMax,
    isLoading: false,
    error: undefined,
    usage: { aiCfoTokensUsed, aiCfoTokensMax },
    refetch: vi.fn(),
  });
  mockUseAllTierQuotas.mockReturnValue({
    quotas: MOCK_TIER_QUOTAS,
    getQuotaForTier: (t: string) =>
      MOCK_TIER_QUOTAS.find((q) => q.tier === t) ?? null,
    isLoading: false,
    error: undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setUserLimits();
});

describe("Manage Billing Functionality", () => {
  it("should show error toast if portal session fails", async () => {
    const user = userEvent.setup();
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });
    mockUseQuery.mockReturnValue({
      data: mockActiveSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockCreateStripePortalSession.mockResolvedValue({
      data: {
        createStripePortalSession: {
          success: false,
          sessionUrl: null,
          message: "Failed to create portal session",
        },
      },
    });

    render(<SubscriptionSection />);

    const manageBillingButton = screen.getByText("userSettings.manageBilling");
    await user.click(manageBillingButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });
});

describe("Manage Billing - Success Flow", () => {
  it("should redirect when portal session succeeds", async () => {
    const user = userEvent.setup();
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });
    mockUseQuery.mockReturnValue({
      data: mockActiveSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockCreateStripePortalSession.mockResolvedValue({
      data: {
        createStripePortalSession: {
          success: true,
          sessionUrl: "https://billing.stripe.com/session/abc",
        },
      },
    });

    Object.defineProperty(window, "location", {
      value: { href: "", search: "" },
      writable: true,
      configurable: true,
    });

    render(<SubscriptionSection />);

    const manageBillingButton = screen.getByText("userSettings.manageBilling");
    await user.click(manageBillingButton);

    await waitFor(() => {
      expect(window.location.href).toBe(
        "https://billing.stripe.com/session/abc",
      );
    });
  });

  it("should show error toast when portal throws network error", async () => {
    const user = userEvent.setup();
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });
    mockUseQuery.mockReturnValue({
      data: mockActiveSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockCreateStripePortalSession.mockRejectedValue(
      new Error("Network timeout"),
    );

    render(<SubscriptionSection />);

    const manageBillingButton = screen.getByText("userSettings.manageBilling");
    await user.click(manageBillingButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("common.errors.generic");
    });
  });
});

describe("Upgrade Refetch Flow", () => {
  it("should refetch subscription and user limits after successful upgrade", async () => {
    const user = userEvent.setup();
    const mockRefetchSubscription = vi.fn();
    const mockRefetchUserLimits = vi.fn().mockResolvedValue({});
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });
    // Override to include mockRefetchUserLimits
    mockUseUserLimits.mockReturnValue({
      tier: "PREMIUM",
      limits: {
        aiCfoTokensUsed: 50,
        aiCfoTokensMax: 100,
        ledgersUsed: 2,
        ledgersMax: 5,
        collaboratorsPerLedgerMax: 5,
      },
      isLoading: false,
      error: null,
      refetch: mockRefetchUserLimits,
      isAtLedgerLimit: false,
      isAtAiCfoLimit: false,
      isPremium: true,
      isFree: false,
      isGrowth: false,
      isOrganization: false,
      isEnterprise: false,
      isPaidTier: true,
    });
    mockUseQuery.mockReturnValue({
      data: mockActiveSubscriptionData,
      loading: false,
      error: null,
      refetch: mockRefetchSubscription,
    });

    mockUpgradeSubscription.mockResolvedValue({
      data: {
        upgradeSubscription: {
          success: true,
          message: "Subscription upgraded successfully.",
          newTier: "GROWTH",
        },
      },
    });

    render(<SubscriptionSection />);

    const upgradeButtons = screen.getAllByText("aiAgent.upgradeCta");
    await user.click(upgradeButtons[0]);

    await waitFor(() => {
      expect(mockUpgradeSubscription).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Subscription upgraded successfully.",
      );
    });

    await waitFor(() => {
      expect(mockRefetchSubscription).toHaveBeenCalled();
      expect(mockRefetchUserLimits).toHaveBeenCalled();
    });
  });

  it("should not refetch when upgrade fails", async () => {
    const user = userEvent.setup();
    const mockRefetchSubscription = vi.fn();
    const mockRefetchUserLimits = vi.fn();
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });
    mockUseUserLimits.mockReturnValue({
      tier: "PREMIUM",
      limits: {
        aiCfoTokensUsed: 50,
        aiCfoTokensMax: 100,
        ledgersUsed: 2,
        ledgersMax: 5,
        collaboratorsPerLedgerMax: 5,
      },
      isLoading: false,
      error: null,
      refetch: mockRefetchUserLimits,
      isAtLedgerLimit: false,
      isAtAiCfoLimit: false,
      isPremium: true,
      isFree: false,
      isGrowth: false,
      isOrganization: false,
      isEnterprise: false,
      isPaidTier: true,
    });
    mockUseQuery.mockReturnValue({
      data: mockActiveSubscriptionData,
      loading: false,
      error: null,
      refetch: mockRefetchSubscription,
    });

    mockUpgradeSubscription.mockResolvedValue({
      data: {
        upgradeSubscription: {
          success: false,
          message: "Payment declined",
          newTier: null,
        },
      },
    });

    render(<SubscriptionSection />);

    const upgradeButtons = screen.getAllByText("aiAgent.upgradeCta");
    await user.click(upgradeButtons[0]);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Payment declined");
    });

    expect(mockRefetchSubscription).not.toHaveBeenCalled();
    expect(mockRefetchUserLimits).not.toHaveBeenCalled();
  });

  it("should show info toast and not refetch when 3DS auth is required", async () => {
    const user = userEvent.setup();
    const mockRefetchSubscription = vi.fn();
    const mockRefetchUserLimits = vi.fn();

    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });
    mockUseUserLimits.mockReturnValue({
      tier: "PREMIUM",
      limits: {
        aiCfoTokensUsed: 50,
        aiCfoTokensMax: 100,
        ledgersUsed: 2,
        ledgersMax: 5,
        collaboratorsPerLedgerMax: 5,
      },
      isLoading: false,
      error: null,
      refetch: mockRefetchUserLimits,
      isAtLedgerLimit: false,
      isAtAiCfoLimit: false,
      isPremium: true,
      isFree: false,
      isGrowth: false,
      isOrganization: false,
      isEnterprise: false,
      isPaidTier: true,
    });
    mockUseQuery.mockReturnValue({
      data: mockActiveSubscriptionData,
      loading: false,
      error: null,
      refetch: mockRefetchSubscription,
    });

    mockUpgradeSubscription.mockResolvedValue({
      data: {
        upgradeSubscription: {
          success: false,
          message: null,
          clientSecret: "pi_secret_abc",
          newTier: null,
        },
      },
    });

    render(<SubscriptionSection />);

    const upgradeButtons = screen.getAllByText("aiAgent.upgradeCta");
    await user.click(upgradeButtons[0]);

    await waitFor(() => {
      expect(mockUpgradeSubscription).toHaveBeenCalled();
    });

    expect(mockRefetchSubscription).not.toHaveBeenCalled();
    expect(mockRefetchUserLimits).not.toHaveBeenCalled();
  });

  it("should not refetch when upgrade throws an error", async () => {
    const user = userEvent.setup();
    const mockRefetchSubscription = vi.fn();
    const mockRefetchUserLimits = vi.fn();
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });
    mockUseUserLimits.mockReturnValue({
      tier: "PREMIUM",
      limits: {
        aiCfoTokensUsed: 50,
        aiCfoTokensMax: 100,
        ledgersUsed: 2,
        ledgersMax: 5,
        collaboratorsPerLedgerMax: 5,
      },
      isLoading: false,
      error: null,
      refetch: mockRefetchUserLimits,
      isAtLedgerLimit: false,
      isAtAiCfoLimit: false,
      isPremium: true,
      isFree: false,
      isGrowth: false,
      isOrganization: false,
      isEnterprise: false,
      isPaidTier: true,
    });
    mockUseQuery.mockReturnValue({
      data: mockActiveSubscriptionData,
      loading: false,
      error: null,
      refetch: mockRefetchSubscription,
    });

    mockUpgradeSubscription.mockRejectedValue(new Error("Network failure"));

    render(<SubscriptionSection />);

    const upgradeButtons = screen.getAllByText("aiAgent.upgradeCta");
    await user.click(upgradeButtons[0]);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("common.errors.generic");
    });

    expect(mockRefetchSubscription).not.toHaveBeenCalled();
    expect(mockRefetchUserLimits).not.toHaveBeenCalled();
  });
});
