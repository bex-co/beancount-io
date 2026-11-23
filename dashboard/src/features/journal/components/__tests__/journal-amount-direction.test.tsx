import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DirectiveType,
  type JournalBalance,
  type JournalPosting,
  type JournalTransaction,
} from "@/common/types/journal";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import {
  LedgerProviderContext,
  type LedgerProviderContextType,
} from "@/common/providers/ledger-provider/context";
import { JournalTable, type JournalTableItem } from "../journal-table";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.unmock("@/i18n");

afterEach(cleanup);

const ledger = {
  ledgerData: { options: { renderCommas: true } },
} as unknown as LedgerProviderContextType;

async function renderTable(
  layout: "lines" | "days",
  data: JournalTableItem[],
  language: "en" | "de" | "fa",
  options: {
    registerAccount?: string;
    accountFilter?: string;
    openedAccounts?: ReadonlyMap<string, string>;
  } = {},
) {
  const { registerAccount, accountFilter = "" } = options;
  const localization = createLocalization();
  await localization.changeLanguage(language);
  render(
    <LocalizationProvider localization={localization}>
      <LedgerProviderContext.Provider value={ledger}>
        <div dir={localization.i18n.dir()} lang={language}>
          <JournalTable
            layout={layout}
            money={{
              primaryCurrency: "USD",
              incomeRoot: "Income",
              expensesRoot: "Expenses",
              accountFilter,
            }}
            data={data}
            openedAccounts={options.openedAccounts}
            showPostings={false}
            showMetadata={false}
            onEntryClick={vi.fn()}
            register={
              registerAccount
                ? { account: registerAccount, withChildren: false }
                : undefined
            }
          />
        </div>
      </LedgerProviderContext.Provider>
    </LocalizationProvider>,
  );
}

const wallet = "Assets:Qa:Wallet";
const balance = (
  amount: string,
  difference: string | null,
  tolerance: string | null = null,
  currency = "USD",
): JournalBalance => ({
  directive_type: DirectiveType.BALANCE,
  entry_hash: "balance",
  date: "2024-03-03",
  account: wallet,
  amount: { number: amount, currency },
  tolerance,
  diff_amount: difference === null ? null : { number: difference, currency },
});

describe.each(["lines", "days"] as const)(
  "balance assertions in %s",
  (layout) => {
    it.each([
      { amount: "250.00", diff: "17.00", text: "17.00 USD too much" },
      { amount: "280.00", diff: "-13.00", text: "13.00 USD too little" },
    ])(
      "explains the failure and the accumulated balance for $amount",
      async ({ amount, diff, text }) => {
        await renderTable(layout, [{ directive: balance(amount, diff) }], "en");
        const entry = screen.getByRole("button", {
          name: /^Open entry 2024-03-03 Balance/,
        });
        const row = entry.closest("tr")!;
        expect(row).toHaveTextContent("Failed");
        expect(row).toHaveTextContent("accumulated 267.00 USD");
        expect(row).toHaveTextContent(text);
        expect(entry).toHaveAccessibleName(expect.stringContaining("Failed"));
        expect(entry).toHaveAccessibleName(
          expect.stringContaining("accumulated 267.00 USD"),
        );
        expect(entry).toHaveAccessibleName(expect.stringContaining(text));
      },
    );

    it("keeps all source digits for an account assertion with explicit tolerance", async () => {
      await renderTable(
        layout,
        [{ directive: balance("100.004", "-0.004", "0.001") }],
        "en",
        { registerAccount: wallet },
      );
      const entry = screen.getByRole("button", {
        name: /^Open entry 2024-03-03 Balance/,
      });
      expectIsolatedAmount(entry.closest("tr")!, "100.004 ~ 0.001 USD");
      expect(entry).toHaveAccessibleName(
        expect.stringContaining("100.004 ~ 0.001 USD"),
      );
    });

    it.each([
      ["en", "4,000,000 COMMON", "Balance"],
      ["de", "4.000.000 COMMON", "Saldo"],
    ] as const)(
      "groups source digits for passing assertions in %s",
      async (language, amount, directiveName) => {
        await renderTable(
          layout,
          [{ directive: balance("4000000", null, null, "COMMON") }],
          language,
          { openedAccounts: new Map([[wallet, "2024-03-01"]]) },
        );
        const entry = screen.getByRole("button", { name: /2024-03-03/ });
        const row = entry.closest("tr")!;
        expectIsolatedAmount(row, amount);
        expect(entry).toHaveAccessibleName(
          expect.stringContaining(directiveName),
        );
        expect(entry).toHaveAccessibleName(expect.stringContaining(amount));
        expect(row).toHaveTextContent(language === "en" ? "Matches" : "Stimmt");
      },
    );

    it("uses German separators and words in the failure and its accessible name", async () => {
      await renderTable(
        layout,
        [{ directive: balance("100.004", "-0.004", "0.001") }],
        "de",
      );
      const entry = screen.getByRole("button", { name: /2024-03-03 Saldo/ });
      const row = entry.closest("tr")!;
      expectIsolatedAmount(row, "100,004 ~ 0,001 USD");
      expectIsolatedAmount(row, "100,000 USD");
      expect(row).toHaveTextContent("0,004 USD zu wenig");
      expect(entry).toHaveAccessibleName(
        expect.stringContaining("Fehlgeschlagen"),
      );
      expect(entry).toHaveAccessibleName(
        expect.stringContaining("angesammelt 100,000 USD"),
      );
    });
  },
);

