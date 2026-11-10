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
    // At the postings' written scale, as Python's Decimal keeps it (w21/125).
    expect(assets.balance_children).toEqual({ USD: "-30.00" });

    const bank = assets.children.find((c) => c.account === "Assets:Bank");
    expect(bank?.balance).toEqual({}); // no direct postings on Assets:Bank
    expect(bank?.balance_children).toEqual({ USD: "-30.00" });

    const checking = bank?.children.find(
      (c) => c.account === "Assets:Bank:Checking",
    );
    expect(checking?.balance).toEqual({ USD: "-130.00" });
    expect(checking?.has_txns).toBe(true);

    const savings = bank?.children.find(
      (c) => c.account === "Assets:Bank:Savings",
    );
    expect(savings?.balance).toEqual({ USD: "100.00" });
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

// w21/125: balances went out through `toString()`, so 0.00000050 BTC read
// "5e-7" (a client showed "0 BTC") and 1250.50 EUR read "1250.5".
describe("accountHierarchy balance strings", () => {
  const posting = (account: string, number: string, currency: string) => ({
    type: "transaction" as const,
    date: "2024-01-15",
    flag: "*",
    narration: "t",
    tags: [],
    links: [],
    postings: [
      { account, units: { number, currency } },
      { account: "Equity:Seed", units: { number: `-${number}`, currency } },
    ],
  });
  const balanceOf = (directives: DirectiveJson[], account: string) =>
    accountHierarchy(directives, account, "units", NO_PRICES).balance;

  it("writes dust in plain decimals at its written scale", () => {
    expect(
      balanceOf(
        [posting("Assets:Wallet", "0.00000050", "BTC") as DirectiveJson],
        "Assets:Wallet",
      ),
    ).toEqual({ BTC: "0.00000050" });
  });

  it("keeps trailing zeros, through a sum too", () => {
    expect(
      balanceOf(
        [posting("Assets:Euro", "1250.50", "EUR") as DirectiveJson],
        "Assets:Euro",
      ),
    ).toEqual({ EUR: "1250.50" });
    expect(
      balanceOf(
        [
          posting("Assets:Euro", "999.50", "EUR") as DirectiveJson,
          posting("Assets:Euro", "0.50", "EUR") as DirectiveJson,
        ],
        "Assets:Euro",
      ),
    ).toEqual({ EUR: "1000.00" });
  });
});

// w22/016: Accounts read "Not in total: 1,800 EUR" for 10 VTI {180.00 EUR} (no
// VTI price) beside "970.00 EUR" for a mixed account, and the account's own
// journal read +1,800.00 EUR. A valued amount keeps the places of its units and
// its cost, as the journal and Python's Decimal do.
describe("accountHierarchy balances valued at a cost or a price", () => {
  const buy = (account: string, cost: string): DirectiveJson =>
    ({
      type: "transaction",
      date: "2026-07-01",
      flag: "*",
      narration: "Buy VTI",
      tags: [],
      links: [],
      postings: [
        {
          account,
          units: { number: "10", currency: "VTI" },
          cost: { number: { kind: "per_unit", value: cost }, currency: "EUR" },
        },
        { account: "Equity:Opening", units: { number: "-1800.00", currency: "EUR" } },
      ],
    }) as DirectiveJson;
  const price = (number: string): DirectiveJson =>
    ({
      type: "price",
      date: "2026-07-02",
      currency: "VTI",
      amount: { number, currency: "EUR" },
    }) as DirectiveJson;
  const balance = (
    directives: DirectiveJson[],
    account: string,
    conversion: string,
  ) =>
    accountHierarchy(
      directives,
      account,
      conversion,
      buildPriceMap(directives),
    ).balance;

  it("keeps the cost's places for a lot with no price", () => {
    const directives = [buy("Assets:BrokerEur", "180.00")];
    expect(balance(directives, "Assets:BrokerEur", "at_value")).toEqual({
      EUR: "1800.00",
    });
    expect(balance(directives, "Assets:BrokerEur", "at_cost")).toEqual({
      EUR: "1800.00",
    });
  });

  it("keeps the price's places for a lot with one", () => {
    const directives = [buy("Assets:BrokerEur", "180.00"), price("200.00")];
    expect(balance(directives, "Assets:BrokerEur", "at_value")).toEqual({
      EUR: "2000.00",
    });
  });

  it("sums several lots and currencies at the widest places", () => {
    // The QA "Mixed" account: 3 VTI {180.00 EUR}, 2 VTI {190.00 EUR},
    // 4 VTI {200.00 USD} and 50.00 EUR of cash, no VTI price.
    const lot = (number: string, cost: string, currency: string) => ({
      account: "Assets:Mixed",
      units: { number, currency: "VTI" },
      cost: { number: { kind: "per_unit", value: cost }, currency },
    });
    const mixed = {
      type: "transaction",
      date: "2026-07-01",
      flag: "*",
      narration: "Mixed",
      tags: [],
      links: [],
      postings: [
        lot("3", "180.00", "EUR"),
        lot("2", "190.00", "EUR"),
        lot("4", "200.00", "USD"),
        { account: "Assets:Mixed", units: { number: "50.00", currency: "EUR" } },
      ],
    } as unknown as DirectiveJson;
    expect(balance([mixed], "Assets:Mixed", "at_value")).toEqual({
      EUR: "970.00",
      USD: "800.00",
    });
  });

  it("reads the same amount the same way beside written-scale cash", () => {
    const withCash: DirectiveJson = {
      type: "transaction",
      date: "2026-07-03",
      flag: "*",
      narration: "Cash",
      tags: [],
      links: [],
      postings: [
        { account: "Assets:BrokerEur", units: { number: "500.00", currency: "EUR" } },
        { account: "Equity:Opening", units: { number: "-500.00", currency: "EUR" } },
      ],
    } as DirectiveJson;
    expect(
      balance([buy("Assets:BrokerEur", "180.00"), withCash], "Assets:BrokerEur", "at_value"),
    ).toEqual({ EUR: "2300.00" });
  });
});
