import { describe, expect, it } from "vitest";
import { summarizeTransaction } from "@/common/lib/beancount/transaction-summary";
import { DirectiveType, type JournalTransaction } from "@/common/types/journal";
import { moneyFlow, shortAccountNames } from "../journal-money-flow";

describe("compact account pairs", () => {
  it("qualifies a shared tail with more than four segments", () => {
    const from = "Equity:CapTable:Unvested:Grant:Series:Award2026:Carol";
    const to = "Equity:CapTable:Vested:Grant:Series:Award2026:Carol";
    expect(shortAccountNames([from, to])).toEqual([
      "Unvested:Grant:Series:Award2026:Carol",
      "Vested:Grant:Series:Award2026:Carol",
    ]);
  });
});

function transaction(
  legs: [account: string, number: string, currency?: string][],
): JournalTransaction {
  return {
    entry_hash: "test",
    directive_type: DirectiveType.TRANSACTION,
    date: "2026-07-01",
    flag: "*",
    tags: [],
    links: [],
    postings: legs.map(([account, number, currency = "USD"]) => ({
      account,
      units: { number, currency },
    })),
  };
}

describe("moneyFlow", () => {
  it.each([
    {
      name: "a margin buy",
      legs: transaction([
        ["Assets:Margin", "10", "VEUR"],
        ["Assets:Margin", "-400.00", "EUR"],
        ["Equity:Opening", "-100.00", "EUR"],
      ]),
      accounts: ["Equity:Opening", "Assets:Margin"],
      directed: true,
      more: 0,
    },
    {
      name: "a commission buy",
      legs: transaction([
        ["Assets:Broker", "-1005.00"],
        ["Assets:Broker", "10", "VTI"],
        ["Expenses:Commissions", "5.00"],
      ]),
      accounts: ["Assets:Broker", "Expenses:Commissions"],
      directed: true,
      more: 0,
    },
    {
      name: "a single-account exchange",
      legs: transaction([
        ["Assets:Broker", "-1000.00"],
        ["Assets:Broker", "900.00", "EUR"],
      ]),
      accounts: ["Assets:Broker"],
      directed: false,
      more: 0,
    },
    {
      name: "a four-account opening entry",
      legs: transaction([
        ["Equity:Opening-Balances", "-100.00"],
        ["Assets:Bank:Checking", "50.00"],
        ["Assets:Bank:Savings", "25.00"],
        ["Assets:Cash", "25.00"],
      ]),
      accounts: ["Equity:Opening-Balances", "Assets:Bank:Checking"],
      directed: true,
      more: 2,
    },
  ])("names the accounts for $name", ({ legs, accounts, directed, more }) => {
    expect(moneyFlow(legs)).toEqual({ accounts, directed, more });
  });

  const salary = "Income:US:Hoogle:Salary";
  const cash = "Assets:US:Vanguard:Cash";
  const taxes = "Expenses:Taxes:Federal";
  const insurance = "Income:US:Hoogle:GroupTermLife";
  const payroll = transaction([
    ["Assets:US:BofA:Checking", "1350.60"],
    [cash, "1200.00"],
    [salary, "-4615.38"],
    [insurance, "-24.32"],
    [taxes, "1062.92"],
    ["Expenses:Insurance:Other", "1026.18"],
  ]);

  function filteredFlow(legs: JournalTransaction, accountFilter: string) {
    const { amounts } = summarizeTransaction({
      transaction: legs,
      accountFilter,
      preferredCurrency: "USD",
      incomeRoot: "Income",
      expensesRoot: "Expenses",
    });
    return moneyFlow(legs, { accountFilter, change: amounts[0]?.value });
  }

  it.each([
    { filter: cash, accounts: [salary, cash] },
    { filter: "Assets:US:Vanguard", accounts: [salary, cash] },
    { filter: "vanguard:cash", accounts: [salary, cash] },
    { filter: insurance, accounts: [insurance, "Assets:US:BofA:Checking"] },
    { filter: taxes, accounts: [salary, taxes] },
  ])(
    "names the payroll account selected by $filter",
    ({ filter, accounts }) => {
      expect(filteredFlow(payroll, filter)).toEqual({
        accounts,
        directed: true,
        more: 4,
      });
    },
  );

  it("keeps the pair for a move inside the selected account", () => {
    const shares = "Assets:US:Vanguard:RGAGX";
    const purchase = transaction([
      [cash, "-1200.00"],
      [shares, "50", "RGAGX"],
    ]);
    expect(filteredFlow(purchase, "Assets:US:Vanguard")).toEqual({
      accounts: [cash, shares],
      directed: true,
      more: 0,
    });
  });

  it("uses the displayed change when the scoped account sits on both sides", () => {
    const purchase = transaction([
      [cash, "50.00"],
      [cash, "-1200.00"],
      [taxes, "1150.00"],
    ]);
    expect(filteredFlow(purchase, cash)).toEqual({
      accounts: [cash, taxes],
      directed: true,
      more: 0,
    });
  });

  it("follows the register's account scope and displayed conversion", () => {
    const bank = "Assets:Bank";
    const child = "Assets:Bank:Savings";
    const transfer = transaction([
      [child, "-1200.00"],
      [bank, "50.00"],
      [cash, "1150.00"],
    ]);
    const scope = { accountFilter: bank, change: -1150 };
    expect(
      moneyFlow(transfer, {
        ...scope,
        register: { account: bank, withChildren: false },
        registerChange: { USD: "50.00" },
      }),
    ).toEqual({ accounts: [child, bank], directed: true, more: 1 });
    expect(
      moneyFlow(transfer, {
        ...scope,
        register: { account: bank, withChildren: true },
        registerChange: { USD: "-1150.00" },
      }),
    ).toEqual({ accounts: [child, cash], directed: true, more: 1 });
  });

  it("names the selected and outside accounts when their direction is unclear", () => {
    const entry = transaction([
      [insurance, "-15.00"],
      [insurance, "15.00"],
      [salary, "-100.00"],
      [cash, "100.00"],
    ]);
    expect(filteredFlow(entry, insurance)).toEqual({
      accounts: [insurance, salary],
      directed: false,
      more: 1,
    });
  });
});

describe("shortAccountNames", () => {
  it.each([
    {
      accounts: ["Assets:Bank1:Checking", "Assets:Bank2:Checking"],
      labels: ["Bank1:Checking", "Bank2:Checking"],
    },
    {
      accounts: ["Bank:Checking", "Assets:Country:Bank:Checking"],
      labels: ["Bank:Checking", "Country:Bank:Checking"],
    },
    {
      accounts: [
        "Assets:US:Bank:Cash",
        "Assets:EU:Bank:Cash",
        "Assets:Broker:Cash",
      ],
      labels: ["US:Bank:Cash", "EU:Bank:Cash", "Broker:Cash"],
    },
    {
      accounts: ["Liabilities:Bank:Slate", "Expenses:Food:Restaurant"],
      labels: ["Slate", "Restaurant"],
    },
  ])("names $accounts as $labels", ({ accounts, labels }) => {
    expect(shortAccountNames(accounts)).toEqual(labels);
  });
});
