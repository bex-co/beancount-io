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

describe("Loading State", () => {
  it("should display loading state when subscription is loading", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should display loading state when user limits are loading", () => {
    mockUseUserLimits.mockReturnValue({
      tier: "FREE",
      limits: null,
      isLoading: true,
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

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should show subscription header during loading", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    expect(screen.getByText("userSettings.subscription")).toBeInTheDocument();
  });
});

describe("Error State", () => {
  it("should display error message when query fails", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: new Error("Network error"),
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    expect(
      screen.getByText("userSettings.failedToLoadSubscription"),
    ).toBeInTheDocument();
  });
});

describe("Test Mode Badge", () => {
  it("should show test mode badge in development", () => {
    mockUseQuery.mockReturnValue({
      data: mockActiveSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    expect(screen.getByText("userSettings.testMode")).toBeInTheDocument();
  });
});

describe("Edge Cases", () => {
  it("should handle subscription without product name", () => {
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });
    const noProductData: GetSubscriptionStatusQuery = {
      subscriptionStatus: {
        hasActiveSubscription: true,
        subscriptions: [
          {
            ...mockActiveSubscriptionData.subscriptionStatus.subscriptions[0],
            items: [
              {
                product: {
                  name: null,
                },
                price: {
                  amount: 2900,
                  currency: "usd",
                  interval: "month",
                },
              },
            ],
          },
        ],
      },
    };

    mockUseQuery.mockReturnValue({
      data: noProductData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    expect(screen.getByText("userSettings.unknownPlan")).toBeInTheDocument();
  });

  it("should handle subscription without price", () => {
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });
    const noPriceData: GetSubscriptionStatusQuery = {
      subscriptionStatus: {
        hasActiveSubscription: true,
        subscriptions: [
          {
            ...mockActiveSubscriptionData.subscriptionStatus.subscriptions[0],
            items: [
              {
                product: {
                  name: "Pro Plan",
                },
                price: null,
              },
            ],
          },
        ],
      },
    };

    mockUseQuery.mockReturnValue({
      data: noPriceData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    // Gracefully falls back to zero amount — product name still shown
    expect(screen.getByText("Pro Plan")).toBeInTheDocument();
    expect(screen.getAllByText(/0\.00/).length).toBeGreaterThanOrEqual(1);
  });
});

describe("Section Separators", () => {
  it("should render separators between sections", () => {
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

    // Premium with active Stripe sub = banner + usage + upgrades + billing = 3 separators
    const separators = screen.getAllByTestId("separator");
    expect(separators.length).toBe(3);
  });

  it("should render fewer separators when no upgrade section", () => {
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

    // Org with active Stripe sub = banner + usage + billing = 2 separators
    const separators = screen.getAllByTestId("separator");
    expect(separators.length).toBe(2);
  });

  it("should render fewer separators for free user with no Stripe sub", () => {
    setUserLimits("FREE");
    mockUseQuery.mockReturnValue({
      data: mockNoSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    // Free with no Stripe sub = banner + usage + upgrades = 2 separators (no billing)
    const separators = screen.getAllByTestId("separator");
    expect(separators.length).toBe(2);
  });
});
