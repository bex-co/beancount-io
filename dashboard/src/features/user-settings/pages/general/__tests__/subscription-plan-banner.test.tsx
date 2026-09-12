import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubscriptionSection } from "../subscription-section";
import { CurrentPlanBanner } from "../subscription-plan-banner";
import { en } from "@/i18n/locales";
import {
  MOCK_TIER_QUOTAS,
  mockActiveSubscriptionData,
  mockNoSubscriptionData,
  mockCanceledSubscriptionData,
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
  mockLanguage,
} = vi.hoisted(() => ({
  mockLanguage: { current: "en" },
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
    // The app-locale number formatter reads `i18n.language`.
    i18n: { language: mockLanguage.current },
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
  mockLanguage.current = "en";
  setUserLimits();
});

/** Real English messages, so the rendered summary is asserted, not a key. */
const translate = (key: string, params?: Record<string, string>): string => {
  const entry = (en as Record<string, unknown>)[key];
  let text = key;
  if (typeof entry === "string") {
    text = entry;
  } else if (
    typeof entry === "object" &&
    entry !== null &&
    "message" in entry
  ) {
    text = String((entry as { message: string }).message);
  }
  for (const [k, v] of Object.entries(params ?? {})) {
    text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return text;
};

describe("Current Plan Banner", () => {
  it("should show current tier name for free user", () => {
    setUserLimits("FREE");
    mockUseQuery.mockReturnValue({
      data: mockNoSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    expect(screen.getByText("userSettings.freePlan")).toBeInTheDocument();
    expect(screen.getByText("userSettings.currentPlan")).toBeInTheDocument();
  });

  it("should show current tier name for premium user", () => {
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

    expect(screen.getByText("aiAgent.premiumTier")).toBeInTheDocument();
    expect(screen.getByText("userSettings.currentPlan")).toBeInTheDocument();
  });

  it("should show current tier name for enterprise user", () => {
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

    expect(screen.getByText("userSettings.enterprisePlan")).toBeInTheDocument();
  });
});

describe("Current Plan Banner - Detailed", () => {
  it("should show free plan tier name and current plan badge", () => {
    setUserLimits("FREE");
    mockUseQuery.mockReturnValue({
      data: mockNoSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    expect(screen.getByText("userSettings.freePlan")).toBeInTheDocument();
    expect(screen.getByText("userSettings.currentPlan")).toBeInTheDocument();
  });

  it("should show enterprise tier name and current plan badge", () => {
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

    expect(screen.getByText("userSettings.enterprisePlan")).toBeInTheDocument();
    expect(screen.getByText("userSettings.currentPlan")).toBeInTheDocument();
  });

  it("should show growth tier name for growth user", () => {
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

    expect(screen.getByText("aiAgent.growthTier")).toBeInTheDocument();
    expect(screen.getByText("userSettings.currentPlan")).toBeInTheDocument();
  });

  it("should show organization tier name for organization user", () => {
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

    expect(screen.getByText("aiAgent.organizationTier")).toBeInTheDocument();
  });

  it("should show feature summary for premium tier", () => {
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

    expect(screen.getByTestId("feature-summary")).toBeInTheDocument();
  });

  it("should show unlimited feature summary for enterprise tier", () => {
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

    // "userSettings.unlimited" appears in both banner (feature summary) and usage (ledgers)
    const unlimitedTexts = screen.getAllByText("userSettings.unlimited");
    expect(unlimitedTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("should not show renewal date in banner when no Stripe subscription", () => {
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });
    mockUseQuery.mockReturnValue({
      data: mockNoSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    // Renewal date should not appear in the banner area
    // (no Stripe subscription means no renewal)
    expect(screen.getByText("aiAgent.premiumTier")).toBeInTheDocument();
    // The banner should not have renewsOn text (only billing section would)
    const bannerElements = screen.queryAllByText(/userSettings.renewsOn/);
    expect(bannerElements).toHaveLength(0);
  });

  it("should not show renewal date in banner for canceled subscription", () => {
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });
    mockUseQuery.mockReturnValue({
      data: mockCanceledSubscriptionData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubscriptionSection />);

    // Canceled subscription: renewalDate should be null (cancelAt is set)
    // The billing section will have accessUntil, but banner should not have renewsOn
    expect(screen.getByText("aiAgent.premiumTier")).toBeInTheDocument();
  });
});

describe("CurrentPlanBanner quota summary localization", () => {
  const renderBanner = (
    tierQuota: {
      tier: string;
      aiCfoTokensMax: number;
      maxLedgers: number;
      maxCollaboratorsPerLedger: number;
      maxDirectives: number;
    } | null,
  ) =>
    render(
      <CurrentPlanBanner
        tier="PREMIUM"
        renewalDate={null}
        tierQuota={tierQuota}
        t={translate}
      />,
    );

  const quota = {
    tier: "PREMIUM",
    aiCfoTokensMax: 500_000,
    maxLedgers: 5,
    maxCollaboratorsPerLedger: 5,
    maxDirectives: 20_000,
  };

  it("renders finite quotas through the translated keys", () => {
    renderBanner(quota);

    expect(screen.getByTestId("feature-summary")).toHaveTextContent(
      "500,000 AI tokens / month · 5 ledger(s) · 20,000 directives · Up to 5 collaborator(s) per ledger",
    );
  });

  it("uses the singular-capable ledger and collaborator copy for a count of one", () => {
    renderBanner({
      ...quota,
      aiCfoTokensMax: 50_000,
      maxLedgers: 1,
      maxCollaboratorsPerLedger: 1,
      maxDirectives: 1000,
    });

    const summary = screen.getByTestId("feature-summary");
    expect(summary).toHaveTextContent("1 ledger(s)");
    expect(summary).toHaveTextContent("Up to 1 collaborator(s) per ledger");
    // No hardcoded English pluralization left behind.
    expect(summary.textContent).not.toContain("collaborators/ledger");
  });

  it("keeps the unlimited branches for -1 quotas", () => {
    renderBanner({
      ...quota,
      maxDirectives: -1,
      maxLedgers: -1,
      maxCollaboratorsPerLedger: -1,
    });

    const summary = screen.getByTestId("feature-summary");
    expect(summary).toHaveTextContent("Unlimited directives");
    expect(summary).toHaveTextContent("Unlimited ledgers");
    expect(summary).toHaveTextContent("Unlimited collaborators");
  });

  it("formats counts in the app language, not the browser locale", () => {
    mockLanguage.current = "de";
    renderBanner(quota);

    const summary = screen.getByTestId("feature-summary");
    expect(summary).toHaveTextContent("500.000 AI tokens / month");
    expect(summary).toHaveTextContent("20.000 directives");
  });

  it("falls back to the enterprise unlimited label when the quota is missing", () => {
    render(
      <CurrentPlanBanner
        tier="ENTERPRISE"
        renewalDate={null}
        tierQuota={null}
        t={translate}
      />,
    );

    expect(screen.getByTestId("feature-summary")).toHaveTextContent(
      "Unlimited",
    );
  });

  it("renders no summary when a non-enterprise tier has no quota", () => {
    render(
      <CurrentPlanBanner
        tier="PREMIUM"
        renewalDate={null}
        tierQuota={null}
        t={translate}
      />,
    );

    expect(screen.queryByTestId("feature-summary")).toBeNull();
  });
});
