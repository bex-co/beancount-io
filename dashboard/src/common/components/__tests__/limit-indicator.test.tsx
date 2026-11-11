import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LimitIndicator } from "../limit-indicator";
import { TEST_LOCATION_HREF } from "@/test/mocks/router";
import { textContrast } from "@/test/contrast";

vi.mock("@/common/hooks/use-store-upgrade-key", () => ({
  useUpgradeChannel: () => ({ storeUpgradeKey: null, sellsHere: true }),
}));
vi.mock("@tanstack/react-router", async () => {
  const { routerMock } = await import("@/test/mocks/router");
  return routerMock;
});

// Mock ReactNativeBridgeProvider context
const mockUseReactNativeContext = vi.fn();
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({
    useReactNativeContext: () => mockUseReactNativeContext(),
  }),
);

// Mock translations
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.ledgersLimit": "Ledger Limit",
        "common.ledgersLimitReached": "Ledger Limit Reached",
        "common.collaboratorsLimit": "Collaborator Limit",
        "common.collaboratorsLimitReached": "Collaborator Limit Reached",
        "common.nearLimit": "near limit",
        "common.upgradeToUnlock": "Upgrade to unlock",
      };
      return translations[key] || key;
    },
  }),
}));

describe("LimitIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: running in web browser (not React Native)
    mockUseReactNativeContext.mockReturnValue({ isReactNative: false });
  });
  describe("Badge variant", () => {
    it("should render as badge variant when specified", () => {
      render(
        <LimitIndicator
          tier="FREE"
          used={3}
          max={10}
          limitType="ledgers"
          variant="badge"
        />,
      );

      expect(screen.getByText("3 / 10 ledgers")).toBeInTheDocument();
    });

    it("should show secondary variant for low usage (under 70%)", () => {
      const { container } = render(
        <LimitIndicator
          tier="FREE"
          used={5}
          max={10}
          limitType="ledgers"
          variant="badge"
        />,
      );

      // Badge should not have destructive variant at 50% usage
      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
    });

    it("should show destructive variant when at 90% usage", () => {
      const { container } = render(
        <LimitIndicator
          tier="FREE"
          used={9}
          max={10}
          limitType="ledgers"
          variant="badge"
        />,
      );

      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
    });

    it("should show destructive variant when at 100% usage", () => {
      render(
        <LimitIndicator
          tier="FREE"
          used={10}
          max={10}
          limitType="ledgers"
          variant="badge"
        />,
      );

      expect(screen.getByText("10 / 10 ledgers")).toBeInTheDocument();
    });
  });

  describe("Alert variant (default)", () => {
    it("should render as alert by default", () => {
      render(
        <LimitIndicator tier="FREE" used={5} max={10} limitType="ledgers" />,
      );

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    it("should show normal title when not at limit", () => {
      render(
        <LimitIndicator tier="FREE" used={5} max={10} limitType="ledgers" />,
      );

      // Title key for normal ledger limit (singular: "Ledger Limit")
      expect(screen.getByText("Ledger Limit")).toBeInTheDocument();
    });

    it("should show reached title when at limit", () => {
      render(
        <LimitIndicator tier="FREE" used={10} max={10} limitType="ledgers" />,
      );

      expect(screen.getByText("Ledger Limit Reached")).toBeInTheDocument();
    });

    it("should show usage count in alert", () => {
      render(
        <LimitIndicator tier="FREE" used={7} max={10} limitType="ledgers" />,
      );

      expect(screen.getByText(/7 \/ 10 ledgers/)).toBeInTheDocument();
    });

    it("should show upgrade button when near limit (70% or more)", () => {
      render(
        <LimitIndicator tier="FREE" used={7} max={10} limitType="ledgers" />,
      );

      expect(screen.getByText("Upgrade to unlock")).toBeInTheDocument();
    });

    it("should not show upgrade button when under 70%", () => {
      render(
        <LimitIndicator tier="FREE" used={5} max={10} limitType="ledgers" />,
      );

      expect(screen.queryByText("Upgrade to unlock")).not.toBeInTheDocument();
    });

    it("should show upgrade button when at limit", () => {
      render(
        <LimitIndicator tier="FREE" used={10} max={10} limitType="ledgers" />,
      );

      expect(screen.getByText("Upgrade to unlock")).toBeInTheDocument();
    });

    it("should show near limit message when near but not at limit", () => {
      render(
        <LimitIndicator tier="FREE" used={8} max={10} limitType="ledgers" />,
      );

      expect(screen.getByText(/near limit/)).toBeInTheDocument();
    });

    // The at-limit count is body text on the card; at 90% opacity the dark
    // theme put it at 4.3:1, below WCAG 1.4.3's 4.5:1 (w2/107).
    it.each([":root", ".dark"] as const)(
      "keeps the at-limit count at 4.5:1 or more (%s)",
      async (theme) => {
        render(
          <LimitIndicator tier="FREE" used={10} max={10} limitType="ledgers" />,
        );
        const count = screen.getByText("10 / 10 ledgers");
        const textClass = count.className
          .split(/\s+/)
          .find((name) => name.startsWith("text-destructive"));
        expect(textClass).toBeDefined();
        const card = screen.getByRole("alert").className.split(/\s+/);

        expect(
          await textContrast(textClass!, card, theme),
        ).toBeGreaterThanOrEqual(4.5);
      },
    );

    it("should not show near limit message when at 100%", () => {
      render(
        <LimitIndicator tier="FREE" used={10} max={10} limitType="ledgers" />,
      );

      // Should NOT show "near limit" message when at limit
      expect(screen.queryByText(/near limit/)).not.toBeInTheDocument();
    });

    it.each([
      ["FREE", "premium"],
      ["PREMIUM", "growth"],
      ["GROWTH", "organization"],
    ] as const)(
      "opens the next tier up from %s on Billing, with the way back",
      (tier, plan) => {
        render(
          <LimitIndicator tier={tier} used={8} max={10} limitType="ledgers" />,
        );

        const upgradeLink = screen.getByRole("link", { name: /upgrade/i });
        expect(upgradeLink).toHaveAttribute(
          "href",
          `/settings/billing?plan=${plan}&billing=yearly&from=ledgers_limit&return=${encodeURIComponent(TEST_LOCATION_HREF)}`,
        );
      },
    );

    it.each([
      ["FREE", "premium"],
      ["PREMIUM", "growth"],
    ] as const)(
      "opens the next tier up from a %s owner's collaborators limit on Billing",
      (tier, plan) => {
        render(
          <LimitIndicator
            tier={tier}
            used={5}
            max={5}
            limitType="collaborators"
          />,
        );

        expect(screen.getByRole("link", { name: /upgrade/i })).toHaveAttribute(
          "href",
          `/settings/billing?plan=${plan}&billing=yearly&from=collaborators_limit&return=${encodeURIComponent(TEST_LOCATION_HREF)}`,
        );
      },
    );

    it("opens Billing without a plan when no tier is above", () => {
      render(
        <LimitIndicator
          tier="ORGANIZATION"
          used={8}
          max={10}
          limitType="collaborators"
        />,
      );

      expect(screen.getByRole("link", { name: /upgrade/i })).toHaveAttribute(
        "href",
        `/settings/billing?from=collaborators_limit&return=${encodeURIComponent(TEST_LOCATION_HREF)}`,
      );
    });
  });

  describe("Collaborators limit type", () => {
    it("should show collaborators limit text in badge", () => {
      render(
        <LimitIndicator
          tier="FREE"
          used={3}
          max={5}
          limitType="collaborators"
          variant="badge"
        />,
      );

      expect(screen.getByText("3 / 5 collaborators")).toBeInTheDocument();
    });

    it("should show collaborators limit title in alert", () => {
      render(
        <LimitIndicator
          tier="FREE"
          used={3}
          max={5}
          limitType="collaborators"
        />,
      );

      // Singular: "Collaborator Limit"
      expect(screen.getByText("Collaborator Limit")).toBeInTheDocument();
    });

    it("should show collaborators limit reached title when at limit", () => {
      render(
        <LimitIndicator
          tier="FREE"
          used={5}
          max={5}
          limitType="collaborators"
        />,
      );

      expect(
        screen.getByText("Collaborator Limit Reached"),
      ).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("should handle zero max gracefully (prevents division by zero)", () => {
      // This would cause percentage to be Infinity if max is 0
      // The component should handle this edge case
      render(
        <LimitIndicator tier="FREE" used={0} max={0} limitType="ledgers" />,
      );

      // Should render without crashing
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should handle used greater than max", () => {
      render(
        <LimitIndicator tier="FREE" used={15} max={10} limitType="ledgers" />,
      );

      // Should show at limit state
      expect(screen.getByText("Ledger Limit Reached")).toBeInTheDocument();
    });
  });

  describe("React Native WebView", () => {
    it("should not show upgrade button when in React Native webview (at 70% usage)", () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: true });
      render(
        <LimitIndicator tier="FREE" used={7} max={10} limitType="ledgers" />,
      );

      // Should show limit warning
      expect(screen.getByText(/7 \/ 10 ledgers/)).toBeInTheDocument();
      expect(screen.getByText(/near limit/)).toBeInTheDocument();

      // But should NOT show upgrade button
      expect(screen.queryByText("Upgrade to unlock")).not.toBeInTheDocument();
    });

    it("should not show upgrade button when in React Native webview (at 100% usage)", () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: true });
      render(
        <LimitIndicator tier="FREE" used={10} max={10} limitType="ledgers" />,
      );

      // Should show at limit state
      expect(screen.getByText("Ledger Limit Reached")).toBeInTheDocument();
      expect(screen.getByText(/10 \/ 10 ledgers/)).toBeInTheDocument();

      // But should NOT show upgrade button
      expect(screen.queryByText("Upgrade to unlock")).not.toBeInTheDocument();
    });

    it("should show upgrade button in web browser when near limit", () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: false });
      render(
        <LimitIndicator tier="FREE" used={8} max={10} limitType="ledgers" />,
      );

      // Should show upgrade button in web
      expect(screen.getByText("Upgrade to unlock")).toBeInTheDocument();
    });

    it("should not show upgrade button when under 70% regardless of context", () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: true });
      render(
        <LimitIndicator tier="FREE" used={5} max={10} limitType="ledgers" />,
      );

      // Under 70%, no upgrade button in any context
      expect(screen.queryByText("Upgrade to unlock")).not.toBeInTheDocument();

      // Same in web
      mockUseReactNativeContext.mockReturnValue({ isReactNative: false });
      render(
        <LimitIndicator tier="FREE" used={5} max={10} limitType="ledgers" />,
      );
      expect(screen.queryByText("Upgrade to unlock")).not.toBeInTheDocument();
    });

    it("should hide upgrade button for collaborators limit in React Native", () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: true });
      render(
        <LimitIndicator
          tier="FREE"
          used={4}
          max={5}
          limitType="collaborators"
        />,
      );

      // Should show limit info
      expect(screen.getByText(/4 \/ 5 collaborators/)).toBeInTheDocument();

      // But no upgrade button in mobile
      expect(screen.queryByText("Upgrade to unlock")).not.toBeInTheDocument();
    });

    it("should show upgrade button for collaborators limit in web browser", () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: false });
      render(
        <LimitIndicator
          tier="FREE"
          used={4}
          max={5}
          limitType="collaborators"
        />,
      );

      // Should show upgrade button in web
      expect(screen.getByText("Upgrade to unlock")).toBeInTheDocument();
    });

    it("should not affect badge variant in React Native", () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: true });
      render(
        <LimitIndicator
          tier="FREE"
          used={8}
          max={10}
          limitType="ledgers"
          variant="badge"
        />,
      );

      // Badge should still render normally (no upgrade button in badge variant anyway)
      expect(screen.getByText("8 / 10 ledgers")).toBeInTheDocument();
      expect(screen.queryByText("Upgrade to unlock")).not.toBeInTheDocument();
    });

    it("should still show alert role in React Native", () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: true });
      render(
        <LimitIndicator tier="FREE" used={9} max={10} limitType="ledgers" />,
      );

      // Alert should still be rendered
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();

      // Just without upgrade button
      expect(screen.queryByText("Upgrade to unlock")).not.toBeInTheDocument();
    });

    it("should show all limit info except upgrade button in React Native", () => {
      mockUseReactNativeContext.mockReturnValue({ isReactNative: true });
      render(
        <LimitIndicator tier="FREE" used={8} max={10} limitType="ledgers" />,
      );

      // Should show title
      expect(screen.getByText("Ledger Limit")).toBeInTheDocument();

      // Should show usage
      expect(screen.getByText(/8 \/ 10 ledgers/)).toBeInTheDocument();

      // Should show near limit message
      expect(screen.getByText(/near limit/)).toBeInTheDocument();

      // Should NOT show upgrade button
      expect(screen.queryByText("Upgrade to unlock")).not.toBeInTheDocument();
    });
  });

  // Enterprise allowances are unlimited (-1): nothing is near or at a limit,
  // in either binding or variant (w4/313).
  it.each([
    ["ledgers", "alert"],
    ["collaborators", "alert"],
    ["collaborators", "badge"],
  ] as const)(
    "shows no %s limit as %s for an unlimited allowance",
    (limitType, variant) => {
      const { container } = render(
        <LimitIndicator
          used={7}
          max={-1}
          limitType={limitType}
          tier="ENTERPRISE"
          variant={variant}
        />,
      );
      expect(container).toBeEmptyDOMElement();
    },
  );

  describe("A limit the ledger owner sets", () => {
    it("offers no upgrade and says only the owner can raise it", () => {
      render(
        <LimitIndicator
          used={5}
          max={5}
          limitType="collaborators"
          tier="FREE"
          ownedByOther
        />,
      );

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(
        screen.getByText(
          /owner can raise this limit|common.ownerCanRaiseLimit/,
        ),
      ).toBeInTheDocument();
    });
  });
});
