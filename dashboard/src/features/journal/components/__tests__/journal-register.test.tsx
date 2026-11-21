import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DirectiveType,
  type JournalBalance,
  type JournalTransaction,
} from "@/common/types/journal";
import {
  LedgerProviderContext,
  type LedgerProviderContextType,
} from "@/common/providers/ledger-provider/context";
import { formatSourceDecimal } from "@/common/lib/format/format-number";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { JournalTable, type JournalTableItem } from "../journal-table";

/**
 * An account's journal is the Journal's own list — the compact lines or the
 * days, as the reader chose — with what each entry did to the account and
 * where the account then stood. Its figures are the ledger's, in the reader's
 * language, every source digit kept (w2/119, w2/137).
 */
vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.unmock("@/i18n");
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

afterEach(cleanup);

const LAYOUTS = ["lines", "days"] as const;
type Layout = (typeof LAYOUTS)[number];
type Language = "en" | "de" | "fa";

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

const rent: JournalTransaction = {
  ...paycheck,
  entry_hash: "synthetic-rent",
  date: "2026-11-02",
  payee: "Synthetic Landlord",
  narration: "Rent",
  postings: [
    { account, units: { number: "-1200.00", currency: "USD" } },
    {
      account: "Expenses:Home:Rent",
      units: { number: "1200.00", currency: "USD" },
    },
  ],
};

async function renderRegister(
  layout: Layout,
  data: JournalTableItem[],
  {
    language = "en",
    renderCommas = true,
    registerAccount = account,
    onEntryClick = vi.fn(),
  }: {
    language?: Language;
    renderCommas?: boolean;
    registerAccount?: string | null;
    onEntryClick?: Parameters<typeof JournalTable>[0]["onEntryClick"];
  } = {},
) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const ledger = {
    ledgerData: { options: { renderCommas } },
  } as unknown as LedgerProviderContextType;
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
              accountFilter: registerAccount ?? "",
            }}
            register={
              registerAccount === null
                ? undefined
                : { account: registerAccount, withChildren: true }
            }
            data={data}
            showMetadata={false}
            showPostings={false}
            ledgerOwner="alice"
            ledgerName="books"
            onEntryClick={onEntryClick}
          />
        </div>
      </LedgerProviderContext.Provider>
    </LocalizationProvider>,
  );
  return {
    table: screen.getByRole("table"),
    t: (key: string) => localization.i18n.t(key),
  };
}

/** The entry row whose open control names `payee`, in any language. */
function rowOf(payee: string) {
  const opener = screen.getAllByRole("button").filter(
    (button) =>
      // The postings toggle names the entry too; it discloses.
      !button.hasAttribute("aria-expanded") &&
      (button.getAttribute("aria-label") ?? "").includes(payee),
  );
  expect(opener).toHaveLength(1);
  return opener[0].closest("tr")!;
}

/**
 * The amounts a row writes, each one isolated run of sign, figure and unit
 * (the day layout draws a phone's copy beside the wide one; CSS shows one).
 */
function amountsIn(container: HTMLElement) {
  const runs = Array.from(container.querySelectorAll("bdi"));
  for (const run of runs) expect(run).toHaveAttribute("dir", "ltr");
  return [...new Set(runs.map((run) => run.textContent))];
}

/** The figures written after a row's "Balance" label. */
function balanceIn(row: HTMLElement, label: string) {
  const named = within(row).getAllByText(label, { exact: false });
  return [...new Set(named.flatMap((name) => amountsIn(name.parentElement!)))];
}