function expectIsolatedAmount(container: HTMLElement, text: string) {
  expect(container.textContent).toContain(text);
  const run = Array.from(container.querySelectorAll("bdi")).find(
    (candidate) => candidate.textContent === text,
  );
  expect(run).toBeDefined();
  expect(run).toHaveAttribute("dir", "ltr");
  expect(run?.textContent).toBe(text);
  return run!;
}

const cash = "Assets:Brokerage:Cash";
const commission = "Expenses:Brokerage:Commissions";
const posting = (
  account: string,
  number: string,
  currency = "USD",
): JournalPosting => ({ account, units: { number, currency } });
const position = (number: string, currency: string): JournalPosting => ({
  ...posting(`Assets:Brokerage:${currency}`, number, currency),
  cost: { number: "84.60", currency: "USD", date: "2024-03-01" },
});
const transaction = (
  narration: string,
  postings: JournalPosting[],
): JournalTransaction => ({
  directive_type: DirectiveType.TRANSACTION,
  entry_hash: narration,
  date: "2024-03-03",
  flag: "*",
  narration,
  postings,
  tags: [],
  links: [],
});

const gainSale = transaction("Sell ACME at a gain", [
  position("-40", "ACME"),
  posting(cash, "3670.00"),
  posting(commission, "4.95"),
  posting(cash, "-4.95"),
  posting("Income:CapitalGains:ShortTerm", "-286.00"),
]);

const lossSale = transaction("Sell ACME at a loss", [
  position("-10", "ACME"),
  posting(cash, "711.00"),
  posting(commission, "4.95"),
  posting(cash, "-4.95"),
  posting("Expenses:CapitalLoss:LongTerm", "135.00"),
]);

