import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecentActivityCard } from "../recent-activity-card";

/**
 * Recent activity shows a transaction's exact amount (w4/1034), through the
 * real summary and the real number formatter: doubles hid a filtered
 * one-dollar net and cut a digit from large income and transfers.
 */
const journal = vi.hoisted(() => ({
  postings: [] as Array<{
    account: string;
    units: { number: string; currency: string };
  }>,
}));
vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: {
      getLedgerJournal: {
        data: [
          {
            entry_hash: "entry",
            date: "2026-10-01",
            directive_type: "Transaction",
            flag: "*",
            payee: "qa-20261023 recent",
            narration: "",
            postings: journal.postings,
            tags: [],
            links: [],
          },
        ],
        total: 1,
      },
    },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const usd = (account: string, number: string) => ({
  account,
  units: { number, currency: "USD" },
});

function card(account = "") {
  render(
    <RecentActivityCard
      ledgerId="owner/book"
      ledgerOwner="owner"
      ledgerName="book"
      account={account}
      filter=""
      time="2026-10"
      primaryCurrency="USD"
      incomeRoot="Income"
      expensesRoot="Expenses"
      canWrite={false}
    />,
  );
}

const shows = (amount: RegExp) =>
  expect(screen.getAllByText(amount).length).toBeGreaterThan(0);

describe("Recent activity exact amounts", () => {
  it("shows a large income with every digit", () => {
    journal.postings = [
      usd("Assets:QaCash", "9007199254740993"),
      usd("Income:QaSalary", "-9007199254740993"),
    ];
    card();
    shows(/9,007,199,254,740,993\.00 USD/);
    expect(screen.queryByText(/9,007,199,254,740,992/)).toBeNull();
  });

  it("shows a filtered one-dollar net instead of multiple postings", () => {
    journal.postings = [
      usd("Assets:QaCash", "9007199254740993"),
      usd("Assets:QaCash", "-9007199254740992"),
      usd("Equity:QaOpening", "-1"),
    ];
    card("Assets:QaCash");
    shows(/^\+?1\.00 USD$/);
  });

  it("shows a large transfer with every digit", () => {
    journal.postings = [
      usd("Assets:QaCash", "-9007199254740993"),
      usd("Assets:QaReserve", "9007199254740993"),
    ];
    card();
    shows(/9,007,199,254,740,993\.00 USD/);
  });
});
