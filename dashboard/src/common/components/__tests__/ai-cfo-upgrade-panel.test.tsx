import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AiCfoUpgradePanel } from "../ai-cfo-upgrade-panel";
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

// Mock useUserLimits
const mockUseUserLimits = vi.fn();
vi.mock("@/common/hooks/use-user-limits", () => ({
  useUserLimits: () => {
    const value = mockUseUserLimits();
    return {
      ...value,
      isPaidTier: value.isPaidTier ?? value.tier !== "FREE",
    };
  },
}));

// Mock useAiCfoUsage
const mockUseAiCfoUsage = vi.fn();
vi.mock("@/common/hooks/use-ai-cfo-usage", () => ({
  useAiCfoUsage: () => mockUseAiCfoUsage(),
}));

// Mock translations
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        "aiAgent.upgradeTitle": "Upgrade Your Plan",
        "aiAgent.upgradeDescription": `You've used ${params?.used ?? ""} of ${params?.max ?? ""} tokens`,
        "aiAgent.premiumTier": "Premium",
        "aiAgent.growthTier": "Growth",
        "aiAgent.organizationTier": "Organization",
        "aiAgent.perMonth": "/mo",
        "aiAgent.tokensPerMonth": `${params?.count ?? ""} tokens/month`,
        "aiAgent.upgradeCta": "Upgrade",
        "aiAgent.popular": "Popular",
      };
      return translations[key] || key;
    },
    i18n: { language: "en" },
  }),
}));

// Mock useAllTierQuotas
const mockUseAllTierQuotas = vi.fn();
vi.mock("@/common/hooks/use-all-tier-quotas", () => ({
  useAllTierQuotas: () => mockUseAllTierQuotas(),
}));

const DEFAULT_TIER_QUOTAS = [
  {
    tier: "FREE",
    aiCfoTokensMax: 50_000,
    maxLedgers: 1,
    maxCollaboratorsPerLedger: 1,
  },
  {
    tier: "PREMIUM",
    aiCfoTokensMax: 500_000,
    maxLedgers: 5,
    maxCollaboratorsPerLedger: 5,
  },
  {
    tier: "GROWTH",
    aiCfoTokensMax: 2_000_000,
    maxLedgers: 20,
    maxCollaboratorsPerLedger: 10,
  },
  {
    tier: "ORGANIZATION",
    aiCfoTokensMax: 10_000_000,
    maxLedgers: 100,
    maxCollaboratorsPerLedger: 50,
  },
  {
    tier: "ENTERPRISE",
    aiCfoTokensMax: -1,
    maxLedgers: -1,
    maxCollaboratorsPerLedger: -1,
  },
];

function setMocks(
  tier: string,
  used: number,
  max: number,
  opts?: { limitsLoading?: boolean; quotasLoading?: boolean },
) {
  mockUseUserLimits.mockReturnValue({
    tier,
    isLoading: opts?.limitsLoading ?? false,
    refetch: vi.fn(),
  });
  mockUseAiCfoUsage.mockReturnValue({
    aiCfoTokensUsed: used,
    aiCfoTokensMax: max,
    isLoading: false,
    isAtAiCfoLimit: max > 0 && used >= max,
    usage: { aiCfoTokensUsed: used, aiCfoTokensMax: max },
    error: undefined,
    refetch: vi.fn(),
  });
  mockUseAllTierQuotas.mockReturnValue({
    quotas: DEFAULT_TIER_QUOTAS,
    getQuotaForTier: (t: string) =>
      DEFAULT_TIER_QUOTAS.find((q) => q.tier === t) ?? null,
    isLoading: opts?.quotasLoading ?? false,
    error: undefined,
  });
}

