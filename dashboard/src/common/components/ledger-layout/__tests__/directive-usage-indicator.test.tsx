import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { GetLedgerEntriesCountPerTypeDocument } from "@/graphql/definitions.ts";

const mockUseQuery = vi.fn();
const mockIsOwner = vi.fn(() => true);
const mockLimits = {
  current: { maxDirectives: 5000 } as {
    maxDirectives: number;
  } | null,
};

vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@tanstack/react-router", async () => {
  const { routerMock } = await import("@/test/mocks/router");
  return routerMock;
});

vi.mock("@/common/hooks/use-user-limits.ts", () => ({
  useUserLimits: () => ({ limits: mockLimits.current, tier: "FREE" }),
}));

vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({
    useReactNativeContext: () => ({ isReactNative: false }),
  }),
);

vi.mock("@/common/hooks/use-is-ledger-owner.ts", () => ({
  useIsLedgerOwner: () => mockIsOwner(),
}));
vi.mock("@/common/hooks/use-store-upgrade-key", () => ({
  useUpgradeChannel: () => ({ storeUpgradeKey: null, sellsHere: true }),
}));
vi.mock("@/common/analytics", () => ({
  track: vi.fn(),
}));

import { DirectiveUsageIndicator } from "../directive-usage-indicator";
import { TEST_LOCATION_HREF } from "@/test/mocks/router";

const counted = [
  { type: "Transaction", number: 2000 },
  { type: "Balance", number: 51 },
];

describe("DirectiveUsageIndicator", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockIsOwner.mockReturnValue(true);
    mockLimits.current = { maxDirectives: 5000 };
  });

  it("owns the count query for the open ledger", () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });

    render(<DirectiveUsageIndicator ledgerId="owner/ledger" />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      GetLedgerEntriesCountPerTypeDocument,
      { variables: { ledgerId: "owner/ledger" }, skip: false },
    );
  });

  it("renders nothing while the count loads rather than a false 0 / max", () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });

    const { container } = render(
      <DirectiveUsageIndicator ledgerId="owner/ledger" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the count is unavailable", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("count failed"),
    });

    const { container } = render(
      <DirectiveUsageIndicator ledgerId="owner/ledger" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the real count against the limit once it arrives", () => {
    mockUseQuery.mockReturnValue({
      data: { getLedgerEntriesCountPerType: counted },
      loading: false,
    });

    render(<DirectiveUsageIndicator ledgerId="owner/ledger" />);

    expect(screen.getByText("2,051 / 5,000")).toBeInTheDocument();
    expect(screen.queryByText(/^0 \//)).not.toBeInTheDocument();
  });

  it("renders nothing for unlimited tiers even with a count", () => {
    mockLimits.current = { maxDirectives: -1 };
    mockUseQuery.mockReturnValue({
      data: { getLedgerEntriesCountPerType: counted },
      loading: false,
    });

    const { container } = render(
      <DirectiveUsageIndicator ledgerId="owner/ledger" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("opens Premium yearly on Billing near the cap, with the way back", () => {
    mockUseQuery.mockReturnValue({
      data: {
        getLedgerEntriesCountPerType: [{ type: "Transaction", number: 4600 }],
      },
      loading: false,
    });

    render(<DirectiveUsageIndicator ledgerId="owner/ledger" />);

    expect(
      screen.getByRole("link", { name: "Upgrade to Pro" }),
    ).toHaveAttribute(
      "href",
      `/settings/billing?plan=premium&billing=yearly&from=directive_usage&return=${encodeURIComponent(TEST_LOCATION_HREF)}`,
    );
  });

  it("offers a collaborator no purchase: only the owner can raise the limit", () => {
    mockIsOwner.mockReturnValue(false);
    mockUseQuery.mockReturnValue({
      data: {
        getLedgerEntriesCountPerType: [{ type: "Transaction", number: 5000 }],
      },
      loading: false,
    });

    render(<DirectiveUsageIndicator ledgerId="owner/ledger" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/Only the owner can raise it/)).toBeInTheDocument();
  });
});
