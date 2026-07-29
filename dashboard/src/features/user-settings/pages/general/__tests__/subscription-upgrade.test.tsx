import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriptionSection } from "../subscription-section";
import {
  MOCK_TIER_QUOTAS,
  mockActiveSubscriptionData,
  mockNoSubscriptionData,
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

describe("Upgrade Options", () => {
  it("should show upgrade cards for premium user (Growth + Org only)", () => {
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

    render(<SubscriptionSection />);

    expect(
      screen.getByText("userSettings.upgradeYourPlan"),
    ).toBeInTheDocument();
    expect(screen.queryByText("aiAgent.premiumTier")).toBeInTheDocument(); // in banner
    expect(screen.getByText("aiAgent.growthTier")).toBeInTheDocument();
    expect(screen.getByText("aiAgent.organizationTier")).toBeInTheDocument();
  });

  it("should show all 3 upgrade cards for free user", () => {
    setUserLimits("FREE");
    mockUseQuery.mockReturnValue({
      data: mockNoSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    expect(
      screen.getByText("userSettings.upgradeYourPlan"),
    ).toBeInTheDocument();
    expect(screen.getByText("aiAgent.premiumTier")).toBeInTheDocument();
    expect(screen.getByText("aiAgent.growthTier")).toBeInTheDocument();
    expect(screen.getByText("aiAgent.organizationTier")).toBeInTheDocument();
  });

  it("should not show upgrade section for organization user", () => {
    setUserLimits("ORGANIZATION", {
      aiCfoTokensUsed: 500,
      aiCfoTokensMax: 2000,
      ledgersUsed: 10,
      ledgersMax: 100,
      collaboratorsPerLedgerMax: 50,
    });
    mockUseQuery.mockReturnValue({
      data: mockActiveSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    expect(
      screen.queryByText("userSettings.upgradeYourPlan"),
    ).not.toBeInTheDocument();
  });

  it("should not show upgrade section for enterprise user", () => {
    setUserLimits("ENTERPRISE", {
      aiCfoTokensUsed: 100,
      aiCfoTokensMax: -1,
      ledgersUsed: 5,
      ledgersMax: -1,
      collaboratorsPerLedgerMax: -1,
    });
    mockUseQuery.mockReturnValue({
      data: mockNoSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    expect(
      screen.queryByText("userSettings.upgradeYourPlan"),
    ).not.toBeInTheDocument();
  });
});

describe("Upgrade Flow", () => {
  it("should call createSubscriptionSession when free user clicks upgrade", async () => {
    const user = userEvent.setup();
    setUserLimits("FREE");
    mockUseQuery.mockReturnValue({
      data: mockNoSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockCreateSubscriptionSession.mockResolvedValue({
      data: {
        createSubscriptionSession: {
          success: true,
          sessionUrl: "https://checkout.stripe.com/session/test",
        },
      },
    });

    // Mock window.location.href
    Object.defineProperty(window, "location", {
      value: { href: "", search: "" },
      writable: true,
      configurable: true,
    });

    render(<SubscriptionSection />);

    // Find upgrade buttons (from aiAgent.upgradeCta)
    const upgradeButtons = screen.getAllByText("aiAgent.upgradeCta");
    expect(upgradeButtons.length).toBe(3); // 3 tiers for free user

    // Click the first one (premium)
    await user.click(upgradeButtons[0]);

    await waitFor(() => {
      expect(mockCreateSubscriptionSession).toHaveBeenCalledWith({
        variables: {
          clientId: "test-client",
          priceId: "price_premium",
        },
      });
    });
  });

  it("should call upgradeSubscription when paid user with Stripe sub clicks upgrade", async () => {
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

    mockUpgradeSubscription.mockResolvedValue({
      data: {
        upgradeSubscription: {
          success: true,
          message: "Subscription upgraded successfully.",
        },
      },
    });

    render(<SubscriptionSection />);

    // Premium user sees growth + org upgrade cards
    const upgradeButtons = screen.getAllByText("aiAgent.upgradeCta");
    expect(upgradeButtons.length).toBe(2);

    // Click upgrade → should call upgradeSubscription (not portal or checkout)
    await user.click(upgradeButtons[0]);

    await waitFor(() => {
      expect(mockUpgradeSubscription).toHaveBeenCalledWith({
        variables: { clientId: "test-client", priceId: "price_growth" },
      });
    });

    // Should NOT call createSubscriptionSession
    expect(mockCreateSubscriptionSession).not.toHaveBeenCalled();
    // Should NOT call portal session
    expect(mockCreateStripePortalSession).not.toHaveBeenCalled();
  });

  it("should show error toast when checkout fails for free user", async () => {
    const user = userEvent.setup();
    setUserLimits("FREE");
    mockUseQuery.mockReturnValue({
      data: mockNoSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockCreateSubscriptionSession.mockResolvedValue({
      data: {
        createSubscriptionSession: {
          success: false,
          sessionUrl: null,
          message: "Card declined",
        },
      },
    });

    render(<SubscriptionSection />);

    const upgradeButtons = screen.getAllByText("aiAgent.upgradeCta");
    await user.click(upgradeButtons[0]);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Card declined");
    });
  });

  it("should show error toast when checkout throws for free user", async () => {
    const user = userEvent.setup();
    setUserLimits("FREE");
    mockUseQuery.mockReturnValue({
      data: mockNoSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockCreateSubscriptionSession.mockRejectedValue(
      new Error("Network failure"),
    );

    render(<SubscriptionSection />);

    const upgradeButtons = screen.getAllByText("aiAgent.upgradeCta");
    await user.click(upgradeButtons[0]);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("common.errors.generic");
    });
  });

  it("should show only organization upgrade for growth user", () => {
    setUserLimits("GROWTH", {
      aiCfoTokensUsed: 200,
      aiCfoTokensMax: 500,
      ledgersUsed: 5,
      ledgersMax: 20,
      collaboratorsPerLedgerMax: 10,
    });
    mockUseQuery.mockReturnValue({
      data: mockActiveSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    expect(
      screen.getByText("userSettings.upgradeYourPlan"),
    ).toBeInTheDocument();
    // Should only show organization
    expect(screen.getByText("aiAgent.organizationTier")).toBeInTheDocument();
    // Should not show premium or growth as upgrade options
    // (growth is in the banner, not in upgrade cards)
    const upgradeButtons = screen.getAllByText("aiAgent.upgradeCta");
    expect(upgradeButtons).toHaveLength(1);
  });
});
