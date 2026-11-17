import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectiveType, type JournalTransaction } from "@/common/types/journal";
import { LedgerProviderContext } from "@/common/providers/ledger-provider/context";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { JournalTable } from "../journal-table";

/**
 * The account page's period table writes `4.844,07 USD` in German while its
 * journal printed Units, Change and Balance as the raw `2550.60 USD`, which a
 * German reader takes for 255,060 (w2/137). Both now go through
 * `<LedgerAmount>`.
 */
vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.unmock("@/i18n");

afterEach(cleanup);

const account = "Assets:US:BofA:Checking";

const paycheck: JournalTransaction = {
  directive_type: DirectiveType.TRANSACTION,
  entry_hash: "synthetic-paycheck",
  date: "2026-11-01",
  flag: "*",
  payee: "Synthetic Employer",
  narration: "Payroll",
  tags: [],
  links: [],
  postings: [
    { account, units: { number: "2550.60", currency: "USD" } },
    {
      account: "Income:US:Synthetic:Salary",
      units: { number: "-2550.60", currency: "USD" },
    },
  ],
};

async function columns(
  language: "en" | "de" | "fa",
  { renderCommas = true, balance = "2754.06" } = {},
) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const ledger = {
    ledgerData: { options: { renderCommas } },
  } as unknown as React.ContextType<typeof LedgerProviderContext>;
  render(
    <LocalizationProvider localization={localization}>
      <LedgerProviderContext.Provider value={ledger}>
        <JournalTable
          data={[
            {
              directive: paycheck,
              change: { USD: "2550.60" },
              balance: { USD: balance },
            },
          ]}
          isAccountJournal
          accountName={account}
          showMetadata={false}
          showPostings={false}
        />
      </LedgerProviderContext.Provider>
    </LocalizationProvider>,
  );
  const table = screen.getByRole("table");
  const headers = within(table).getAllByRole("columnheader");
  const row = within(table).getAllByRole("row")[1];
  const cells = within(row).getAllByRole("cell");
  const amountIn = (key: string) => {
    const header = within(table).getByRole("columnheader", {
      name: localization.i18n.t(key),
      exact: true,
    });
    const amount = cells[headers.indexOf(header)].querySelector("bdi");
    expect(amount).toHaveAttribute("dir", "ltr");
    return amount?.textContent;
  };
  return {
    units: amountIn("journal.unitsHeader"),
    change: amountIn("journal.change"),
    balance: amountIn("journal.balanceHeader"),
  };
}

describe("account journal amounts in the reader's language", () => {
  it.each([
    ["en", "2,550.60 USD", "2,754.06 USD"],
    ["de", "2.550,60 USD", "2.754,06 USD"],
    ["fa", "۲٬۵۵۰٫۶۰ USD", "۲٬۷۵۴٫۰۶ USD"],
  ] as const)(
    "writes Units, Change and Balance in %s as the period table does",
    async (language, movement, balance) => {
      expect(await columns(language)).toEqual({
        units: movement,
        change: movement,
        balance,
      });
    },
  );

  it("keeps the ledger's own decimal when render_commas is off", async () => {
    expect(await columns("de", { renderCommas: false })).toEqual({
      units: "2550.60 USD",
      change: "2550.60 USD",
      balance: "2754.06 USD",
    });
  });

  it("keeps every source digit of a balance past 2^53", async () => {
    const { balance } = await columns("de", {
      balance: "9007199254740993.00",
    });
    expect(balance).toBe("9.007.199.254.740.993,00 USD");
  });
});
