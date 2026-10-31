import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckoutReturnTo } from "@/graphql/definitions";
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
  mockRunPreview,
  mockChangePlan,
  mockPreviewFor,
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
  mockRunPreview: vi.fn(),
  mockChangePlan: vi.fn(),
  mockPreviewFor: { fn: (_priceId: string): unknown => undefined },
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastInfo: vi.fn(),
  mockUseUserLimits: vi.fn(),
  mockUseAiCfoUsage: vi.fn(),
  mockUseAllTierQuotas: vi.fn(),
}));

const { mockTrack, mockCelebrate } = vi.hoisted(() => ({
  mockTrack: vi.fn(),
  mockCelebrate: vi.fn(),
}));
vi.mock("@/common/analytics", () => ({ track: mockTrack }));
vi.mock("@/features/user-settings/lib/celebrate", () => ({
  celebrate: mockCelebrate,
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
// The sheet previews when it opens; this keeps the preview's result in state
// so the sheet re-renders with it, as Apollo's lazy query does.
vi.mock("@/features/user-settings/hooks/use-plan-change", async () => {
  const React = await import("react");
  return {
    usePreviewPlanChange: () => {
      const [data, setData] = React.useState<unknown>(undefined);
      const run = React.useCallback(
        (options: { variables: { priceId: string } }) => {
          mockRunPreview(options);
          const next = mockPreviewFor.fn(options.variables.priceId);
          setData(next);
          return Promise.resolve({ data: next });
        },
        [],
      );
      return [run, { data, loading: false, error: undefined }];
    },
    useChangePlan: () => [mockChangePlan, { loading: false }],
    useCancelScheduledPlanChange: () => [vi.fn(), { loading: false }],
  };
});
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

const PRICES = {
  premiumMonthly: "price_1RrSOGEqsEqs2tLVFnyB34qG",
  premiumYearly: "price_1US5htEqsEqs2tLVENCzLaZB",
  growthMonthly: "price_1SyPdaEqsEqs2tLViLPUDoVi",
  growthYearly: "price_1SyPdbEqsEqs2tLV7PJyWZed",
  organizationMonthly: "price_1SyPdcEqsEqs2tLVCWEgU1PZ",
};

const PRORATION_DATE = 1792238400;
function previewData(priceId: string, kind: string) {
  return {
    previewPlanChange: {
      __typename: "PlanChangePreview",
      kind,
      refusal: null,
      effect: kind === "NEW" ? "CHECKOUT" : "IMMEDIATE",
      currentPriceId: null,
      targetPriceId: priceId,
      currency: "usd",
      amountDueToday: 9000,
      creditApplied: kind === "NEW" ? 0 : 999,
      nextAmount: 9999,
      nextChargeAt: "2027-10-17T12:00:00Z",
      effectiveAt: "2026-10-17T12:00:00Z",
      prorationDate: kind === "NEW" ? null : PRORATION_DATE,
      alternativePriceId: null,
      limitChanges: [],
      paymentMethod: null,
    },
  };
}

const card = (tier: string) => within(screen.getByTestId(`plan-card-${tier}`));

function showSubscription(data = mockActiveSubscriptionData) {
  mockUseQuery.mockReturnValue({
    data,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
}

function premiumSubscriber() {
  setUserLimits("PREMIUM", {
    aiCfoTokensUsed: 50,
    aiCfoTokensMax: 100,
    ledgersUsed: 2,
    ledgersMax: 5,
    collaboratorsPerLedgerMax: 5,
  });
  // The fixture subscription bills monthly.
  showSubscription(mockActiveSubscriptionData);
}

beforeEach(() => {
  mockPreviewFor.fn = (priceId) => previewData(priceId, "NEW");
  Object.defineProperty(window, "location", {
    value: { href: "", search: "" },
    writable: true,
    configurable: true,
  });
});

describe("Plan row", () => {
  it("shows every tier on yearly billing by default, with Growth as most popular", () => {
    setUserLimits("FREE");
    showSubscription(mockNoSubscriptionData);

    render(<SubscriptionSection />);

    for (const tier of [
      "FREE",
      "PREMIUM",
      "GROWTH",
      "ORGANIZATION",
      "ENTERPRISE",
    ]) {
      expect(screen.getByTestId(`plan-card-${tier}`)).toBeInTheDocument();
    }
    expect(
      screen.getByRole("button", { name: "userSettings.yearly" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(card("GROWTH").getByText("aiAgent.popular")).toBeInTheDocument();
    expect(
      card("PREMIUM").queryByText("aiAgent.popular"),
    ).not.toBeInTheDocument();
    expect(
      card("PREMIUM").getByText("userSettings.billedYearly"),
    ).toBeInTheDocument();
  });

  it("offers a free user every paid tier and keeps Free as the current plan", () => {
    setUserLimits("FREE");
    showSubscription(mockNoSubscriptionData);

    render(<SubscriptionSection />);

    for (const tier of ["PREMIUM", "GROWTH", "ORGANIZATION"]) {
      expect(
        card(tier).getByRole("button", { name: "aiAgent.upgradeCta" }),
      ).toBeEnabled();
    }
    expect(
      card("FREE").getByRole("button", { name: "userSettings.currentPlan" }),
    ).toBeDisabled();
    expect(
      card("ENTERPRISE").getByRole("link", { name: "userSettings.contactUs" }),
    ).toHaveAttribute("href", "https://beancount.io/tg");
  });

  it("previews a free user's choice, then checks out on the cycle they chose", async () => {
    const user = userEvent.setup();
    setUserLimits("FREE");
    showSubscription(mockNoSubscriptionData);
    mockCreateSubscriptionSession.mockResolvedValue({
      data: {
        createSubscriptionSession: {
          success: true,
          sessionUrl: "https://checkout.stripe.com/session/test",
        },
      },
    });

    render(<SubscriptionSection />);
    await user.click(
      card("PREMIUM").getByRole("button", { name: "aiAgent.upgradeCta" }),
    );
    expect(mockRunPreview).toHaveBeenCalledWith({
      variables: {
        clientId: "beancount-web-prod",
        priceId: PRICES.premiumYearly,
      },
    });
    expect(mockCreateSubscriptionSession).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", {
        name: "userSettings.planChangeContinueToCheckout",
      }),
    );

    await waitFor(() => {
      expect(mockCreateSubscriptionSession).toHaveBeenCalledWith({
        variables: {
          clientId: "beancount-web-prod",
          priceId: PRICES.premiumYearly,
          returnTo: CheckoutReturnTo.Billing,
        },
      });
    });
    expect(window.location.href).toBe(
      "https://checkout.stripe.com/session/test",
    );
  });

  it("checks a free user out monthly when they pick the monthly cycle", async () => {
    const user = userEvent.setup();
    setUserLimits("FREE");
    showSubscription(mockNoSubscriptionData);
    mockCreateSubscriptionSession.mockResolvedValue({
      data: {
        createSubscriptionSession: { success: true, sessionUrl: "https://x" },
      },
    });

    render(<SubscriptionSection />);
    await user.click(
      screen.getByRole("button", { name: "userSettings.monthly" }),
    );
    await user.click(
      card("GROWTH").getByRole("button", { name: "aiAgent.upgradeCta" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "userSettings.planChangeContinueToCheckout",
      }),
    );
    await waitFor(() => {
      expect(mockCreateSubscriptionSession).toHaveBeenCalledWith({
        variables: {
          clientId: "beancount-web-prod",
          priceId: PRICES.growthMonthly,
          returnTo: CheckoutReturnTo.Billing,
        },
      });
    });
    expect(mockTrack).toHaveBeenCalledWith("billing_toggle_changed", {
      to: "monthly",
      surface: "settings_billing",
    });
    expect(mockTrack).toHaveBeenCalledWith("checkout_started", {
      target_tier: "GROWTH",
      surface: "settings_billing",
    });
  });

  it("does not count a click on the cycle already shown", async () => {
    const user = userEvent.setup();
    setUserLimits("FREE");
    showSubscription(mockNoSubscriptionData);
    mockTrack.mockClear();

    render(<SubscriptionSection />);
    await user.click(
      screen.getByRole("button", { name: "userSettings.yearly" }),
    );

    expect(
      mockTrack.mock.calls.filter(
        ([event]) => event === "billing_toggle_changed",
      ),
    ).toEqual([]);
  });

  it("labels each choice for a monthly subscriber the way the server classifies it", async () => {
    const user = userEvent.setup();
    premiumSubscriber();

    render(<SubscriptionSection />);

    // Yearly: every paid tier from Premium monthly is a switch to yearly.
    expect(
      card("PREMIUM").getByRole("button", {
        name: "userSettings.switchToYearly",
      }),
    ).toBeEnabled();
    expect(
      card("GROWTH").getByRole("button", {
        name: "userSettings.switchToYearly",
      }),
    ).toBeEnabled();
    // Free is a downgrade, which waits for the renewal date and is not live yet.
    expect(
      card("FREE").getByRole("button", { name: "userSettings.downgrade" }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "userSettings.monthly" }),
    );
    expect(
      card("PREMIUM").getByRole("button", { name: "userSettings.currentPlan" }),
    ).toBeDisabled();
    expect(
      card("GROWTH").getByRole("button", { name: "aiAgent.upgradeCta" }),
    ).toBeEnabled();
  });

  it("changes a subscriber's plan in place at the previewed proration time", async () => {
    const user = userEvent.setup();
    premiumSubscriber();
    mockPreviewFor.fn = (priceId) => previewData(priceId, "TO_YEARLY");
    mockChangePlan.mockResolvedValue({
      data: { changePlan: { status: "ACTIVE", newTier: "GROWTH" } },
    });

    render(<SubscriptionSection />);
    await user.click(
      card("GROWTH").getByRole("button", {
        name: "userSettings.switchToYearly",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "userSettings.planChangePayAndSwitch",
      }),
    );

    expect(mockChangePlan).toHaveBeenCalledWith({
      variables: {
        clientId: "beancount-web-prod",
        priceId: PRICES.growthYearly,
        prorationDate: PRORATION_DATE,
      },
    });
    expect(mockCreateSubscriptionSession).not.toHaveBeenCalled();
  });

  it("opens the sheet for changes that wait for renewal, saying so on the card", async () => {
    const user = userEvent.setup();
    setUserLimits("GROWTH", {
      aiCfoTokensUsed: 200,
      aiCfoTokensMax: 500,
      ledgersUsed: 5,
      ledgersMax: 20,
      collaboratorsPerLedgerMax: 10,
    });
    const yearly = structuredClone(mockActiveSubscriptionData);
    yearly.subscriptionStatus.subscriptions[0].items[0].price.interval = "year";
    showSubscription(yearly);
    mockPreviewFor.fn = (priceId) => previewData(priceId, "SPLIT");

    render(<SubscriptionSection />);
    await user.click(
      screen.getByRole("button", { name: "userSettings.monthly" }),
    );

    expect(
      card("GROWTH").getByRole("button", {
        name: "userSettings.switchToMonthly",
      }),
    ).toBeEnabled();
    expect(
      card("ORGANIZATION").getByText("userSettings.planChangeAtRenewal"),
    ).toBeInTheDocument();
    await user.click(
      card("ORGANIZATION").getByRole("button", { name: "aiAgent.upgradeCta" }),
    );
    expect(mockRunPreview).toHaveBeenCalledWith({
      variables: {
        clientId: "beancount-web-prod",
        priceId: PRICES.organizationMonthly,
      },
    });
  });

  it("shows checkout errors to a free user", async () => {
    const user = userEvent.setup();
    setUserLimits("FREE");
    showSubscription(mockNoSubscriptionData);
    mockCreateSubscriptionSession
      .mockResolvedValueOnce({
        data: {
          createSubscriptionSession: {
            success: false,
            sessionUrl: null,
            message: "Card declined",
          },
        },
      })
      .mockRejectedValueOnce(new Error("Network failure"));

    render(<SubscriptionSection />);
    await user.click(
      card("PREMIUM").getByRole("button", { name: "aiAgent.upgradeCta" }),
    );
    const checkout = screen.getByRole("button", {
      name: "userSettings.planChangeContinueToCheckout",
    });
    await user.click(checkout);
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Card declined"),
    );
    await user.click(checkout);
    await waitFor(() =>
      expect(mockToastError).toHaveBeenLastCalledWith("common.errors.generic"),
    );
  });
});

describe("Pay yearly offer", () => {
  it("offers a monthly subscriber their plan on yearly billing and switches it in place", async () => {
    const user = userEvent.setup();
    premiumSubscriber();
    mockPreviewFor.fn = (priceId) => previewData(priceId, "TO_YEARLY");
    mockChangePlan.mockResolvedValue({
      data: { changePlan: { status: "ACTIVE", newTier: "PREMIUM" } },
    });

    render(<SubscriptionSection />);
    const offer = within(screen.getByTestId("pay-yearly-offer"));
    expect(offer.getByText("userSettings.payYearlyOffer")).toBeInTheDocument();
    await user.click(
      offer.getByRole("button", { name: "userSettings.switchToYearly" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "userSettings.planChangePayAndSwitch",
      }),
    );

    expect(mockChangePlan).toHaveBeenCalledWith({
      variables: {
        clientId: "beancount-web-prod",
        priceId: PRICES.premiumYearly,
        prorationDate: PRORATION_DATE,
      },
    });
  });

  it("is absent for a free user and for a yearly subscriber", () => {
    setUserLimits("FREE");
    showSubscription(mockNoSubscriptionData);
    const { unmount } = render(<SubscriptionSection />);
    expect(screen.queryByTestId("pay-yearly-offer")).not.toBeInTheDocument();
    unmount();

    premiumSubscriber();
    const yearly = structuredClone(mockActiveSubscriptionData);
    yearly.subscriptionStatus.subscriptions[0].items[0].price.interval = "year";
    showSubscription(yearly);
    render(<SubscriptionSection />);
    expect(screen.queryByTestId("pay-yearly-offer")).not.toBeInTheDocument();
  });
});

describe("Checkout return", () => {
  /** A Premium subscriber whose latest invoice is the given one. */
  function returnedWith(latestInvoice: {
    id: string;
    amountPaid: number;
    billingReason: string;
    created?: string;
    currency?: string | null;
  }) {
    premiumSubscriber();
    const data = structuredClone(mockActiveSubscriptionData);
    data.subscriptionStatus.subscriptions[0].latestInvoice = {
      __typename: "SubscriptionInvoice",
      currency: "usd",
      created: new Date().toISOString(),
      ...latestInvoice,
    };
    showSubscription(data);
  }
  const purchases = () =>
    mockTrack.mock.calls.filter(([event]) => event === "purchase");

  it("counts Checkout's first invoice once it is recorded, and celebrates it once", () => {
    returnedWith({
      id: "in_checkout",
      amountPaid: 1499,
      billingReason: "subscription_create",
    });

    const { rerender } = render(<SubscriptionSection checkoutReturned />);
    rerender(<SubscriptionSection checkoutReturned />);

    expect(purchases()).toEqual([
      [
        "purchase",
        expect.objectContaining({
          transaction_id: "in_checkout",
          value: 14.99,
          currency: "USD",
        }),
      ],
    ]);
    expect(mockCelebrate).toHaveBeenCalledTimes(1);
  });

  it("counts and celebrates a fully discounted Checkout like any other", () => {
    returnedWith({
      id: "in_checkout_free",
      amountPaid: 0,
      billingReason: "subscription_create",
    });

    render(<SubscriptionSection checkoutReturned />);

    expect(purchases()).toEqual([
      [
        "purchase",
        expect.objectContaining({
          transaction_id: "in_checkout_free",
          value: 0,
        }),
      ],
    ]);
    expect(mockCelebrate).toHaveBeenCalledTimes(1);
  });

  it("celebrates a Checkout whose invoice analytics cannot report", () => {
    returnedWith({
      id: "in_checkout_no_currency",
      amountPaid: 1499,
      billingReason: "subscription_create",
      currency: null,
    });

    render(<SubscriptionSection checkoutReturned />);

    expect(purchases()).toEqual([]);
    expect(mockCelebrate).toHaveBeenCalledTimes(1);
  });

  it("counts and celebrates nothing when the latest invoice is a renewal", () => {
    returnedWith({
      id: "in_renewal",
      amountPaid: 1499,
      billingReason: "subscription_cycle",
    });

    render(<SubscriptionSection checkoutReturned />);

    expect(purchases()).toEqual([]);
    expect(mockCelebrate).not.toHaveBeenCalled();
  });

  it("counts and celebrates nothing when the confirmation link is opened a day later", () => {
    // A bookmark or another browser: the purchase was counted when it happened.
    returnedWith({
      id: "in_old",
      amountPaid: 1499,
      billingReason: "subscription_create",
      created: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    });

    render(<SubscriptionSection checkoutReturned />);

    expect(purchases()).toEqual([]);
    expect(mockCelebrate).not.toHaveBeenCalled();
  });

  it("counts nothing on an ordinary Billing visit, even right after a purchase", () => {
    returnedWith({
      id: "in_visit",
      amountPaid: 1499,
      billingReason: "subscription_create",
    });

    render(<SubscriptionSection />);

    expect(purchases()).toEqual([]);
    expect(mockCelebrate).not.toHaveBeenCalled();
  });

  it("counts nothing while the webhook has not recorded the subscription", () => {
    setUserLimits("FREE");
    showSubscription(mockNoSubscriptionData);

    render(<SubscriptionSection checkoutReturned />);

    expect(
      within(screen.getByTestId("checkout-confirmation")).getByText(
        "userSettings.checkoutConfirming",
      ),
    ).toBeInTheDocument();
    expect(purchases()).toEqual([]);
    expect(mockCelebrate).not.toHaveBeenCalled();
  });

  it("remembers where a purchase began and offers the way back once it is recorded", async () => {
    const user = userEvent.setup();
    setUserLimits("FREE");
    showSubscription(mockNoSubscriptionData);
    mockCreateSubscriptionSession.mockResolvedValue({
      data: {
        createSubscriptionSession: {
          success: true,
          sessionUrl: "https://checkout.stripe.com/session/test",
        },
      },
    });

    const { unmount } = render(
      <SubscriptionSection returnTo="/ledger/alice/books" />,
    );
    await user.click(
      card("PREMIUM").getByRole("button", { name: "aiAgent.upgradeCta" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "userSettings.planChangeContinueToCheckout",
      }),
    );
    await waitFor(() =>
      expect(window.location.href).toBe(
        "https://checkout.stripe.com/session/test",
      ),
    );
    unmount();

    // Stripe returns after payment; the webhook has recorded the subscription.
    premiumSubscriber();
    render(<SubscriptionSection checkoutReturned />);
    const confirmation = within(screen.getByTestId("checkout-confirmation"));
    expect(
      confirmation.getByText("userSettings.checkoutDone"),
    ).toBeInTheDocument();
    expect(
      confirmation.getByRole("link", { name: "userSettings.backToWork" }),
    ).toHaveAttribute("href", "/ledger/alice/books");
  });
});
