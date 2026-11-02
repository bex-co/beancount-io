import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { UpgradePromptLink } from "../upgrade-prompt-link";
import { getNextTier } from "@/common/lib/subscription/tier-config";
import { TEST_LOCATION_HREF } from "@/test/mocks/router";

const { mockTrack, mockStoreKey, mockHidesBilling, mockWaiting } = vi.hoisted(
  () => ({
    mockTrack: vi.fn(),
    mockStoreKey: { current: null as string | null },
    mockWaiting: { current: false },
    mockHidesBilling: { current: false },
  }),
);

vi.mock("@tanstack/react-router", async () => {
  const { routerMock } = await import("@/test/mocks/router");
  return routerMock;
});
vi.mock("@/common/analytics", () => ({ track: mockTrack }));
vi.mock("@/common/hooks/use-store-upgrade-key", () => ({
  useUpgradeChannel: () => ({
    storeUpgradeKey: mockStoreKey.current,
    sellsHere: mockStoreKey.current === null && !mockWaiting.current,
  }),
}));
vi.mock("@/common/hooks/use-hides-billing", () => ({
  useHidesBilling: () => mockHidesBilling.current,
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

describe("UpgradePromptLink", () => {
  beforeEach(() => {
    mockTrack.mockClear();
    mockStoreKey.current = null;
    mockHidesBilling.current = false;
    mockWaiting.current = false;
  });

  it("opens Billing with no sheet while a Stripe plan waits to start", () => {
    mockWaiting.current = true;
    render(
      <UpgradePromptLink surface="ledgers_limit" plan={getNextTier("PREMIUM")}>
        Upgrade
      </UpgradePromptLink>,
    );

    const link = screen.getByRole("link", { name: "Upgrade" });
    expect(link.getAttribute("href")).not.toContain("plan=");
  });

  it("offers nothing on a page an app opened", () => {
    mockHidesBilling.current = true;
    const { container } = render(
      <UpgradePromptLink surface="ledgers_limit" plan={getNextTier("FREE")}>
        Upgrade
      </UpgradePromptLink>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("sends a store subscriber to Billing with no plan, naming their app", () => {
    mockStoreKey.current = "common.upgradeInIosApp";
    render(
      <UpgradePromptLink
        surface="ledgers_limit"
        plan={getNextTier("PREMIUM")}
        billing="yearly"
      >
        Upgrade
      </UpgradePromptLink>,
    );

    const link = screen.getByRole("link", { name: "common.upgradeInIosApp" });
    expect(link.getAttribute("href")).not.toContain("plan=");
    expect(link.getAttribute("href")).not.toContain("billing=");
    fireEvent.click(link);
    expect(mockTrack).toHaveBeenCalledWith("upgrade_prompt_clicked", {
      surface: "ledgers_limit",
    });
  });

  it("opens the recommended plan with the way back and records it", () => {
    render(
      <UpgradePromptLink surface="ledgers_limit" plan={getNextTier("PREMIUM")}>
        Upgrade
      </UpgradePromptLink>,
    );

    const link = screen.getByRole("link", { name: "Upgrade" });
    expect(link).toHaveAttribute(
      "href",
      `/settings/billing?plan=growth&billing=yearly&from=ledgers_limit&return=${encodeURIComponent(TEST_LOCATION_HREF)}`,
    );
    fireEvent.click(link);
    expect(mockTrack).toHaveBeenCalledWith("upgrade_prompt_clicked", {
      surface: "ledgers_limit",
      target_tier: "GROWTH",
    });
  });

  it("opens Billing without a plan when none is above", () => {
    render(
      <UpgradePromptLink
        surface="collaborators_limit"
        plan={getNextTier("ORGANIZATION")}
      >
        Upgrade
      </UpgradePromptLink>,
    );

    const link = screen.getByRole("link", { name: "Upgrade" });
    expect(link).toHaveAttribute(
      "href",
      `/settings/billing?from=collaborators_limit&return=${encodeURIComponent(TEST_LOCATION_HREF)}`,
    );
    fireEvent.click(link);
    expect(mockTrack).toHaveBeenCalledWith("upgrade_prompt_clicked", {
      surface: "collaborators_limit",
    });
  });
});
