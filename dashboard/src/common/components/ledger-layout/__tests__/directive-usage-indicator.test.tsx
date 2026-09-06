import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { GetLedgerEntriesCountPerTypeDocument } from "@/graphql/definitions.ts";

const mockUseQuery = vi.fn();
const mockLimits = {
  current: { maxDirectives: 5000 } as {
    maxDirectives: number;
  } | null,
};

vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: React.ComponentProps<"a"> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/common/hooks/use-user-limits.ts", () => ({
  useUserLimits: () => ({ limits: mockLimits.current }),
}));

vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({
    useReactNativeContext: () => ({ isReactNative: false }),
  }),
);

vi.mock("@/common/analytics", () => ({
  track: vi.fn(),
}));

import { DirectiveUsageIndicator } from "../directive-usage-indicator";

const counted = [
  { type: "Transaction", number: 2000 },
  { type: "Balance", number: 51 },
];

describe("DirectiveUsageIndicator", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
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
});
