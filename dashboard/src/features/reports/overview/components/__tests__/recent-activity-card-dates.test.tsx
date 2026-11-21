import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T12:00:00"));
    transaction.date = "2026-02-03";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // The Journal's own day headings, so a day reads here as it does there.
  it("names each day once, as the Journal does, in the active language", () => {
    language = "en";
    const { unmount } = render(<RecentActivityCard {...props} />);
    expect(
      screen.getAllByRole("rowheader").map((day) => day.textContent),
    ).toEqual(["Tue, Feb 3, 2026"]);
    unmount();

    language = "fr";
    render(<RecentActivityCard {...props} />);
    expect(
      screen.getAllByRole("rowheader").map((day) => day.textContent),
    ).toEqual(["mar. 3 févr. 2026"]);
  });

  it("keeps the year on a day from another year", () => {
    language = "en";
    transaction.date = "2017-09-08";
    render(<RecentActivityCard {...props} />);
    expect(
      screen.getByRole("rowheader", { name: "Fri, Sep 8, 2017" }),
    ).toBeInTheDocument();
  });
});
