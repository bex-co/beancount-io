import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectiveType, type JournalBalance } from "@/common/types/journal";
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
  registerAccount?: string,
) {
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
              accountFilter: "",
            }}
            data={data}
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
        wallet,
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
}

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
