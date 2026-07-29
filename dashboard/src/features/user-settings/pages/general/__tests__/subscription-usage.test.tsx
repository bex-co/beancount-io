import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubscriptionSection } from "../subscription-section";
import type { GetSubscriptionStatusQuery } from "@/graphql/definitions";
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

describe("Usage Overview", () => {
  it("should show AI tokens and ledgers usage", () => {
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 95,
      aiCfoTokensMax: 100,
      ledgersUsed: 1,
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

    expect(screen.getByText("userSettings.usage")).toBeInTheDocument();
    expect(screen.getByText("userSettings.aiCfoUsage")).toBeInTheDocument();
    expect(screen.getByText("userSettings.ledgers")).toBeInTheDocument();
  });

  it("should show unlimited text for enterprise users", () => {
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

    // Unlimited ledgers row shows "unlimited" text
    const unlimitedTexts = screen.getAllByText("userSettings.unlimited");
    expect(unlimitedTexts.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Usage Overview - Detailed", () => {
  it("should show ledger usage row for tiers with multiple ledgers", () => {
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

    expect(screen.getByText("userSettings.ledgers")).toBeInTheDocument();
  });

  it("should show unlimited ledgers text for enterprise", () => {
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

    // Enterprise shows unlimited for ledger row in usage overview
    const unlimitedTexts = screen.getAllByText("userSettings.unlimited");
    expect(unlimitedTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("should not show usage when limits are null", () => {
    mockUseUserLimits.mockReturnValue({
      tier: "FREE",
      limits: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isAtLedgerLimit: false,
      isAtAiCfoLimit: false,
      isPremium: false,
      isFree: true,
      isGrowth: false,
      isOrganization: false,
      isEnterprise: false,
      isPaidTier: false,
    });
    mockUseQuery.mockReturnValue({
      data: mockNoSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    // Banner should appear, but usage section should not
    expect(screen.getByText("userSettings.freePlan")).toBeInTheDocument();
    expect(screen.queryByText("userSettings.usage")).not.toBeInTheDocument();
  });
});

describe("Multiple Subscriptions", () => {
  it("should display multiple subscriptions", () => {
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });

    const multipleSubscriptionsData: GetSubscriptionStatusQuery = {
      subscriptionStatus: {
        hasActiveSubscription: true,
        subscriptions: [
          mockActiveSubscriptionData.subscriptionStatus.subscriptions[0],
          {
            id: "sub_789",
            clientId: "test-client-2",
            status: "active",
            cancelAt: null,
            canceledAt: null,
            currentPeriodEnd: "2024-12-31T23:59:59Z",
            items: [
              {
                product: {
                  name: "Enterprise Plan",
                },
                price: {
                  amount: 9900,
                  currency: "usd",
                  interval: "year",
                },
              },
            ],
          },
        ],
      },
    };

    mockUseQuery.mockReturnValue({
      data: multipleSubscriptionsData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    expect(screen.getByText("Pro Plan")).toBeInTheDocument();
    expect(screen.getByText("Enterprise Plan")).toBeInTheDocument();
  });
});

describe("Price Formatting", () => {
  it("should format price correctly", () => {
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

    // 2900 cents = $29.00
    expect(screen.getByText(/29.00/)).toBeInTheDocument();
  });

  it("should show price and interval", () => {
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

    // Billing price line shows the formatted amount with interval
    expect(screen.getByText(/\$29\.00 \/ month/)).toBeInTheDocument();
  });
});
