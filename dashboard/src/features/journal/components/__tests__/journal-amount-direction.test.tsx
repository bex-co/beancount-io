import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectiveType } from "@/common/types/journal";
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
  language: "en" | "fa",
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
          />
        </div>
      </LedgerProviderContext.Provider>
    </LocalizationProvider>,
  );
}

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
        // A balance off by an amount says so in the translator's own sentence,
        // the amount in its place.
        expect(table).toHaveTextContent("-0.0200 USD");
        for (const text of ["145.720000 USD/BTC", "-75.5000 EUR"]) {
          expectIsolatedAmount(table, text);
        }
        // Only figures are isolated runs.
        for (const run of Array.from(table.querySelectorAll("bdi")))
          expect(["145.720000 USD/BTC", "-75.5000 EUR"]).toContain(
            run.textContent,
          );
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