describe.each(LAYOUTS)("an account's journal (%s)", (layout) => {
  it.each([
    ["en", "+2,550.60 USD", "2,754.06 USD"],
    ["de", "+2.550,60 USD", "2.754,06 USD"],
    ["fa", "+۲٬۵۵۰٫۶۰ USD", "۲٬۷۵۴٫۰۶ USD"],
  ] as const)(
    "writes each entry's change and the running balance in %s",
    async (language, change, balance) => {
      const { table, t } = await renderRegister(
        layout,
        [
          {
            directive: paycheck,
            change: { USD: "2550.60" },
            balance: { USD: "2754.06" },
          },
        ],
        { language },
      );

      expect(table).toHaveAccessibleName(t("journal.accountJournalTable"));
      const row = rowOf("Synthetic Employer");
      // The change and the balance; the account holds the entry in the unit
      // its change is in, so no separate Units.
      expect(amountsIn(row).sort()).toEqual([balance, change].sort());
      expect(balanceIn(row, t("journal.balanceHeader"))).toEqual([balance]);
      expect(row).not.toHaveTextContent(t("journal.unitsHeader"));
    },
  );

  it("signs money in with + in the money-in colour, and money out with −", async () => {
    await renderRegister(layout, [
      {
        directive: rent,
        change: { USD: "-1200.00" },
        balance: { USD: "1554.06" },
      },
      {
        directive: paycheck,
        change: { USD: "2550.60" },
        balance: { USD: "2754.06" },
      },
    ]);

    const moneyIn = amountsIn(rowOf("Synthetic Employer"));
    expect(moneyIn).toContain("+2,550.60 USD");
    const moneyOut = amountsIn(rowOf("Synthetic Landlord"));
    expect(moneyOut).toContain("-1,200.00 USD");
    expect(moneyOut).not.toContain("+1,200.00 USD");

    for (const run of screen.getAllByText(
      (_, element) =>
        element?.tagName === "BDI" && element.textContent === "+2,550.60 USD",
    ))
      expect(run.parentElement).toHaveClass("text-chart-2");
    for (const run of screen.getAllByText(
      (_, element) =>
        element?.tagName === "BDI" && element.textContent === "-1,200.00 USD",
    ))
      expect(run.parentElement).not.toHaveClass("text-chart-2");
    // A balance is where the account stands, not money in: never signed.
    expect(amountsIn(rowOf("Synthetic Employer"))).toContain("2,754.06 USD");
  });

  it("keeps the ledger's own decimal when render_commas is off", async () => {
    await renderRegister(
      layout,
      [
        {
          directive: paycheck,
          change: { USD: "2550.60" },
          balance: { USD: "2754.06" },
        },
      ],
      { language: "de", renderCommas: false },
    );

    expect(amountsIn(rowOf("Synthetic Employer")).sort()).toEqual(
      ["+2550.60 USD", "2754.06 USD"].sort(),
    );
  });

  it("keeps every source digit of a balance past 2^53", async () => {
    const { t } = await renderRegister(
      layout,
      [
        {
          directive: paycheck,
          change: { USD: "2550.60" },
          balance: { USD: "9007199254740993.00" },
        },
      ],
      { language: "de" },
    );

    expect(
      balanceIn(rowOf("Synthetic Employer"), t("journal.balanceHeader")),
    ).toEqual(["9.007.199.254.740.993,00 USD"]);
  });

  it("names the units the account holds where they differ from the change", async () => {
    // Bought at cost: the change is in dollars, the account holds shares.
    const purchase: JournalTransaction = {
      ...paycheck,
      entry_hash: "synthetic-purchase",
      payee: "Synthetic Broker",
      narration: "Buy shares",
      postings: [
        {
          account: "Assets:Brokerage:VHT",
          units: { number: "10", currency: "VHT" },
          cost: {
            number: "166.543",
            currency: "USD",
            date: "2026-11-01",
            label: null,
          },
        },
        {
          account: "Assets:Brokerage:Cash",
          units: { number: "-1665.43", currency: "USD" },
        },
      ],
    };
    const { t } = await renderRegister(
      layout,
      [
        {
          directive: purchase,
          change: { USD: "1665.43" },
          balance: { USD: "1665.43" },
        },
      ],
      { registerAccount: "Assets:Brokerage:VHT" },
    );

    const row = rowOf("Synthetic Broker");
    expect(amountsIn(row)).toEqual(
      expect.arrayContaining(["+1,665.43 USD", "10 VHT"]),
    );
    const units = within(row).getAllByText(t("journal.unitsHeader"), {
      exact: false,
    });
    expect(units.length).toBeGreaterThan(0);
    for (const label of units) {
      expect(label).toHaveClass("sr-only");
      expect(amountsIn(label.parentElement!)).toEqual(["10 VHT"]);
    }
  });

  it("isolates every figure under a right-to-left page, and only the figures", async () => {
    const transfer: JournalTransaction = {
      ...paycheck,
      entry_hash: "rtl-account-transaction",
      payee: "رستوران",
      narration: "Synthetic multi-unit transfer",
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
    await renderRegister(
      layout,
      [
        {
          directive: transfer,
          change: { USD: "-33.7100", EUR: "12.3400" },
          balance: { USD: "-98.7654321", EUR: "0.00000000" },
        },
      ],
      { language: "fa", registerAccount: "Assets:Wallet" },
    );

    const row = rowOf("رستوران");
    // Persian digits, as the period table above writes them (w2/137).
    const persian = (number: string, currency: string) =>
      `${formatSourceDecimal(number, true, "fa")} ${currency}`;
    expect(amountsIn(row).sort()).toEqual(
      [
        // The change, signed; the units the wallet holds; the balance.
        persian("-33.7100", "USD"),
        `+${persian("12.3400", "EUR")}`,
        persian("-0.00020000", "BTC"),
        persian("4", "VEA"),
        persian("-98.7654321", "USD"),
        persian("0.00000000", "EUR"),
      ].sort(),
    );
    // The payee takes its own direction (w2/138), never a left-to-right run.
    const payee = within(row).getByText("رستوران", { selector: "button" });
    expect(payee.closest("bdi")).toBeNull();
    expect(payee.closest("[dir=rtl]")).not.toBeNull();
  });

  it("gives a balance assertion its asserted amount and no running balance", async () => {
    const assertion: JournalBalance = {
      directive_type: DirectiveType.BALANCE,
      entry_hash: "synthetic-balance-assertion",
      date: "2026-11-03",
      account,
      amount: { number: "2754.06", currency: "USD" },
      tolerance: null,
      diff_amount: null,
    };
    await renderRegister(layout, [
      { directive: assertion, change: {}, balance: { USD: "2754.06" } },
    ]);

    const row = screen
      .getByRole("button", { name: /^Open entry 2026-11-03 Balance/ })
      .closest("tr")!;
    // The statement's figure, once; a running balance only moves with a
    // transaction.
    expect(amountsIn(row)).toEqual(["2,754.06 USD"]);
  });

  it("opens an entry from its name and its postings from their toggle", async () => {
    const onEntryClick = vi.fn();
    await renderRegister(
      layout,
      [
        {
          directive: paycheck,
          change: { USD: "2550.60" },
          balance: { USD: "2754.06" },
        },
      ],
      { onEntryClick },
    );
    const user = userEvent.setup();
    const row = rowOf("Synthetic Employer");

    await user.click(
      within(row).getByRole("button", {
        name: "Open entry 2026-11-01 Synthetic Employer Payroll (row 1)",
      }),
    );
    expect(onEntryClick).toHaveBeenCalledExactlyOnceWith(
      paycheck,
      expect.any(HTMLElement),
    );

    const toggle = within(row).getByRole("button", { expanded: false });
    await user.click(toggle);
    const postings = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    )!;
    expect(within(postings).getAllByRole("listitem")).toHaveLength(2);
    expect(onEntryClick).toHaveBeenCalledTimes(1);
  });

  it("keeps the Journal's own rows free of an account's change and balance", async () => {
    const { table, t } = await renderRegister(
      layout,
      [
        {
          directive: paycheck,
          change: { USD: "2550.60" },
          balance: { USD: "6377.23" },
        },
      ],
      { registerAccount: null },
    );

    expect(table).toHaveAccessibleName(t("journal.journalTable"));
    expect(table).not.toHaveTextContent(t("journal.balanceHeader"));
    expect(table).not.toHaveTextContent("6,377.23");
  });
});

