import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriptionSection } from "../subscription-section";
import { stripePlanConfig } from "../stripe-config";
import {
  MOCK_TIER_QUOTAS,
  mockActiveSubscriptionData,
  mockCanceledSubscriptionData,
  mockStoreBilledData,
} from "./subscription-test-utils";

const {
  mockUseQuery,
  mockCancelSubscription,
  mockResumeSubscription,
  mockCreateStripePortalSession,
  mockCreateSubscriptionSession,
  mockRunPreview,
  mockChangePlan,
  mockPreviewState,
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
  mockRunPreview: vi.fn(() => Promise.resolve({ data: undefined })),
  mockChangePlan: vi.fn(),
  mockPreviewState: {
    value: { data: undefined, loading: false, error: undefined } as {
      data: unknown;
      loading: boolean;
      error: unknown;
    },
  },
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastInfo: vi.fn(),
  mockUseUserLimits: vi.fn(),
  mockUseAiCfoUsage: vi.fn(),
  mockUseAllTierQuotas: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useLazyQuery: () => [
    vi.fn(),
    { data: undefined, loading: false, error: undefined },
  ],
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
vi.mock("@/features/user-settings/hooks/use-plan-change", () => ({
  usePreviewPlanChange: () => [mockRunPreview, mockPreviewState.value],
  useChangePlan: () => [mockChangePlan, { loading: false }],
  useCancelScheduledPlanChange: () => [vi.fn(), { loading: false }],
}));
// jsdom has no 2D canvas, so a real confetti frame throws after the test.
vi.mock("@/features/user-settings/lib/celebrate", () => ({
  celebrate: vi.fn(async () => {}),
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
    i18n: { language: "en" },
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

const GROWTH_MONTHLY = "price_1SyPdaEqsEqs2tLViLPUDoVi";
const UPGRADE_PREVIEW = {
  previewPlanChange: {
    __typename: "PlanChangePreview",
    kind: "UPGRADE",
    refusal: null,
    effect: "IMMEDIATE",
    currentPriceId: "price_1RrSOGEqsEqs2tLVFnyB34qG",
    targetPriceId: GROWTH_MONTHLY,
    currency: "usd",
    amountDueToday: 4250,
    creditApplied: 750,
    nextAmount: 9999,
    nextChargeAt: "2026-11-03T12:00:00Z",
    effectiveAt: "2026-10-17T12:00:00Z",
    prorationDate: 1792238400,
    alternativePriceId: null,
    limitChanges: [],
    paymentMethod: {
      __typename: "PaymentMethodSummary",
      brand: "visa",
      last4: "4242",
    },
  },
};

describe("Plan change through the sheet", () => {
  let refetchSubscription: ReturnType<typeof vi.fn>;
  let refetchUserLimits: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    refetchSubscription = vi.fn();
    refetchUserLimits = vi.fn().mockResolvedValue({});
    setUserLimits("PREMIUM", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 2,
      ledgersMax: 5,
      collaboratorsPerLedgerMax: 5,
    });
    mockUseUserLimits.mockReturnValue({
      ...mockUseUserLimits(),
      refetch: refetchUserLimits,
    });
    mockUseQuery.mockReturnValue({
      data: mockActiveSubscriptionData,
      loading: false,
      error: null,
      refetch: refetchSubscription,
    });
    mockPreviewState.value = {
      data: UPGRADE_PREVIEW,
      loading: false,
      error: undefined,
    };
  });

  async function confirmGrowthMonthly() {
    const user = userEvent.setup();
    render(<SubscriptionSection />);
    // The plan row opens on yearly; a same-cycle upgrade is on monthly.
    await user.click(
      screen.getByRole("button", { name: "userSettings.monthly" }),
    );
    await user.click(screen.getAllByText("aiAgent.upgradeCta")[0]);
    expect(mockRunPreview).toHaveBeenCalledWith({
      variables: { clientId: "beancount-web-prod", priceId: GROWTH_MONTHLY },
    });
    await user.click(
      screen.getByRole("button", {
        name: "userSettings.planChangePayAndSwitch",
      }),
    );
    expect(mockChangePlan).toHaveBeenCalledWith({
      variables: {
        clientId: "beancount-web-prod",
        priceId: GROWTH_MONTHLY,
        prorationDate: 1792238400,
      },
    });
    return user;
  }

  it("charges at the previewed proration time and says so once it applies", async () => {
    mockChangePlan.mockResolvedValue({
      data: { changePlan: { status: "ACTIVE", newTier: "GROWTH" } },
    });

    await confirmGrowthMonthly();

    // The plan and limits refresh through useChangePlan's refetchQueries
    // (use-plan-change.test.ts), not a second refetch from the page.
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "userSettings.subscriptionUpgraded",
        undefined,
      );
    });
  });

  it("opens on a deep link's plan and offers the way back once the change lands", async () => {
    mockChangePlan.mockResolvedValue({
      data: { changePlan: { status: "ACTIVE", newTier: "GROWTH" } },
    });
    const user = userEvent.setup();
    render(
      <SubscriptionSection
        initialTarget={{
          tier: "growth",
          cycle: "monthly",
          surface: "ledgers_limit",
        }}
        returnTo="/ledger/alice/books"
      />,
    );

    expect(
      screen.getByText("userSettings.planChangeTitle"),
    ).toBeInTheDocument();
    expect(mockRunPreview).toHaveBeenCalledWith({
      variables: { clientId: "beancount-web-prod", priceId: GROWTH_MONTHLY },
    });
    await user.click(
      screen.getByRole("button", {
        name: "userSettings.planChangePayAndSwitch",
      }),
    );

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "userSettings.subscriptionUpgraded",
        {
          action: {
            label: "userSettings.backToWork",
            onClick: expect.any(Function),
          },
        },
      ),
    );
  });

  it("schedules a downgrade for the period end, warning about ledgers over the lower limit", async () => {
    const user = userEvent.setup();
    mockPreviewState.value = {
      data: {
        previewPlanChange: {
          ...UPGRADE_PREVIEW.previewPlanChange,
          kind: "DOWNGRADE",
          effect: "SCHEDULED",
          targetPriceId: stripePlanConfig.premium.yearly,
          amountDueToday: 0,
          creditApplied: 0,
          prorationDate: null,
          effectiveAt: "2026-11-03T12:00:00Z",
          nextChargeAt: "2026-11-03T12:00:00Z",
          limitChanges: [
            { limit: "maxLedgers", from: 20, to: 5 },
            { limit: "maxCollaboratorsPerLedger", from: 10, to: 5 },
            { limit: "aiCfoTokensMax", from: 2_000_000, to: 500_000 },
            { limit: "maxDirectives", from: -1, to: -1 },
          ],
        },
      },
      loading: false,
      error: undefined,
    };
    mockChangePlan.mockResolvedValue({
      data: {
        changePlan: {
          status: "SCHEDULED",
          effectiveAt: "2026-11-03T12:00:00Z",
        },
      },
    });
    setUserLimits("GROWTH", {
      aiCfoTokensUsed: 50,
      aiCfoTokensMax: 100,
      ledgersUsed: 12,
      ledgersMax: 20,
      collaboratorsPerLedgerMax: 10,
    });

    render(
      <SubscriptionSection
        initialTarget={{
          tier: "premium",
          cycle: "yearly",
          surface: "deep_link",
        }}
      />,
    );

    const sheet = within(screen.getByTestId("plan-change-scheduled"));
    expect(
      sheet.getByText("userSettings.planChangeOverLimit"),
    ).toBeInTheDocument();
    await user.click(
      sheet.getByRole("button", {
        name: "userSettings.planChangeScheduleDowngrade",
      }),
    );

    expect(mockChangePlan).toHaveBeenCalledWith({
      variables: {
        clientId: "beancount-web-prod",
        priceId: stripePlanConfig.premium.yearly,
        prorationDate: null,
      },
    });
    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "userSettings.planChangeScheduled",
      ),
    );
  });

  it("sends a payment the bank must approve to Stripe's page instead of calling it done", async () => {
    mockChangePlan.mockResolvedValue({
      data: {
        changePlan: {
          status: "REQUIRES_ACTION",
          hostedInvoiceUrl: "https://invoice.stripe.com/i/in_1",
        },
      },
    });

    await confirmGrowthMonthly();

    expect(
      await screen.findByRole("link", {
        name: "userSettings.planChangeApprovePayment",
      }),
    ).toHaveAttribute("href", "https://invoice.stripe.com/i/in_1");
    expect(refetchUserLimits).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("says nothing changed when the bank declines, and offers another card", async () => {
    mockChangePlan.mockResolvedValue({
      data: { changePlan: { status: "FAILED" } },
    });
    mockCreateStripePortalSession.mockResolvedValue({
      data: { createStripePortalSession: { success: true, sessionUrl: null } },
    });

    const user = await confirmGrowthMonthly();

    expect(
      await screen.findByText("userSettings.planChangeFailed"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "userSettings.planChangeUseAnotherCard",
      }),
    );
    await waitFor(() =>
      expect(mockCreateStripePortalSession).toHaveBeenCalled(),
    );
    expect(refetchUserLimits).not.toHaveBeenCalled();
  });

  it("shows a network failure and changes nothing", async () => {
    mockChangePlan.mockRejectedValue(new Error("Network failure"));

    await confirmGrowthMonthly();

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("common.errors.generic"),
    );
    expect(refetchUserLimits).not.toHaveBeenCalled();
  });
});

