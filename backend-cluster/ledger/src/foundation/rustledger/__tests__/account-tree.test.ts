import type { DirectiveJson } from "@rustledger/wasm";
import {
  accountHierarchy,
  accountLastEntryDates,
  accountOwnUnitBalances,
  hasCostPostings,
  ledgerCurrencies,
} from "../account-tree";
import { buildPriceMap } from "../price-map";

/** No prices — the units-mode trees below never convert. */
const NO_PRICES = buildPriceMap([]);

function txn(postings: [string, string][]): DirectiveJson {
  return {
    type: "transaction",
    date: "2024-01-15",
    flag: "*",
    narration: "t",
    tags: [],
    links: [],
    postings: postings.map(([account, number]) => ({
      account,
      units: { number, currency: "USD" },
    })),
  };
}

const DIRECTIVES: DirectiveJson[] = [
  {
    type: "open",
    date: "2024-01-01",
    account: "Assets:Bank:Checking",
    currencies: ["USD"],
  },
  {
    type: "open",
    date: "2024-01-01",
    account: "Assets:Bank:Savings",
    currencies: ["USD"],
  },
  {
    type: "open",
    date: "2024-01-01",
    account: "Expenses:Food",
    currencies: ["USD"],
  },
  txn([
    ["Assets:Bank:Checking", "-30.00"],
    ["Expenses:Food", "30.00"],
  ]),
  txn([
    ["Assets:Bank:Savings", "100.00"],
    ["Assets:Bank:Checking", "-100.00"],
  ]),
];

describe("accountHierarchy (units)", () => {
  const assets = accountHierarchy(DIRECTIVES, "Assets", "units", NO_PRICES);

  it("roots at the requested account", () => {
    expect(assets.account).toBe("Assets");
  });

  it("rolls child balances up into balance_children while keeping own balance separate", () => {
    // Assets own postings: none directly on 'Assets' → balance empty.
    expect(assets.balance).toEqual({});
    // Assets:Bank:Checking own = -30 + -100 = -130; Savings = +100 → subtree total = -30.
    expect(assets.balance_children).toEqual({ USD: "-30" });

    const bank = assets.children.find((c) => c.account === "Assets:Bank");
    expect(bank?.balance).toEqual({}); // no direct postings on Assets:Bank
    expect(bank?.balance_children).toEqual({ USD: "-30" });

    const checking = bank?.children.find(
      (c) => c.account === "Assets:Bank:Checking",
    );
    expect(checking?.balance).toEqual({ USD: "-130" });
    expect(checking?.has_txns).toBe(true);

    const savings = bank?.children.find(
      (c) => c.account === "Assets:Bank:Savings",
    );
    expect(savings?.balance).toEqual({ USD: "100" });
  });

  it("sorts children by account name", () => {
    const bank = assets.children.find((c) => c.account === "Assets:Bank");
    expect(bank?.children.map((c) => c.account)).toEqual([
      "Assets:Bank:Checking",
      "Assets:Bank:Savings",
    ]);
  });

  it("sorts mixed-case account names by code point like Python", () => {
    const tree = accountHierarchy(
      [
        {
          type: "open",
          date: "2024-01-01",
          account: "Assets:ABc",
          currencies: [],
        },
        {
          type: "open",
          date: "2024-01-01",
          account: "Assets:ABC",
          currencies: [],
        },
      ],
      "Assets",
      "units",
      NO_PRICES,
    );
    expect(tree.children.map((child) => child.account)).toEqual([
      "Assets:ABC",
      "Assets:ABc",
    ]);
  });

  it("marks opened-but-unused accounts has_txns=false with empty balance", () => {
    const expenses = accountHierarchy(
      [
        {
          type: "open",
          date: "2024-01-01",
          account: "Expenses:Rent",
          currencies: ["USD"],
        },
      ],
      "Expenses",
      "units",
      NO_PRICES,
    );
    const rent = expenses.children.find((c) => c.account === "Expenses:Rent");
    expect(rent?.has_txns).toBe(false);
    expect(rent?.balance).toEqual({});
  });

  it("drops net-zero currencies from balances", () => {
    const tree = accountHierarchy(
      [txn([["Assets:Cash", "10.00"]]), txn([["Assets:Cash", "-10.00"]])],
      "Assets",
      "units",
      NO_PRICES,
    );
    const cash = tree.children.find((c) => c.account === "Assets:Cash");
    expect(cash?.balance).toEqual({}); // 10 - 10 = 0 → dropped
  });
});

describe("accountOwnUnitBalances", () => {
  it("sums own posting units per account (no rollup)", () => {
    const balances = accountOwnUnitBalances(DIRECTIVES);
    expect(balances.get("Assets:Bank:Checking")).toEqual({ USD: "-130.00" });
    expect(balances.get("Assets:Bank:Savings")).toEqual({ USD: "100.00" });
    // No entry for the intermediate "Assets:Bank" (no direct postings).
    expect(balances.has("Assets:Bank")).toBe(false);
  });
});

describe("accountLastEntryDates", () => {
  it("returns the latest referencing-directive date per account", () => {
    const dates = accountLastEntryDates(DIRECTIVES);
    // Checking is posted on 2024-01-15 and 2024-01-15 (both txns) → latest.
    expect(dates.get("Assets:Bank:Checking")).toBe("2024-01-15");
    expect(dates.get("Expenses:Food")).toBe("2024-01-15");
  });

  it("counts account-level directives (open) too", () => {
    const dates = accountLastEntryDates([
      {
        type: "open",
        date: "2024-03-01",
        account: "Assets:New",
        currencies: ["USD"],
      },
    ]);
    expect(dates.get("Assets:New")).toBe("2024-03-01");
  });
});

describe("ledgerCurrencies / hasCostPostings", () => {
  it("collects posting currencies", () => {
    expect([...ledgerCurrencies(DIRECTIVES)]).toEqual(["USD"]);
  });

  it("detects cost lots", () => {
    expect(hasCostPostings(DIRECTIVES)).toBe(false);
    const withCost: DirectiveJson[] = [
      {
        type: "transaction",
        date: "2024-01-15",
        flag: "*",
        narration: "buy",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Stocks",
            units: { number: "10", currency: "AAPL" },
            cost: {
              number: { kind: "per_unit", value: "150" },
              currency: "USD",
            },
          },
        ],
      },
    ];
    expect(hasCostPostings(withCost)).toBe(true);
  });
});