describe.each(["lines", "days"] as const)(
  "transaction amounts in %s",
  (layout) => {
    const row = (narration: string) =>
      screen
        .getByRole("button", { name: new RegExp(`^Open entry .*${narration}`) })
        .closest("tr")!;

    it.each([
      gainSale,
      lossSale,
      transaction("Sell ACME without a commission", [
        position("-40", "ACME"),
        posting(cash, "3670.00"),
        posting("Income:CapitalGains:ShortTerm", "-286.00"),
      ]),
      transaction("Exchange ACME for NWRB", [
        position("-1", "ACME"),
        position("1", "NWRB"),
      ]),
    ])("shows multiple postings for $narration", async (sale) => {
      await renderTable(layout, [{ directive: sale }], "en");
      expect(row(sale.narration!)).toHaveTextContent("Multiple postings");
    });

    it("shows exact sale cash movement when filtered to cash", async () => {
      await renderTable(layout, [{ directive: gainSale }], "en", {
        accountFilter: cash,
      });
      expectIsolatedAmount(row(gainSale.narration!), "+3,665.05 USD");
    });

    it.each([
      ["Return to card", "Liabilities:CreditCard:Visa", "12.00", "+12.00 USD"],
      ["Return to bank", cash, "7.00", "+7.00 USD"],
    ])(
      "shows a refund as money in for %s",
      async (name, account, amount, shown) => {
        const refund = transaction(name, [
          posting(account, amount),
          posting("Expenses:Groceries", `-${amount}`),
        ]);
        await renderTable(layout, [{ directive: refund }], "en");
        expect(
          expectIsolatedAmount(row(name), shown).closest(".text-chart-2"),
        ).not.toBeNull();
      },
    );

    it("shows an income reversal as money out", async () => {
      const reversal = transaction("Return overpaid salary", [
        posting(cash, "-50.00"),
        posting("Income:Salary", "50.00"),
      ]);
      await renderTable(layout, [{ directive: reversal }], "en");
      expect(
        expectIsolatedAmount(
          row("Return overpaid salary"),
          "-50.00 USD",
        ).closest(".text-chart-2"),
      ).toBeNull();
    });

    it("colours each currency by its own direction", async () => {
      const mixed = transaction("Salary adjustment", [
        posting(cash, "25.00"),
        posting("Income:Salary", "-25.00"),
        posting(cash, "-5.00", "EUR"),
        posting("Income:Salary", "5.00", "EUR"),
      ]);
      await renderTable(layout, [{ directive: mixed }], "en");
      const adjustment = row("Salary adjustment");
      expect(
        expectIsolatedAmount(adjustment, "+25.00 USD").closest(".text-chart-2"),
      ).not.toBeNull();
      expect(
        expectIsolatedAmount(adjustment, "-5.00 EUR").closest(".text-chart-2"),
      ).toBeNull();
    });

    it("shows payroll earnings and unsigned purchases and transfers", async () => {
      const directives = [
        transaction("Payroll", [
          posting(cash, "2700.00"),
          posting("Income:Salary", "-4000.00"),
          posting("Expenses:Payroll:Tax", "1300.00"),
        ]),
        transaction("Buy ACME", [
          position("100", "ACME"),
          posting(commission, "4.95"),
          posting(cash, "-8464.95"),
        ]),
        transaction("Transfer to savings", [
          posting("Assets:Savings", "300.00"),
          posting(cash, "-300.00"),
        ]),
      ];
      await renderTable(
        layout,
        directives.map((directive) => ({ directive })),
        "en",
      );
      expect(
        expectIsolatedAmount(row("Payroll"), "+4,000.00 USD").closest(
          ".text-chart-2",
        ),
      ).not.toBeNull();
      expectIsolatedAmount(row("Buy ACME"), "8,464.95 USD");
      expect(
        expectIsolatedAmount(row("Transfer to savings"), "300.00 USD").closest(
          ".text-chart-2",
        ),
      ).toBeNull();
    });
  },
);

// An account's change, units and balance: journal-register.test.tsx.
describe.each(["lines", "days"] as const)(
  "journal financial amounts under RTL layout (%s)",
  (layout) => {
    it.each(["en", "fa"] as const)(
      "%s preserves exact Balance, Price and custom budget amounts while isolating only financial text",
      async (language) => {
        await renderTable(
          layout,
          [
            {
              directive: {
                directive_type: DirectiveType.BALANCE,
                entry_hash: "rtl-balance",
                date: "2026-10-15",
                account: "Assets:Bank:حساب",
                diff_amount: { number: "-0.0200", currency: "USD" },
              },
            },
            {
              directive: {
                directive_type: DirectiveType.PRICE,
                entry_hash: "rtl-price",
                date: "2026-10-15",
                currency: "BTC",
                amount: { number: "145.720000", currency: "USD" },
              },
            },
            {
              directive: {
                directive_type: DirectiveType.CUSTOM,
                entry_hash: "rtl-budget",
                date: "2026-10-15",
                type: "budget",
                values: [
                  "Expenses:خوراک",
                  "monthly",
                  { number: "-75.5000", currency: "EUR" },
                ],
              },
            },
          ],
          language,
        );
        const table = screen.getByRole("table");
        const amounts =
          language === "fa"
            ? ["۰٫۰۲۰۰ USD", "۱۴۵٫۷۲۰۰۰۰ USD/BTC", "\u200e−۷۵٫۵۰۰۰ EUR"]
            : ["0.0200 USD", "145.720000 USD/BTC", "-75.5000 EUR"];
        for (const text of amounts) {
          expectIsolatedAmount(table, text);
        }
        // Only figures are isolated runs.
        for (const run of Array.from(table.querySelectorAll("bdi")))
          expect(amounts).toContain(run.textContent);
        for (const text of ["Assets:Bank:حساب", "Expenses:خوراک", "monthly"]) {
          const label = within(table).getByText(text, { exact: true });
          expect(label.closest("bdi")).toBeNull();
          expect(label.closest("[dir]")).toHaveAttribute(
            "dir",
            language === "fa" ? "rtl" : "ltr",
          );
        }
      },
    );
  },
);
