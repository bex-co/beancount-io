import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BillingSource } from "@/graphql/definitions";
import { en } from "@/i18n/locales";
import type { PlanBillingStatus } from "@/features/user-settings/hooks/use-subscription-status";
import { PlanBillingSource } from "../plan-billing-source";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ i18n: { language: "en-US" } }),
}));

const t = (key: string, params: Record<string, string | number> = {}) => {
  const entry = (en as Record<string, { message?: string } | string>)[key];
  const message = typeof entry === "string" ? entry : (entry?.message ?? key);
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    message,
  );
};

type Store = NonNullable<PlanBillingStatus["store"]>;
const store = (overrides: Partial<Store> = {}): Store => ({
  __typename: "StoreSubscriptionSummary",
  provider: BillingSource.AppStore,
  tier: "GROWTH",
  interval: "year",
  status: "ACTIVE",
  accessEndsAt: "2026-12-01T12:00:00.000Z",
  willRenew: true,
  managementUrl: null,
  scheduledChange: null,
  ...overrides,
});
const billing = (
  source: BillingSource,
  storePlan: Store | null = null,
): PlanBillingStatus => ({
  __typename: "PlanBilling",
  source,
  duplicateBilling: false,
  store: storePlan,
});

describe("the plan card's billing source (ADR 001 D14)", () => {
  it("names Stripe for a Stripe plan", () => {
    render(
      <PlanBillingSource
        tier="PREMIUM"
        billing={billing(BillingSource.Stripe)}
        t={t}
      />,
    );

    expect(screen.getByTestId("plan-billing-source")).toHaveTextContent(
      "Stripe billing",
    );
  });

  it("gives an App Store plan the device path and no link", () => {
    render(
      <PlanBillingSource
        tier="GROWTH"
        billing={billing(BillingSource.AppStore, store())}
        t={t}
      />,
    );

    const source = screen.getByTestId("plan-billing-source");
    expect(source).toHaveTextContent("App Store billing");
    expect(source).toHaveTextContent("Settings → your name → Subscriptions");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("links a Google Play plan to Play's subscriptions page", () => {
    const managementUrl =
      "https://play.google.com/store/account/subscriptions?sku=growth&package=io.beancount.android";
    render(
      <PlanBillingSource
        tier="GROWTH"
        billing={billing(
          BillingSource.GooglePlay,
          store({ provider: BillingSource.GooglePlay, managementUrl }),
        )}
        t={t}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Manage on Google Play" }),
    ).toHaveAttribute("href", managementUrl);
    expect(screen.getByTestId("plan-billing-source")).toHaveTextContent(
      "Google Play billing",
    );
  });

  it.each([
    ["renews", store(), "Yearly · Renews on Dec 1, 2026"],
    ["ends", store({ willRenew: false }), "Yearly · Ends on Dec 1, 2026"],
    [
      "changes",
      store({
        interval: "month",
        scheduledChange: {
          __typename: "StorePlan",
          tier: "PREMIUM",
          interval: "month",
        },
      }),
      "Monthly · Changes to Premium on Dec 1, 2026",
    ],
  ])("says when a store plan %s", (_, plan, status) => {
    render(
      <PlanBillingSource
        tier="GROWTH"
        billing={billing(BillingSource.AppStore, plan)}
        t={t}
      />,
    );

    expect(screen.getByTestId("store-plan-status")).toHaveTextContent(status);
  });

  it("does not invent a date a store has not reported", () => {
    render(
      <PlanBillingSource
        tier="GROWTH"
        billing={billing(
          BillingSource.AppStore,
          store({ accessEndsAt: null, interval: null }),
        )}
        t={t}
      />,
    );

    expect(screen.queryByTestId("store-plan-status")).not.toBeInTheDocument();
  });

  it("sends Enterprise to a person, whatever bills it", () => {
    render(
      <PlanBillingSource
        tier="ENTERPRISE"
        billing={billing(BillingSource.Stripe)}
        t={t}
      />,
    );

    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute(
      "href",
      "https://beancount.io/tg",
    );
    expect(screen.queryByText("Stripe billing")).not.toBeInTheDocument();
  });

  it.each([
    ["a free account", billing(BillingSource.None)],
    ["a status read that carried no billing", null],
  ])("shows nothing for %s", (_, value) => {
    render(<PlanBillingSource tier="FREE" billing={value} t={t} />);

    expect(screen.queryByTestId("plan-billing-source")).not.toBeInTheDocument();
  });

  it("prefers the Stripe plan when a store plan is ending beside it", () => {
    render(
      <PlanBillingSource
        tier="GROWTH"
        billing={billing(BillingSource.Stripe, store({ willRenew: false }))}
        t={t}
      />,
    );

    expect(screen.getByTestId("plan-billing-source")).toHaveTextContent(
      "Stripe billing",
    );
    expect(screen.queryByTestId("store-plan-status")).not.toBeInTheDocument();
  });
});
