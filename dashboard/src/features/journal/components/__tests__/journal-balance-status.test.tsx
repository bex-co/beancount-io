import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DirectiveType, type JournalBalance } from "@/common/types/journal";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { renderLedgerNavigation } from "@/test/render-ledger-navigation";
import { JournalTable } from "../journal-table";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.unmock("@/i18n");

function assertion(
  day: string,
  account: string,
  number: string,
  difference?: string,
): JournalBalance {
  return {
    directive_type: DirectiveType.BALANCE,
    entry_hash: day,
    date: `2026-09-${day}`,
    account,
    amount: { number, currency: "USD" },
    diff_amount:
      difference === undefined ? null : { number: difference, currency: "USD" },
  };
}

const wallet = "Assets:Bank:Wallet";
const entries = [
  assertion("03", wallet, "90.00", "10.00"),
  assertion("05", "Assets:Bank", "125.00"),
  assertion("06", "Assets:Bank", "120.00"),
  assertion("07", wallet, "100.00"),
  assertion("08", "Assets:Parent", "50.00"),
  assertion("09", "Assets:Late", "0.00"),
];
const openedAccounts = new Map([
  [wallet, "2026-09-01"],
  ["Assets:Parent", "2026-09-08"],
  ["Assets:Late", "2026-09-10"],
]);

const unchecked = "Not checked because the account had not been opened";
const rowForDay = (day: string) => {
  const opener = screen.getByRole("button", {
    name: new RegExp(`^Open entry 2026-09-${day} Balance`),
  });
  return { opener, row: opener.closest("tr")! };
};

async function renderStatus(
  layout: "lines" | "days",
  accountOpens?: ReadonlyMap<string, string>,
) {
  const localization = createLocalization();
  await localization.changeLanguage("en");
  await renderLedgerNavigation(
    <LocalizationProvider localization={localization}>
      <JournalTable
        layout={layout}
        data={entries.map((directive) => ({ directive }))}
        money={{
          primaryCurrency: "USD",
          incomeRoot: "Income",
          expensesRoot: "Expenses",
          accountFilter: "",
        }}
        openedAccounts={accountOpens}
        ledgerOwner="alice"
        ledgerName="books"
        onEntryClick={vi.fn()}
      />
    </LocalizationProvider>,
    "journal",
  );
}

describe.each(["lines", "days"] as const)(
  "Journal balance checks in %s",
  (layout) => {
    it("marks only assertions backed by a matching open directive as Matches", async () => {
      await renderStatus(layout, openedAccounts);
      for (const day of ["05", "06", "09"]) {
        const { opener, row } = rowForDay(day);
        expect(opener).toHaveAccessibleName(expect.stringContaining(unchecked));
        expect(row).not.toHaveTextContent("Matches");
        expect(row.className).not.toMatch(/bg-emerald|bg-rose|bg-amber/);
        const warnings = within(row).getAllByRole("link", { name: unchecked });
        for (const warning of warnings) {
          expect(warning).toHaveAttribute("href", "/ledger/alice/books/errors");
        }
      }
      for (const day of ["07", "08"]) {
        expect(rowForDay(day).row).toHaveTextContent("Matches");
        expect(rowForDay(day).row.className).toContain("bg-emerald");
      }
      expect(rowForDay("03").row).toHaveTextContent("10.00 USD too much");
      expect(rowForDay("03").row.className).toContain("bg-rose");
    });

    it("makes no claim for diff-free assertions before the directory is known", async () => {
      await renderStatus(layout);
      for (const day of ["05", "07", "08"]) {
        const { opener, row } = rowForDay(day);
        expect(opener).not.toHaveAccessibleName(
          expect.stringContaining(unchecked),
        );
        expect(row).not.toHaveTextContent(/Matches|Not checked/);
        expect(row.className).not.toMatch(/bg-emerald|bg-rose|bg-amber/);
      }
      expect(rowForDay("03").row).toHaveTextContent("10.00 USD too much");
    });
  },
);
