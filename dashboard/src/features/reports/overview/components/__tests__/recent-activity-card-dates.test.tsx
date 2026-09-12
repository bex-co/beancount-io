import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecentActivityCard } from "../recent-activity-card";

const transaction = {
  entry_hash: "hash-1",
  date: "2026-02-03",
  directive_type: "Transaction",
  flag: "*",
  payee: "Cafe",
  narration: "Coffee",
  postings: [
    {
      account: "Expenses:Food",
      units: { number: "4.50", currency: "USD" },
    },
    {
      account: "Assets:Cash",
      units: { number: "-4.50", currency: "USD" },
    },
  ],
  tags: [],
  links: [],
};

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: { getLedgerJournal: { data: [transaction], total: 1 } },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

let language = "en";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language },
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#">{children}</a>
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
  canWrite: true,
};

describe("RecentActivityCard dates", () => {
  it("formats transaction dates in the active language", () => {
    language = "en";
    const { unmount } = render(<RecentActivityCard {...props} />);
    // The date is rendered twice (desktop column and mobile line).
    expect(screen.getAllByText("Feb 3")).toHaveLength(2);
    unmount();

    language = "fr";
    render(<RecentActivityCard {...props} />);
    expect(screen.getAllByText("3 févr.")).toHaveLength(2);
  });
});