describe("A store-billed account (ADR 001 D5, D14)", () => {
  const load = (data: typeof mockStoreBilledData) => {
    setUserLimits("GROWTH");
    mockUseQuery.mockReturnValue({
      data,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  };
  const withStoreBilling = (
    stripe: typeof mockActiveSubscriptionData,
  ): typeof mockStoreBilledData => ({
    subscriptionStatus: {
      ...stripe.subscriptionStatus,
      billing: mockStoreBilledData.subscriptionStatus.billing,
    },
  });

  it("offers no plan picker", () => {
    load(mockStoreBilledData);
    render(<SubscriptionSection />);

    expect(screen.getByTestId("store-plan-status")).toBeInTheDocument();
    expect(screen.queryByText("aiAgent.upgradeCta")).not.toBeInTheDocument();
    expect(
      screen.queryByText("userSettings.currentPlan", { selector: "button" }),
    ).not.toBeInTheDocument();
  });

  it("opens no plan change from a deep link", () => {
    load(mockStoreBilledData);
    render(
      <SubscriptionSection
        initialTarget={{
          tier: "growth",
          cycle: "yearly",
          surface: "pricing_page",
        }}
      />,
    );

    expect(mockRunPreview).not.toHaveBeenCalled();
  });

  it("keeps the Stripe cancel for an account that pays twice", () => {
    load(withStoreBilling(mockActiveSubscriptionData));
    render(<SubscriptionSection />);

    expect(
      screen.getByRole("button", { name: "userSettings.cancelSubscription" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("aiAgent.upgradeCta")).not.toBeInTheDocument();
  });

  it("offers no yearly switch on a monthly Stripe plan beside a store plan", () => {
    const stripe = mockActiveSubscriptionData.subscriptionStatus;
    const [subscription] = stripe.subscriptions;
    const [item] = subscription.items;
    load(
      withStoreBilling({
        subscriptionStatus: {
          ...stripe,
          subscriptions: [
            {
              ...subscription,
              items: [
                {
                  ...item,
                  price: { ...item.price, interval: "month", amount: 999_900 },
                },
              ],
            },
          ],
        },
      }),
    );
    render(<SubscriptionSection />);

    expect(screen.queryByTestId("pay-yearly-offer")).not.toBeInTheDocument();
  });

  it("offers no resume over a store plan", () => {
    load(withStoreBilling(mockCanceledSubscriptionData));
    render(<SubscriptionSection />);

    expect(screen.queryByTestId("scheduled-panel")).not.toBeInTheDocument();
  });
});
