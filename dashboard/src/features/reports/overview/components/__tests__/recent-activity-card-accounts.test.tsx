import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecentActivityCard } from "../recent-activity-card";
import type { JournalPosting } from "@/common/types/journal";

let postings: JournalPosting[] = [];
let narration = "Coffee";
let payee = "Cafe";

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: {
      getLedgerJournal: {
        data: [
          {
            entry_hash: "hash-1",
            date: "2026-02-03",
            directive_type: "Transaction",
            flag: "*",
            payee,
            narration,
            postings,
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

/** The Journal row Recent activity draws for the entry named `name`. */
function rowOf(name: string | RegExp) {
  return screen
    .getByRole("button", {
      name: (label) =>
        label.startsWith("Open entry ") &&
        (typeof name === "string" ? label.includes(name) : name.test(label)),
    })
    .closest("tr")!;
}

/**
 * Recent activity draws the Journal's own rows (the day layout), so an entry
 * reads the same on the Overview as in the Journal: where the money moved,
 * and one amount by the Journal's rule.
 */
describe("RecentActivityCard rows", () => {
  beforeEach(() => {
    postings = [];
    narration = "Coffee";
    payee = "Cafe";
  });

  it("draws the Journal's list under the section's own name", () => {
    postings = [
      { account: "Expenses:Food", units: { number: "4.50", currency: "USD" } },
      { account: "Assets:Cash", units: { number: "-4.50", currency: "USD" } },
    ];
    render(<RecentActivityCard {...props} />);

    expect(
      screen.getByRole("table", { name: "Recent activity" }),
    ).toBeInTheDocument();
    // One disclosure for the entry's postings, as the Journal offers.
    const toggle = within(rowOf("Cafe")).getByRole("button", {
      expanded: false,
    });
    expect(toggle).toHaveTextContent("2");
  });

  it("says where the money moved, from the account it left to the one it reached", () => {
    postings = [
      { account: "Expenses:Food", units: { number: "4.50", currency: "USD" } },
      { account: "Assets:Cash", units: { number: "-4.50", currency: "USD" } },
    ];
    render(<RecentActivityCard {...props} />);
    const row = rowOf("Cafe");

    // Wide, by the accounts' full names; narrow, by their last names.
    expect(row).toHaveTextContent("Assets:Cash");
    expect(row).toHaveTextContent("Expenses:Food");
    expect(row).toHaveTextContent("Cash → Food");
    expect(row).toHaveTextContent("-4.50 USD");
  });

  it("shows a transfer between the reader's own accounts by its size", () => {
    postings = [
      {
        account: "Assets:Savings",
        units: { number: "100", currency: "USD" },
      },
      {
        account: "Assets:Checking",
        units: { number: "-100", currency: "USD" },
      },
    ];
    render(<RecentActivityCard {...props} />);
    const row = rowOf("Cafe");

    expect(row).toHaveTextContent("Assets:Checking");
    expect(row).toHaveTextContent("Assets:Savings");
    expect(row).toHaveTextContent("100.00 USD");
    expect(row).not.toHaveTextContent("-100.00 USD");
    expect(row).not.toHaveTextContent("+100.00 USD");
  });

  it.each([
    {
      from: "Assets:Qa:Bank1:Checking",
      to: "Assets:Qa:Bank2:Checking",
      label: "Bank1:Checking → Bank2:Checking",
    },
    {
      from: "Equity:CapTable:Options:Unvested:Carol",
      to: "Equity:CapTable:Options:Vested:Carol",
      label: "Unvested:Carol → Vested:Carol",
    },
  ])(
    "distinguishes matching leaves in the compact $label row",
    ({ from, to, label }) => {
      postings = [
        { account: to, units: { number: "100", currency: "USD" } },
        { account: from, units: { number: "-100", currency: "USD" } },
      ];
      render(<RecentActivityCard {...props} />);
      const row = rowOf("Cafe");

      expect(within(row).getByText(label)).toHaveAttribute("dir", "auto");
      expect(row).toHaveTextContent(from);
      expect(row).toHaveTextContent(to);
    },
  );

  it("qualifies the shown accounts when the entry has no directional flow", () => {
    postings = [
      { account: "Assets:Bank1:Cash", units: { number: "0", currency: "USD" } },
      { account: "Assets:Bank2:Cash", units: { number: "0", currency: "USD" } },
    ];
    render(<RecentActivityCard {...props} />);
    expect(
      within(rowOf("Cafe")).getByText("Bank1:Cash · Bank2:Cash"),
    ).toBeInTheDocument();
  });

  describe("costed investment activity amounts", () => {
    const purchase: JournalPosting[] = [
      {
        account: "Assets:Brokerage:ACME",
        units: { number: "100", currency: "ACME" },
        cost: {
          number: "84.60",
          currency: "USD",
          date: "2025-09-08",
          label: null,
        },
        price: null,
      },
      {
        account: "Expenses:Brokerage:Commissions",
        units: { number: "4.95", currency: "USD" },
      },
      {
        account: "Assets:Brokerage:Cash",
        units: { number: "-8464.95", currency: "USD" },
      },
    ];
    const lossSale: JournalPosting[] = [
      {
        account: "Assets:Brokerage:NWRB",
        units: { number: "-100", currency: "NWRB" },
        cost: {
          number: "10.45",
          currency: "USD",
          date: "2024-03-12",
          label: null,
        },
        price: null,
      },
      {
        account: "Assets:Brokerage:Cash",
        units: { number: "910.00", currency: "USD" },
      },
      {
        account: "Assets:Brokerage:Cash",
        units: { number: "-4.95", currency: "USD" },
      },
      {
        account: "Expenses:Brokerage:Commissions",
        units: { number: "4.95", currency: "USD" },
      },
      {
        account: "Expenses:CapitalLoss:LongTerm",
        units: { number: "135.00", currency: "USD" },
      },
    ];

    const trades = [
      {
        narration: "Buy 100 ACME @ $84.60",
        postings: purchase,
        expenseAmount: "-4.95 USD",
        cashChange: "-8,464.95 USD",
      },
      {
        narration: "Sell 100 NWRB post-split shares — long-term loss",
        postings: lossSale,
        expenseAmount: "-139.95 USD",
        cashChange: "+905.05 USD",
      },
    ];

    it.each(trades)(
      "never passes an expense subtotal off as $narration",
      (trade) => {
        postings = trade.postings;
        narration = trade.narration;
        payee = "";
        render(<RecentActivityCard {...props} canWrite={false} />);

        expect(rowOf(trade.narration)).not.toHaveTextContent(
          trade.expenseAmount,
        );
      },
    );

    it.each(trades)(
      "shows the filtered cash account's own change for $narration",
      (trade) => {
        postings = trade.postings;
        narration = trade.narration;
        payee = "";
        render(
          <RecentActivityCard
            {...props}
            account="Assets:Brokerage:Cash"
            canWrite={false}
          />,
        );

        expect(rowOf(trade.narration)).toHaveTextContent(trade.cashChange);
      },
    );

    it("continues showing an ordinary fee as an expense amount", () => {
      postings = [
        {
          account: "Assets:Brokerage:Cash",
          units: { number: "-4.95", currency: "USD" },
        },
        {
          account: "Expenses:Brokerage:Commissions",
          units: { number: "4.95", currency: "USD" },
        },
      ];
      render(<RecentActivityCard {...props} />);

      expect(rowOf("Cafe")).toHaveTextContent("-4.95 USD");
    });

    it("shows what a payroll earned, as the Journal does", () => {
      postings = [
        {
          account: "Assets:Checking",
          units: { number: "2550.60", currency: "USD" },
        },
        {
          account: "Income:Salary",
          units: { number: "-4639.70", currency: "USD" },
        },
        {
          account: "Expenses:Taxes",
          units: { number: "2089.10", currency: "USD" },
        },
      ];
      render(<RecentActivityCard {...props} />);

      // The Overview used to say "Multiple postings" here while the Journal
      // showed the earnings.
      expect(rowOf("Cafe")).toHaveTextContent("+4,639.70 USD");
    });
  });
});
