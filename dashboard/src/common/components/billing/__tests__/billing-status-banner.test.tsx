import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BillingStatusBanner } from "../billing-status-banner";
import { FailedRenewalBanner } from "../failed-renewal-banner";

const { mockUseQuery, mockNative, mockRoot } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockNative: { isReactNative: false },
  mockRoot: { userProfile: { tier: "FREE" } as { tier: string } | null },
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [vi.fn(), { loading: false }],
}));
vi.mock("@tanstack/react-router", async () => {
  const { routerMock } = await import("@/test/mocks/router");
  return routerMock;
});
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({ useReactNativeContext: () => mockNative }),
);
vi.mock("@/common/hooks/use-root-context", () => ({
  useRootContext: () => mockRoot,
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const playUrl = "https://play.google.com/store/account/subscriptions";
const store = (provider: string, status: string) => ({
  provider,
  status,
  managementUrl: provider === "GOOGLE_PLAY" ? playUrl : null,
});
const load = (
  billing: Record<string, unknown>,
  hasActiveSubscription = false,
  subscriptions: unknown[] = [],
) =>
  mockUseQuery.mockReturnValue({
    data: {
      subscriptionStatus: {
        hasActiveSubscription,
        subscriptions,
        billing: { duplicateBilling: false, store: null, ...billing },
      },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockNative.isReactNative = false;
  mockRoot.userProfile = { tier: "FREE" };
});

describe("BillingStatusBanner (ADR 001 D15)", () => {
  it.each([
    ["APP_STORE", "common.billedTwiceAppStore"],
    ["GOOGLE_PLAY", "common.billedTwiceGooglePlay"],
  ])("names both sources when %s and Stripe both renew", (provider, key) => {
    load(
      {
        source: provider,
        duplicateBilling: true,
        store: store(provider, "ACTIVE"),
      },
      true,
    );

    render(<BillingStatusBanner />);

    expect(screen.getByTestId("duplicate-billing-banner")).toHaveTextContent(
      key,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/settings/billing",
    );
  });

  it("says two stores renew when no Stripe plan is involved", () => {
    load({
      source: "APP_STORE",
      duplicateBilling: true,
      store: store("APP_STORE", "ACTIVE"),
    });

    render(<BillingStatusBanner />);

    expect(screen.getByTestId("duplicate-billing-banner")).toHaveTextContent(
      "common.billedTwiceByStores",
    );
  });

  it.each(["GRACE", "ON_HOLD"])(
    "links a Google Play plan in %s to Play",
    (status) => {
      load({ source: "GOOGLE_PLAY", store: store("GOOGLE_PLAY", status) });

      render(<BillingStatusBanner />);

      expect(
        screen.getByRole("link", { name: "userSettings.manageOnGooglePlay" }),
      ).toHaveAttribute("href", playUrl);
    },
  );

  it("reads a Free account, since an account hold removes the plan", () => {
    load({ source: "GOOGLE_PLAY", store: store("GOOGLE_PLAY", "ON_HOLD") });

    render(<BillingStatusBanner />);

    expect(mockUseQuery.mock.calls[0][1]).toEqual({ skip: false });
  });

  it.each([
    ["a healthy Google Play plan", store("GOOGLE_PLAY", "ACTIVE")],
    [
      "an App Store plan in trouble, which Apple reports itself",
      store("APP_STORE", "GRACE"),
    ],
    ["no store plan", null],
  ])("shows nothing for %s", (_, plan) => {
    load({ source: "NONE", store: plan });

    const { container } = render(<BillingStatusBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("stays out of the native app and off signed-out pages", () => {
    load({ source: "GOOGLE_PLAY", duplicateBilling: true });
    mockNative.isReactNative = true;
    const { container, rerender } = render(<BillingStatusBanner />);
    expect(container).toBeEmptyDOMElement();

    mockNative.isReactNative = false;
    mockRoot.userProfile = null;
    rerender(<BillingStatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("FailedRenewalBanner beside a store plan", () => {
  const pastDue = {
    status: "past_due",
    clientId: "beancount-web-prod",
    nextPaymentAttempt: "2026-10-24T12:00:00Z",
    paymentMethod: { brand: "visa", last4: "4242" },
    items: [],
  };

  it("never shows while a store bills the plan", () => {
    mockRoot.userProfile = { tier: "PREMIUM" };
    load({ source: "APP_STORE" }, true, [pastDue]);

    const { container } = render(<FailedRenewalBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows for a past-due Stripe plan", () => {
    mockRoot.userProfile = { tier: "PREMIUM" };
    load({ source: "STRIPE" }, true, [pastDue]);

    render(<FailedRenewalBanner />);

    expect(screen.getByTestId("failed-renewal-banner")).toBeInTheDocument();
  });
});
