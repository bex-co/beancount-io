import type { DirectiveJson, PostingJson } from "@rustledger/wasm";
import { accountHierarchy } from "../account-tree";
import { deriveReportAccounts } from "../beancount-options";
import { buildPriceMap } from "../price-map";
import { closeCurrentEarnings } from "../time-clamp";

type Transaction = Extract<DirectiveJson, { type: "transaction" }>;

function transaction(
  postings: PostingJson[],
  date = "2025-06-30",
): Transaction {
  return {
    type: "transaction",
    date,
    flag: "*",
    tags: [],
    links: [],
    postings,
  };
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

describe("closeCurrentEarnings", () => {
  it("reclassifies only accounts without mutating dates, lots, prices, flags or source data", () => {
    const income: PostingJson = {
      account: "Income:Bonus",
      units: { number: "-2.000", currency: "HOOL" },
      cost: {
        number: { kind: "per_unit", value: "84.60" },
        currency: "USD",
        date: "2025-06-30",
        label: "original lot",
      },
      price: { number: "100.25", currency: "USD" },
      flag: "!",
      meta: { note: "keep original posting" },
    };
    const expense: PostingJson = {
      account: "Expenses:Brokerage:Fees",
      units: { number: "4.950", currency: "USD" },
    };
    const asset: PostingJson = {
      account: "Assets:Cash",
      units: { number: "164.250", currency: "USD" },
    };
    const entry: Transaction = {
      ...transaction([income, expense, asset]),
      flag: "!",
      payee: "Synthetic bonus",
      narration: "Report-only closing",
      tags: ["bonus"],
      links: ["source-1"],
      meta: { reviewed: true },
    };
    const input: DirectiveJson[] = [
      {
        type: "open",
        date: "2025-01-01",
        account: "Income:Bonus",
        currencies: ["HOOL"],
      },
      {
        type: "price",
        date: "2025-06-30",
        currency: "HOOL",
        amount: { number: "100.25", currency: "USD" },
      },
      entry,
    ];
    const before = structuredClone(input);
    freeze(input);
    const closed = closeCurrentEarnings(input);
    expect(input).toEqual(before);
    expect(closed).toEqual([
      input[0],
      input[1],
      {
        ...entry,
        postings: [
          { ...income, account: "Equity:Earnings:Current" },
          { ...expense, account: "Equity:Earnings:Current" },
          asset,
        ],
      },
    ]);
    const prices = buildPriceMap(closed);
    expect(
      accountHierarchy(closed, "Equity:Earnings:Current", "at_cost", prices)
        .balance,
      // -2.000 HOOL {84.60 USD} is -169.20000 (3 + 2 places), plus 4.950 and
      // 164.250 of cash: Python's Decimal keeps the widest, 5 (w22/016).
    ).toEqual({ USD: "-164.25000" });
    expect(
      accountHierarchy(closed, "Equity:Earnings:Current", "units", prices)
        .balance,
    ).toEqual({ HOOL: "-2.000", USD: "4.950" });
    expect(
      accountHierarchy(closed, "Income", "at_cost", prices).balance_children,
    ).toEqual({});
    expect(
      accountHierarchy(closed, "Expenses", "at_cost", prices).balance_children,
    ).toEqual({});
  });

  it("matches exact income and expense roots and descendants, leaving lookalike roots intact", () => {
    const accounts = [
      "Income",
      "Income:Salary",
      "Expenses",
      "Expenses:Food",
      "IncomeTax:Withholding",
      "Income2:Other",
      "ExpensesOther:Food",
      "Assets:Income",
      "Equity:Earnings:Previous",
    ];
    const input = [
      transaction(
        accounts.map((account) => ({
          account,
          units: { number: "1.00", currency: "USD" },
        })),
      ),
    ];
    const result = closeCurrentEarnings(input)[0] as Transaction;
    expect(result.postings.map((posting) => posting.account)).toEqual([
      "Equity:Earnings:Current",
      "Equity:Earnings:Current",
      "Equity:Earnings:Current",
      "Equity:Earnings:Current",
      "IncomeTax:Withholding",
      "Income2:Other",
      "ExpensesOther:Food",
      "Assets:Income",
      "Equity:Earnings:Previous",
    ]);
    expect(input[0].postings.map((posting) => posting.account)).toEqual(
      accounts,
    );
  });

  it("uses configured roots and the custom equity/current-earnings target", () => {
    const { clamp } = deriveReportAccounts({
      source: `option "name_income" "Revenue"
option "name_expenses" "Costs"
option "name_equity" "Capital"
option "account_current_earnings" "Annual:Result"
`,
      operatingCurrencies: ["USD"],
    });
    const input = [
      transaction([
        {
          account: "Revenue:Sales",
          units: { number: "-100.00", currency: "USD" },
        },
        {
          account: "Costs:Supplies",
          units: { number: "70.00", currency: "USD" },
        },
        { account: "Assets:Cash", units: { number: "30.00", currency: "USD" } },
        {
          account: "Income:Unrelated",
          units: { number: "2.00", currency: "USD" },
        },
        {
          account: "Expenses:Unrelated",
          units: { number: "-2.00", currency: "USD" },
        },
      ]),
    ];
    const closed = closeCurrentEarnings(input, clamp);
    expect(
      (closed[0] as Transaction).postings.map((posting) => posting.account),
    ).toEqual([
      "Capital:Annual:Result",
      "Capital:Annual:Result",
      "Assets:Cash",
      "Income:Unrelated",
      "Expenses:Unrelated",
    ]);
    expect(
      accountHierarchy(closed, "Capital", "at_cost", buildPriceMap(closed))
        .balance_children,
    ).toEqual({ USD: "-30.00" });
  });

  it.each([
    {
      name: "profit",
      income: "-100.00",
      expenses: "70.00",
      cash: "30.00",
      expected: { USD: "-30.00" },
    },
    {
      name: "loss",
      income: "-70.00",
      expenses: "100.00",
      cash: "-30.00",
      expected: { USD: "30.00" },
    },
    {
      name: "zero profit",
      income: "-100.00",
      expenses: "100.00",
      cash: "0.00",
      expected: {},
    },
  ])(
    "carries $name into the actual equity inventory",
    ({ income, expenses, cash, expected }) => {
      const input = [
        transaction([
          {
            account: "Income:Sales",
            units: { number: income, currency: "USD" },
          },
          {
            account: "Expenses:Supplies",
            units: { number: expenses, currency: "USD" },
          },
          { account: "Assets:Cash", units: { number: cash, currency: "USD" } },
        ]),
      ];
      const closed = closeCurrentEarnings(input);
      expect(
        accountHierarchy(closed, "Equity", "at_cost", buildPriceMap(closed))
          .balance_children,
      ).toEqual(expected);
      expect(closed).toHaveLength(input.length);
    },
  );

  it("retains authored closing and previous earnings without double counting", () => {
    const input = [
      transaction(
        [
          {
            account: "Equity:Earnings:Previous",
            units: { number: "-50.00", currency: "USD" },
          },
          {
            account: "Assets:Cash",
            units: { number: "50.00", currency: "USD" },
          },
        ],
        "2025-01-01",
      ),
      transaction([
        {
          account: "Income:Sales",
          units: { number: "-100.00", currency: "USD" },
        },
        {
          account: "Expenses:Supplies",
          units: { number: "70.00", currency: "USD" },
        },
        { account: "Assets:Cash", units: { number: "30.00", currency: "USD" } },
      ]),
      {
        ...transaction(
          [
            {
              account: "Income:Sales",
              units: { number: "100.00", currency: "USD" },
            },
            {
              account: "Expenses:Supplies",
              units: { number: "-70.00", currency: "USD" },
            },
            {
              account: "Equity:Earnings:Current",
              units: { number: "-30.00", currency: "USD" },
            },
          ],
          "2025-12-31",
        ),
        flag: "C",
        narration: "Authored close",
      },
    ];
    const closed = closeCurrentEarnings(input);
    const prices = buildPriceMap(closed);
    expect(
      accountHierarchy(closed, "Equity:Earnings:Current", "at_cost", prices)
        .balance,
    ).toEqual({ USD: "-30.00" });
    expect(
      accountHierarchy(closed, "Equity:Earnings:Previous", "at_cost", prices)
        .balance,
    ).toEqual({ USD: "-50.00" });
    expect(
      accountHierarchy(closed, "Equity", "at_cost", prices).balance_children,
    ).toEqual({ USD: "-80.00" });
    expect(closeCurrentEarnings(closed)).toEqual(closed);
    expect(closed).toHaveLength(3);
    expect(input[1].postings[0].account).toBe("Income:Sales");
  });

  it("keeps an empty directive stream empty", () => {
    expect(closeCurrentEarnings([])).toEqual([]);
  });
});
