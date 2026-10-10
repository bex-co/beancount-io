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

/**
 * Text a row shows at a breakpoint, resolving Tailwind's responsive display
 * classes the way the browser would (jsdom applies no CSS).
 */
function visibleText(row: HTMLElement, viewport: "narrow" | "desktop") {
  const clone = row.cloneNode(true) as HTMLElement;
  for (const el of Array.from(clone.querySelectorAll<HTMLElement>("*"))) {
    const classes = el.className.toString().split(/\s+/);
    const hidden =
      viewport === "narrow"
        ? classes.includes("hidden")
        : classes.includes("sm:hidden") ||
          (classes.includes("hidden") &&
            !classes.some((c) => /^sm:(block|flex|inline-flex)$/.test(c)));
    if (hidden) el.remove();
  }
  return clone.textContent ?? "";
}

function occurrences(text: string, needle: string) {
  return text.split(needle).length - 1;
}

describe("RecentActivityCard account summary", () => {
  beforeEach(() => {
    postings = [];
    narration = "Coffee";
    payee = "Cafe";
  });

  it("names a row's accounts once at desktop width and keeps them on narrow rows", () => {
    postings = [
      { account: "Expenses:Food", units: { number: "4.50", currency: "USD" } },
      { account: "Assets:Cash", units: { number: "-4.50", currency: "USD" } },
    ];
    render(<RecentActivityCard {...props} />);
    const row = screen.getByRole("button", { name: /Cafe/ });

    expect(occurrences(visibleText(row, "desktop"), "Food · Cash")).toBe(1);
    expect(occurrences(visibleText(row, "narrow"), "Food · Cash")).toBe(1);
  });

  it("keeps a transfer's accounts in the subtitle beside its Transfer label", () => {
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
    const row = screen.getByRole("button", { name: /Cafe/ });
    const desktop = visibleText(row, "desktop");

    expect(occurrences(desktop, "Savings · Checking")).toBe(1);
    expect(desktop).toContain("Transfer");
    expect(occurrences(visibleText(row, "narrow"), "Savings · Checking")).toBe(
      1,
    );
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
        cashAmount: "-8,464.95 USD",
      },
      {
        narration: "Sell 100 NWRB post-split shares — long-term loss",
        postings: lossSale,
        expenseAmount: "-139.95 USD",
        cashAmount: "905.05 USD",
      },
    ];

    it.each(trades)(
      "shows Multiple postings instead of an expense subtotal for $narration at both widths",
      (trade) => {
        postings = trade.postings;
        narration = trade.narration;
        payee = "";
        render(<RecentActivityCard {...props} canWrite={false} />);
        const activity = screen.getByRole("region", {
          name: /Recent activity/i,
        });
        const row = within(activity).getByRole("button", {
          name: (name) => name.includes(trade.narration),
        });

        expect(within(row).getByText("Multiple postings")).toBeInTheDocument();
        for (const viewport of ["narrow", "desktop"] as const) {
          const text = visibleText(row, viewport);
          expect(text).toContain("Multiple postings");
          expect(text).not.toContain(trade.expenseAmount);
          expect(text).not.toContain(trade.cashAmount);
        }
      },
    );

    it.each(trades)(
      "shows the explicit cash-account movement for $narration",
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
        const row = screen.getByRole("button", {
          name: (name) => name.includes(trade.narration),
        });

        expect(within(row).getByText(trade.cashAmount)).toBeInTheDocument();
        expect(
          within(row).queryByText("Multiple postings"),
        ).not.toBeInTheDocument();
        expect(visibleText(row, "narrow")).toContain(trade.cashAmount);
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
      const row = screen.getByRole("button", { name: /Cafe/ });

      expect(within(row).getByText("-4.95 USD")).toBeInTheDocument();
      expect(
        within(row).queryByText("Multiple postings"),
      ).not.toBeInTheDocument();
    });

    it.each([
      [
        "payroll",
        [
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
        ],
      ],
      [
        "gain sale",
        [
          {
            account: "Assets:Brokerage:ACME",
            units: { number: "-40", currency: "ACME" },
            cost: {
              number: "84.60",
              currency: "USD",
              date: "2025-09-08",
              label: null,
            },
          },
          {
            account: "Assets:Brokerage:Cash",
            units: { number: "3665.05", currency: "USD" },
          },
          {
            account: "Expenses:Brokerage:Commissions",
            units: { number: "4.95", currency: "USD" },
          },
          {
            account: "Income:Investment:CapitalGains",
            units: { number: "-286.00", currency: "USD" },
          },
        ],
      ],
    ] as const)(
      "preserves the Multiple postings fallback for %s",
      (_, controlPostings) => {
        postings = [...controlPostings];
        render(<RecentActivityCard {...props} />);
        expect(
          within(screen.getByRole("button", { name: /Cafe/ })).getByText(
            "Multiple postings",
          ),
        ).toBeInTheDocument();
      },
    );
  });
});
