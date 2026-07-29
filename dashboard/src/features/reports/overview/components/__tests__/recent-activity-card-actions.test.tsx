import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecentActivityCard } from "../recent-activity-card";

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: { getLedgerJournal: { data: [], total: 0 } },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    search,
  }: {
    children: React.ReactNode;
    to: string;
    search?: Record<string, string>;
  }) => (
    <a href="#" data-to={to} data-search={JSON.stringify(search)}>
      {children}
    </a>
  ),
}));

const props = {
  ledgerId: "alice/books",
  ledgerOwner: "alice",
  ledgerName: "books",
  account: "",
  filter: "",
  time: "",
  primaryCurrency: "USD",
  incomeRoot: "Income",
  expensesRoot: "Expenses",
};

describe("RecentActivityCard actions", () => {
  it("uses the canonical journal action URL for writers", () => {
    render(<RecentActivityCard {...props} canWrite />);

    const link = screen.getByRole("link", { name: "journal.newEntry" });
    expect(link).toHaveAttribute(
      "data-to",
      "/ledger/$ledgerOwner/$ledgerName/journal",
    );
    expect(link).toHaveAttribute(
      "data-search",
      JSON.stringify({ action: "new-entry", directive: "transaction" }),
    );
  });

  it("shows only the view link to read-only users", () => {
    render(<RecentActivityCard {...props} canWrite={false} />);

    expect(
      screen.queryByRole("link", { name: "journal.newEntry" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /page.overview.viewAll/ }),
    ).toBeInTheDocument();
  });
});