describe("an account's compact lines", () => {
  it("names the balance beside the amount in the heading", async () => {
    await renderRegister("lines", [
      {
        directive: paycheck,
        change: { USD: "2550.60" },
        balance: { USD: "2754.06" },
      },
    ]);

    // The amount, the account's balance and the entry's postings share the
    // last column, in that order; a phone names the currency instead.
    expect(
      screen.getAllByRole("columnheader").map((cell) => cell.textContent),
    ).toEqual([
      "Date",
      "Flag",
      "Entry",
      "Account",
      "Amount · USDBalancePostings",
    ]);
  });

  it("leaves the heading's currency off each figure on a phone, still read out", async () => {
    await renderRegister("lines", [
      {
        directive: paycheck,
        change: { USD: "2550.60", VACHR: "8" },
        balance: { USD: "2754.06" },
      },
    ]);

    const row = rowOf("Synthetic Employer");
    const currency = (code: string) =>
      Array.from(row.querySelectorAll("bdi > span")).filter(
        (unit) => unit.textContent?.trim() === code,
      );
    // The ledger's own currency: named once, in the heading.
    expect(currency("USD")).toHaveLength(2);
    for (const unit of currency("USD"))
      expect(unit).toHaveClass("max-sm:sr-only");
    // Any other unit stays, under its figure.
    expect(currency("VACHR")).toHaveLength(1);
    expect(currency("VACHR")[0]).toHaveClass("max-sm:block");
  });
});
