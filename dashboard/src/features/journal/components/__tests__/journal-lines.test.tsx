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
import {
  LedgerProviderContext,
  type LedgerProviderContextType,
} from "@/common/providers/ledger-provider/context";
import { JournalTable } from "../journal-table";
import { JournalFilters } from "../journal-filters";

/**
 * The Journal for reconciling: one line per entry with its date and status,
 * and balance assertions in the flow as checkpoints. Real table, formatter
 * and English.
 */
vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.unmock("@/i18n");
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const ledger = {
  ledgerData: { options: { renderCommas: true } },
} as unknown as LedgerProviderContextType;

const posting = (account: string, number: string) => ({
  account,
  units: { number, currency: "USD" },
  cost: null,
  price: null,
  flag: null,
  meta: {},
});

const dinner: JournalTransaction = {
  entry_hash: "dinner",
  directive_type: DirectiveType.TRANSACTION,
  date: "2025-10-11",
  flag: "!",
  payee: "Uncle Boons",
  narration: "Eating out",
  postings: [
    posting("Expenses:Food:Restaurant", "45.19"),
    posting("Liabilities:US:Chase:Slate", "-45.19"),
  ],
  tags: [],
  links: [],
  meta: {},
};

const balance = (
  hash: string,
  diff: { number: string; currency: string } | null,
) =>
  ({
    entry_hash: hash,
    directive_type: DirectiveType.BALANCE,
    date: "2025-10-08",
    account: "Assets:US:BofA:Checking",
    amount: { number: "2962.67", currency: "USD" },
    diff_amount: diff,
    meta: {},
  }) as unknown as JournalDirectiveType;

async function renderLines(
  entries: JournalDirectiveType[],
  accountFilter = "",
) {
  const localization = createLocalization();
  await localization.changeLanguage("en");
  render(
    <LocalizationProvider localization={localization}>
      <LedgerProviderContext.Provider value={ledger}>
        <JournalTable
          layout="lines"
          money={{
            primaryCurrency: "USD",
            incomeRoot: "Income",
            expensesRoot: "Expenses",
            accountFilter,
          }}
          data={entries.map((directive) => ({ directive }))}
          showMetadata={false}
          showPostings={false}
          onEntryClick={vi.fn()}
          ledgerOwner="owner"
          ledgerName="book"
        />
      </LedgerProviderContext.Provider>
    </LocalizationProvider>,
  );
}

describe("the Journal's compact lines", () => {
  it("gives every line its date and status in columns of their own", async () => {
    await renderLines([dinner]);

    expect(
      screen.getAllByRole("columnheader").map((cell) => cell.textContent),
    ).toEqual([
      "Date",
      "Flag",
      "Entry",
      "Account",
      // The amount and the entry's postings share the last column; a phone
      // leaves the ledger's currency off each figure, so the heading names it.
      "Amount · USDPostings",
    ]);
    const line = screen
      .getByRole("button", { name: /^Open entry .*Uncle Boons/ })
      .closest("tr")!;
    const cells = within(line).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("2025-10-11");
    // The flag, named for what it means.
    expect(cells[1]).toHaveTextContent("!");
    expect(cells[1]).toHaveTextContent("Pending");
    expect(line).toHaveTextContent("-45.19 USD");
  });

  it("marks a balance assertion that matches, and one that is off by how much", async () => {
    await renderLines([
      balance("ok", null),
      balance("off", { number: "12.00", currency: "USD" }),
    ]);

    const [matching, off] = screen
      .getAllByText("Assets:US:BofA:Checking")
      .map((element) => element.closest("tr")!);
    expect(matching).toHaveTextContent("Matches");
    expect(matching).toHaveTextContent("2,962.67 USD");
    expect(off).toHaveTextContent("Off by 12.00 USD");
  });
});

describe("the Journal filtered to one account", () => {
  it("signs each line as that account's change, as a statement does", async () => {
    const pay: JournalTransaction = {
      ...dinner,
      entry_hash: "pay",
      flag: "*",
      payee: "Hooli",
      narration: "Payroll",
      postings: [
        posting("Assets:US:BofA:Checking", "2550.60"),
        posting("Income:US:Hooli:Salary", "-2550.60"),
      ],
    };
    const fee: JournalTransaction = {
      ...dinner,
      entry_hash: "fee",
      flag: "*",
      payee: "BANK FEES",
      narration: "Monthly bank fee",
      postings: [
        posting("Expenses:Financial:Fees", "4.00"),
        posting("Assets:US:BofA:Checking", "-4.00"),
      ],
    };
    await renderLines([pay, fee], "Assets:US:BofA:Checking");

    const row = (name: RegExp) =>
      screen
        .getByRole("button", {
          name: new RegExp(`^Open entry .*${name.source}`),
        })
        .closest("tr")!;
    expect(row(/Hooli/)).toHaveTextContent("+2,550.60 USD");
    expect(row(/BANK FEES/)).toHaveTextContent("-4.00 USD");
  });
});

describe("the Journal's layout choice", () => {
  it("switches between compact lines and the day layout", async () => {
    const onDensityChange = vi.fn();
    const localization = createLocalization();
    await localization.changeLanguage("en");
    render(
      <LocalizationProvider localization={localization}>
        <JournalFilters
          selectedDirectiveTypes={[DirectiveType.TRANSACTION]}
          onDirectiveTypesChange={vi.fn()}
          selectedTransactionSubtypes={[]}
          onTransactionSubtypesChange={vi.fn()}
          selectedDocumentSubtypes={[]}
          onDocumentSubtypesChange={vi.fn()}
          selectedCustomSubtypes={[]}
          onCustomSubtypesChange={vi.fn()}
          showMetadata={false}
          onShowMetadataChange={vi.fn()}
          showPostings={false}
          onShowPostingsChange={vi.fn()}
          density="compact"
          onDensityChange={onDensityChange}
        />
      </LocalizationProvider>,
    );

    const layout = screen.getByRole("group", { name: "Layout" });
    expect(
      within(layout).getByRole("button", { name: "Compact" }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(
      within(layout).getByRole("button", { name: "Comfortable" }),
    );
    expect(onDensityChange).toHaveBeenCalledWith("comfortable");
  });
});
