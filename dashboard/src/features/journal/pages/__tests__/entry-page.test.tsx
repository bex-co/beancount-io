import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EntryPage from "../entry-page";

const mockUseParams = vi.fn();
const mockNavigate = vi.fn();
const blockerState = vi.hoisted(() => ({
  status: "idle" as "idle" | "blocked",
  reset: vi.fn(),
  proceed: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => mockUseParams(),
  useNavigate: () => mockNavigate,
  useBlocker: () => blockerState,
  Link: ({
    children,
    to,
    params,
    ...rest
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => (
    <a
      href={`${to}?${new URLSearchParams(params ?? {}).toString()}`}
      data-to={to}
      data-params={JSON.stringify(params ?? {})}
      {...rest}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "Real Estate Example" }),
}));

vi.mock("@/features/journal/components/entry-context-panel", () => ({
  EntryContextPanel: ({
    entryHash,
    ledgerId,
  }: {
    entryHash: string;
    ledgerId: string;
  }) => (
    <div data-testid="entry-context-panel">
      <span data-testid="ledger-id">{ledgerId}</span>
      <span data-testid="entry-hash">{entryHash}</span>
      <textarea aria-label="entry-source" defaultValue="draft" />
    </div>
  ),
}));

describe("EntryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    blockerState.status = "idle";
    mockUseParams.mockReturnValue({
      ledgerOwner: "open_ledger",
      ledgerName: "real-estate-example",
      entryHash: "2f4431f658f3553e73512ea3ebc1a2d4",
    });
  });

  it("returns focus to the retained editor after Keep editing (w4/1079)", async () => {
    blockerState.status = "blocked";
    const user = userEvent.setup();
    const { rerender } = render(<EntryPage />);
    await user.click(
      screen.getByRole("button", { name: "journal.keepEditing" }),
    );
    expect(blockerState.reset).toHaveBeenCalled();
    blockerState.status = "idle";
    rerender(<EntryPage />);
    await waitFor(() =>
      expect(screen.getByLabelText("entry-source")).toHaveFocus(),
    );
  });

  it("binds the route ledger identity and entry hash to the context panel", () => {
    render(<EntryPage />);

    expect(screen.getByTestId("entry-context-panel")).toBeInTheDocument();
    expect(screen.getByTestId("ledger-id")).toHaveTextContent(
      "open_ledger/real-estate-example",
    );
    expect(screen.getByTestId("entry-hash")).toHaveTextContent(
      "2f4431f658f3553e73512ea3ebc1a2d4",
    );
  });

  it("fails closed when params point at a different ledger or hash", () => {
    mockUseParams.mockReturnValue({
      ledgerOwner: "other_owner",
      ledgerName: "other-ledger",
      entryHash: "deadbeef",
    });

    render(<EntryPage />);

    expect(screen.getByTestId("ledger-id")).toHaveTextContent(
      "other_owner/other-ledger",
    );
    expect(screen.getByTestId("entry-hash")).toHaveTextContent("deadbeef");
    expect(screen.getByTestId("ledger-id")).not.toHaveTextContent(
      "open_ledger/real-estate-example",
    );
    expect(screen.getByTestId("entry-hash")).not.toHaveTextContent(
      "2f4431f658f3553e73512ea3ebc1a2d4",
    );
  });

  it("links back to the same ledger journal", () => {
    render(<EntryPage />);

    const back = screen.getByText("journal.backToJournal").closest("a");
    expect(back).toHaveAttribute(
      "data-to",
      "/ledger/$ledgerOwner/$ledgerName/journal",
    );
    expect(back).toHaveAttribute(
      "data-params",
      JSON.stringify({
        ledgerOwner: "open_ledger",
        ledgerName: "real-estate-example",
      }),
    );
  });
});