describe("AiCfoUpgradePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render while loading", () => {
    mockUseUserLimits.mockReturnValue({
      tier: "FREE",
      isLoading: true,
      refetch: vi.fn(),
    });
    mockUseAiCfoUsage.mockReturnValue({
      aiCfoTokensUsed: 0,
      aiCfoTokensMax: 10,
      isLoading: false,
      isAtAiCfoLimit: false,
      usage: null,
      error: undefined,
      refetch: vi.fn(),
    });
    mockUseAllTierQuotas.mockReturnValue({
      quotas: DEFAULT_TIER_QUOTAS,
      isLoading: false,
      error: undefined,
    });

    const { container } = render(<AiCfoUpgradePanel />);
    expect(container.firstChild).toBeNull();
  });

  it("should not render when ai cfo usage is loading", () => {
    mockUseUserLimits.mockReturnValue({
      tier: "FREE",
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseAiCfoUsage.mockReturnValue({
      aiCfoTokensUsed: 0,
      aiCfoTokensMax: 10,
      isLoading: true,
      isAtAiCfoLimit: false,
      usage: null,
      error: undefined,
      refetch: vi.fn(),
    });
    mockUseAllTierQuotas.mockReturnValue({
      quotas: DEFAULT_TIER_QUOTAS,
      isLoading: false,
      error: undefined,
    });

    const { container } = render(<AiCfoUpgradePanel />);
    expect(container.firstChild).toBeNull();
  });

  it("should not render while tier quotas are loading", () => {
    setMocks("FREE", 9, 10, { quotasLoading: true });

    const { container } = render(<AiCfoUpgradePanel />);
    expect(container.firstChild).toBeNull();
  });

  it("should render for premium users near their limit with only higher tiers", () => {
    setMocks("PREMIUM", 80, 100);

    render(<AiCfoUpgradePanel />);
    expect(screen.getByText("Upgrade Your Plan")).toBeInTheDocument();
    expect(screen.queryByText("Premium")).not.toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getAllByText("Upgrade")).toHaveLength(2);
  });

  it("should render for growth users near their limit with only organization tier", () => {
    setMocks("GROWTH", 400, 500);

    render(<AiCfoUpgradePanel />);
    expect(screen.getByText("Upgrade Your Plan")).toBeInTheDocument();
    expect(screen.queryByText("Premium")).not.toBeInTheDocument();
    expect(screen.queryByText("Growth")).not.toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getAllByText("Upgrade")).toHaveLength(1);
  });

  it("should render progress bar only for organization users near their limit", () => {
    setMocks("ORGANIZATION", 1600, 2000);

    render(<AiCfoUpgradePanel />);
    expect(screen.getByText("Upgrade Your Plan")).toBeInTheDocument();
    expect(screen.getByText("1,600 / 2,000")).toBeInTheDocument();
    expect(screen.queryByText("Premium")).not.toBeInTheDocument();
    expect(screen.queryByText("Growth")).not.toBeInTheDocument();
    expect(screen.queryByText("Organization")).not.toBeInTheDocument();
    expect(screen.queryByText("Upgrade")).not.toBeInTheDocument();
  });

  it("should not render for unlimited users (max = -1)", () => {
    setMocks("ENTERPRISE", 50, -1);

    const { container } = render(<AiCfoUpgradePanel />);
    expect(container.firstChild).toBeNull();
  });

  it("should not render when usage is below 80%", () => {
    setMocks("FREE", 7, 10);

    const { container } = render(<AiCfoUpgradePanel />);
    expect(container.firstChild).toBeNull();
  });

  it("should render when usage is exactly 80%", () => {
    setMocks("FREE", 8, 10);

    render(<AiCfoUpgradePanel />);
    expect(screen.getByText("Upgrade Your Plan")).toBeInTheDocument();
    expect(screen.getByText("8 / 10")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("should render when usage is at 100%", () => {
    setMocks("FREE", 10, 10);

    render(<AiCfoUpgradePanel />);
    expect(screen.getByText("Upgrade Your Plan")).toBeInTheDocument();
    expect(screen.getByText("10 / 10")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("should cap percentage at 100% when over limit", () => {
    setMocks("FREE", 15, 10);

    render(<AiCfoUpgradePanel />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("sells no plan while a Stripe plan waits to start", () => {
    mockWaiting.current = true;
    setMocks("PREMIUM", 9, 10);

    render(<AiCfoUpgradePanel />);
    mockWaiting.current = false;

    expect(screen.queryByText("Upgrade")).not.toBeInTheDocument();
    expect(screen.queryByText("$99.99")).not.toBeInTheDocument();
  });

  it("shows nothing on a page an app opened", () => {
    mockHidesBilling.current = true;
    setMocks("FREE", 9, 10);

    const { container } = render(<AiCfoUpgradePanel />);
    mockHidesBilling.current = false;

    expect(container).toBeEmptyDOMElement();
  });

  it("names the app and shows no web prices to a store subscriber", () => {
    mockStoreKey.current = "common.upgradeInAndroidApp";
    setMocks("PREMIUM", 9, 10);

    render(<AiCfoUpgradePanel />);
    mockStoreKey.current = null;

    expect(screen.getByText("common.upgradeInAndroidApp")).toBeInTheDocument();
    expect(screen.queryByText("$99.99")).not.toBeInTheDocument();
    expect(screen.queryByText("Upgrade")).not.toBeInTheDocument();
  });

  it("should render all three tier cards for free users", () => {
    setMocks("FREE", 9, 10);

    render(<AiCfoUpgradePanel />);

    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();

    expect(screen.getByText("$14.99")).toBeInTheDocument();
    expect(screen.getByText("$99.99")).toBeInTheDocument();
    expect(screen.getByText("$499.99")).toBeInTheDocument();

    expect(screen.getByText("Popular")).toBeInTheDocument();

    // Three upgrade buttons
    const upgradeButtons = screen.getAllByText("Upgrade");
    expect(upgradeButtons).toHaveLength(3);
  });

  it("opens each card's plan on Billing at the monthly price it quotes, with the way back", () => {
    setMocks("FREE", 9, 10);

    render(<AiCfoUpgradePanel />);

    const hrefs = screen
      .getAllByRole("link", { name: "Upgrade" })
      .map((link) => link.getAttribute("href"));
    const back = encodeURIComponent(TEST_LOCATION_HREF);
    expect(hrefs).toEqual(
      ["premium", "growth", "organization"].map(
        (plan) =>
          `/settings/billing?plan=${plan}&billing=monthly&from=ai_cfo_panel&return=${back}`,
      ),
    );
  });

  it("should track the selected target tier when an upgrade link is clicked", () => {
    setMocks("FREE", 9, 10);

    render(<AiCfoUpgradePanel />);

    fireEvent.click(screen.getAllByRole("link", { name: "Upgrade" })[0]);

    expect(mockTrack).toHaveBeenCalledWith("upgrade_prompt_clicked", {
      surface: "ai_cfo_panel",
      target_tier: "PREMIUM",
    });
  });
});
