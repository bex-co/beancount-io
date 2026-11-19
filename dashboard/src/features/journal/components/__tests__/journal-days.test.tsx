import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DirectiveType,
  type JournalDirectiveType,
  type JournalTransaction,
} from "@/common/types/journal";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { JournalTable } from "../journal-table";
import {
  LedgerProviderContext,
  type LedgerProviderContextType,
} from "@/common/providers/ledger-provider/context";

const ledger = {
  ledgerData: { options: { renderCommas: true } },
} as unknown as LedgerProviderContextType;

/**
 * The Journal page's layout: entries under their day, each with the amount
 * that moved, opened by its own name. Real table, formatter and English.
 */
vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.unmock("@/i18n");
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const posting = (account: string, number: string) => ({
  account,
  units: { number, currency: "USD" },
  cost: null,
  price: null,
  flag: null,
  meta: {},
});

function transaction(
  id: string,
  date: string,
  payee: string,
  narration: string,
  postings: ReturnType<typeof posting>[],
  flag = "*",
): JournalTransaction {
  return {
    entry_hash: id,
    directive_type: DirectiveType.TRANSACTION,
    date,
    flag,
    payee,
    narration,
    postings,
    tags: [],
    links: [],
    meta: {},
  };
}

const dinner = transaction("dinner", "2017-09-08", "Cafe Modagor", "Dinner", [
  posting("Expenses:Food:Restaurant", "33.71"),
  posting("Liabilities:US:Chase:Slate", "-33.71"),
]);
const salary = transaction(
  "salary",
  "2017-09-07",
  "Hoogle",
  "Payroll",
  [
    posting("Assets:US:BofA:Checking", "3000.00"),
    posting("Income:US:Hoogle:Salary", "-4000.00"),
    posting("Expenses:Taxes:Federal", "1000.00"),
  ],
  "!",
);
const bonus = transaction("bonus", "2017-09-07", "Hoogle", "Bonus", [
  posting("Assets:US:BofA:Checking", "500.00"),
  posting("Income:US:Hoogle:Bonus", "-500.00"),
]);

async function renderDays(
  entries: JournalDirectiveType[],
  options: { showPostings?: boolean; onEntryClick?: () => void } = {},
) {
  const localization = createLocalization();
  await localization.changeLanguage("en");
  render(
    <LocalizationProvider localization={localization}>
      <LedgerProviderContext.Provider value={ledger}>
        <JournalTable
          layout="days"
          money={{
            primaryCurrency: "USD",
            incomeRoot: "Income",
            expensesRoot: "Expenses",
            accountFilter: "",
          }}
          data={entries.map((directive) => ({ directive }))}
          showMetadata={false}
          showPostings={options.showPostings ?? false}
          onEntryClick={options.onEntryClick ?? vi.fn()}
          ledgerOwner="owner"
          ledgerName="book"
        />
      </LedgerProviderContext.Provider>
    </LocalizationProvider>,
  );
}

describe("the Journal as a ledger of days", () => {
  it("names each day once, above that day's entries", async () => {
    await renderDays([dinner, salary, bonus]);

    const days = screen.getAllByRole("rowheader");
    expect(days.map((day) => day.textContent)).toEqual([
      "Fri, Sep 8, 2017",
      "Thu, Sep 7, 2017",
    ]);
    // Both September 7 entries sit in that day's row group.
    const september7 = days[1].closest("tbody")!;
    expect(
      within(september7).getAllByRole("button", { name: /^Open entry/ }),
    ).toHaveLength(2);
  });

  it("shows what moved: spending, income with its sign, and a payroll's earnings", async () => {
    await renderDays([dinner, salary, bonus]);

    const row = (entry: RegExp) =>
      screen
        .getByRole("button", {
          name: new RegExp(`^Open entry .*${entry.source}`),
        })
        .closest("tr")!;
    expect(row(/Cafe Modagor/)).toHaveTextContent("-33.71 USD");
    expect(row(/Bonus/)).toHaveTextContent("+500.00 USD");
    // A payroll is money in: what it earned, signed as income is.
    expect(row(/Payroll/)).toHaveTextContent("+4,000.00 USD");
    expect(row(/Payroll/)).not.toHaveTextContent("Multiple postings");
    // A pending entry says so; a cleared one carries no badge.
    expect(row(/Payroll/)).toHaveTextContent("Pending");
    expect(row(/Cafe Modagor/)).not.toHaveTextContent("Cleared");
  });

  it("opens an entry from its own name", async () => {
    const onEntryClick = vi.fn();
    await renderDays([dinner], { onEntryClick });

    await userEvent.click(
      screen.getByRole("button", {
        name: "Open entry 2017-09-08 Cafe Modagor Dinner (row 1)",
      }),
    );
    expect(onEntryClick).toHaveBeenCalledWith(dinner, expect.any(HTMLElement));
  });

  it("names a non-transaction entry by its type", async () => {
    const balance = {
      entry_hash: "balance",
      directive_type: DirectiveType.BALANCE,
      date: "2017-09-01",
      account: "Assets:US:BofA:Checking",
      amount: { number: "1200.00", currency: "USD" },
      meta: {},
    } as unknown as JournalDirectiveType;
    await renderDays([balance]);

    expect(screen.getByText("Balance")).toBeInTheDocument();
  });

  it("lists postings under the entry, account names breaking only between segments", async () => {
    await renderDays([dinner], { showPostings: true });

    const account = screen.getByText(
      (_, element) =>
        element?.tagName === "A" &&
        element.textContent === "Liabilities:US:Chase:Slate",
    );
    // A break opportunity after each colon, none inside a segment.
    expect(account.querySelectorAll("wbr")).toHaveLength(3);
    expect(account.closest("li")).toHaveTextContent("-33.71 USD");
  });
});
