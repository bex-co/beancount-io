import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectiveType, type JournalTransaction } from "@/common/types/journal";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { formatSourceDecimal } from "@/common/lib/format/format-number";
import { JournalTable, type JournalTableItem } from "../journal-table";
import fa from "../../locales/fa";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.unmock("@/i18n");

afterEach(cleanup);

async function renderTable(
  data: JournalTableItem[],
  language: "en" | "fa" = "fa",
  accountName?: string,
) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  render(
    <LocalizationProvider localization={localization}>
      <div dir={localization.i18n.dir()} lang={language}>
        <JournalTable
          data={data}
          showPostings={false}
          showMetadata={false}
          isAccountJournal={accountName !== undefined}
          accountName={accountName}
        />
      </div>
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

describe("journal financial amounts under RTL layout", () => {
  it("keeps account-journal Units, Change and Balance in their own named columns and isolated runs", async () => {
    const directive: JournalTransaction = {
      directive_type: DirectiveType.TRANSACTION,
      entry_hash: "rtl-account-transaction",
      date: "2026-10-15",
      flag: "*",
      payee: "رستوران",
      narration: "Synthetic multi-unit transfer",
      tags: [],
      links: [],
      postings: [
        {
          account: "Assets:Wallet:BTC",
          units: { number: "-0.00020000", currency: "BTC" },
        },
        {
          account: "Assets:Wallet:VEA",
          units: { number: "4", currency: "VEA" },
        },
        {
          account: "Expenses:Food",
          units: { number: "33.71", currency: "USD" },
        },
      ],
    };
    await renderTable(
      [
        {
          directive,
          change: { USD: "-33.7100", EUR: "12.3400" },
          balance: { USD: "-98.7654321", EUR: "0.00000000" },
        },
      ],
      "fa",
      "Assets:Wallet",
    );
    const table = screen.getByRole("table", {
      name: fa["journal.accountJournalTable"].message,
    });
    const row = within(table).getAllByRole("row")[1];
    const headers = within(table).getAllByRole("columnheader");
    const cellFor = (name: string) => {
      const header = within(table).getByRole("columnheader", {
        name,
        exact: true,
      });
      expect(header).toHaveAttribute("scope", "col");
      return within(row).getAllByRole("cell")[headers.indexOf(header)];
    };
    // Persian digits, as the period table above writes them (w2/137); the
    // subject here is their isolation.
    const persian = (number: string, currency: string) =>
      `${formatSourceDecimal(number, true, "fa")} ${currency}`;
    const units = cellFor(fa["journal.unitsHeader"].message);
    expectIsolatedAmount(units, persian("-0.00020000", "BTC"));
    expectIsolatedAmount(units, persian("4", "VEA"));
    expect(
      within(units).queryByText(persian("33.71", "USD")),
    ).not.toBeInTheDocument();
    const change = cellFor(fa["journal.change"].message);
    expectIsolatedAmount(change, persian("-33.7100", "USD"));
    expectIsolatedAmount(change, persian("12.3400", "EUR"));
    const balance = cellFor(fa["journal.balanceHeader"].message);
    expectIsolatedAmount(balance, persian("-98.7654321", "USD"));
    expectIsolatedAmount(balance, persian("0.00000000", "EUR"));
    expect(row).not.toHaveAttribute("dir", "ltr");
    const payee = within(row).getByText("رستوران", { exact: true });
    expect(payee.closest("bdi")).toBeNull();
    expect(payee.closest("[dir]")).toHaveAttribute("dir", "rtl");
    expect(within(row).getByText("2026-10-15")).toBeInTheDocument();
  });

  it.each(["en", "fa"] as const)(
    "%s preserves exact Balance, Price and custom budget amounts while isolating only financial text",
    async (language) => {
      await renderTable(
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
      for (const text of [
        "-0.0200 USD",
        "145.720000 USD/BTC",
        "-75.5000 EUR",
      ]) {
        expectIsolatedAmount(table, text);
      }
      expect(table.querySelectorAll("bdi")).toHaveLength(3);
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
});
