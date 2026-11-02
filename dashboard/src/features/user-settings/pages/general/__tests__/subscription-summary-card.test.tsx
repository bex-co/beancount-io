import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { GetSubscriptionStatusQuery } from "@/graphql/definitions";
import { SubscriptionSection } from "../subscription-section";
import {
  MOCK_TIER_QUOTAS,
  mockActiveSubscriptionData,
} from "./subscription-test-utils";

/**
 * The Billing summary card for a paying subscriber: what they pay and on which
 * cycle, a label when the price is a legacy one, the card on file, the renewal
 * date, and — on a monthly plan only — the "Pay yearly" line with its saving.
 */

const { mockUseQuery, mockUseUserLimits } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseUserLimits: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useLazyQuery: () => [
    vi.fn(),
    { data: undefined, loading: false, error: undefined },
  ],
  useQuery: () => mockUseQuery(),
  useMutation: () => [vi.fn(), { loading: false }],
}));

vi.mock("@/common/hooks/use-user-limits", () => ({
  useUserLimits: () => mockUseUserLimits(),
}));
vi.mock("@/common/hooks/use-ai-cfo-usage", () => ({
  useAiCfoUsage: () => ({
    aiCfoTokensUsed: 50,
    aiCfoTokensMax: 500_000,
    isAtAiCfoLimit: false,
    isLoading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/common/hooks/use-all-tier-quotas", () => ({
  useAllTierQuotas: () => ({
    quotas: MOCK_TIER_QUOTAS,
    isLoading: false,
    error: undefined,
  }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Renders every interpolation parameter, so formatted amounts are asserted
// as they reach the copy rather than hidden behind a key.
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params
        ? `${key}(${Object.entries(params)
            .map(([name, value]) => `${name}=${value}`)
            .join(", ")})`
        : key,
    i18n: { language: "en" },
  }),
}));

const LEGACY_PREMIUM_MONTHLY = "price_1L9ccEEqsEqs2tLVKPRV17wb";
const LEGACY_PREMIUM_YEARLY = "price_1L9ccEEqsEqs2tLVbeBgHm9p";
const PREMIUM_MONTHLY = "price_1RrSOGEqsEqs2tLVFnyB34qG";

/**
 * A Premium subscriber billed `price` on `interval`, renewing Nov 17, 2026;
 * `nextChargeAmount` is the server's renewal charge after discounts.
 */
function subscribe(
  price: { id: string; amount: number; interval: "month" | "year" },
  paymentMethod: { brand: string; last4: string } | null = {
    brand: "visa",
    last4: "4242",
  },
  nextChargeAmount: number | null = null,
) {
  const data: GetSubscriptionStatusQuery = structuredClone(
    mockActiveSubscriptionData,
  );
  const subscription = data.subscriptionStatus.subscriptions[0];
  // Midday UTC, so the medium date is the same in every test-runner timezone.
  subscription.currentPeriodEnd = "2026-11-17T12:00:00Z";
  subscription.paymentMethod = paymentMethod && {
    __typename: "PaymentMethodSummary",
    ...paymentMethod,
  };
  Object.assign(subscription.items[0].price, price);
  subscription.nextChargeAmount = nextChargeAmount;
  mockUseQuery.mockReturnValue({
    data,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseUserLimits.mockReturnValue({
    tier: "PREMIUM",
    limits: { ledgersUsed: 1, ledgersMax: 5, collaboratorsPerLedgerMax: 5 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
});

const banner = () => within(screen.getByTestId("current-plan-banner"));
const billingLine = () => screen.getByTestId("current-billing");

describe("Billing summary card", () => {
  it("summarizes a monthly subscriber on the legacy $9.99 Premium price", () => {
    subscribe({ id: LEGACY_PREMIUM_MONTHLY, amount: 999, interval: "month" });

    render(<SubscriptionSection />);

    expect(banner().getByText("aiAgent.premiumTier")).toBeInTheDocument();
    expect(billingLine()).toHaveTextContent(
      "$9.99userSettings.perMonth · userSettings.legacyPrice · visa •••• 4242",
    );
    const renewal = banner().getByText("Nov 17, 2026");
    expect(renewal.parentElement).toHaveTextContent(
      "userSettings.renewsOn Nov 17, 2026",
    );

    // $9.99 a month is $119.88 a year, less than $143.88 yearly: switching
    // would cost more, so no saving is offered.
    expect(screen.queryByTestId("pay-yearly-offer")).not.toBeInTheDocument();
  });

  it("offers yearly to a current monthly subscriber against twelve of their own payments", () => {
    subscribe({ id: PREMIUM_MONTHLY, amount: 1499, interval: "month" });

    render(<SubscriptionSection />);

    const offer = within(screen.getByTestId("pay-yearly-offer"));
    expect(
      offer.getByText(
        "userSettings.payYearlyOffer(yearly=$143.88, monthlyTotal=$179.88, saving=$36.00)",
      ),
    ).toBeInTheDocument();
    expect(
      offer.getByRole("button", { name: "userSettings.switchToYearly" }),
    ).toBeEnabled();
  });

  it("does not label a current list price as legacy", () => {
    subscribe({ id: PREMIUM_MONTHLY, amount: 1499, interval: "month" });

    render(<SubscriptionSection />);

    expect(billingLine()).toHaveTextContent(
      "$14.99userSettings.perMonth · visa •••• 4242",
    );
    expect(billingLine()).not.toHaveTextContent("userSettings.legacyPrice");
  });

  it("labels a legacy yearly price and offers no Pay-yearly line", () => {
    subscribe({ id: LEGACY_PREMIUM_YEARLY, amount: 9999, interval: "year" });

    render(<SubscriptionSection />);

    expect(billingLine()).toHaveTextContent(
      "$99.99userSettings.perYear · userSettings.legacyPrice · visa •••• 4242",
    );
    expect(banner().getByText("Nov 17, 2026")).toBeInTheDocument();
    expect(screen.queryByTestId("pay-yearly-offer")).not.toBeInTheDocument();
  });

  it("shows what a discounted plan renews at, not its list price (w1/183)", () => {
    // A 100%-off-forever discount: the server says the renewal is $0.
    subscribe(
      { id: PREMIUM_MONTHLY, amount: 1499, interval: "month" },
      undefined,
      0,
    );

    render(<SubscriptionSection />);

    expect(billingLine()).toHaveTextContent(
      "$0.00userSettings.perMonth · visa •••• 4242",
    );
    // The Billing list's row says the same, and nothing quotes the list price.
    // The card and the Billing list row.
    expect(screen.getAllByText("$0.00userSettings.perMonth")).toHaveLength(2);
    expect(screen.queryByText(/\$14\.99userSettings\.perMonth/)).toBeNull();
  });

  it("leaves the card out when Stripe reports no payment method", () => {
    subscribe(
      { id: LEGACY_PREMIUM_MONTHLY, amount: 999, interval: "month" },
      null,
    );

    render(<SubscriptionSection />);

    expect(billingLine()).toHaveTextContent(
      "$9.99userSettings.perMonth · userSettings.legacyPrice",
    );
    expect(billingLine()).not.toHaveTextContent("••••");
  });
});
