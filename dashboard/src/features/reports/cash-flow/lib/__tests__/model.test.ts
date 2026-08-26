import { describe, expect, it } from "vitest";
import {
  buildCashFlowStatement,
  classifyCashFlowActivity,
  collectCashAccounts,
  isCashEquivalentAccount,
  subtractBalanceRecords,
  toAccountMetaMap,
  type IntervalAccountChanges,
} from "../model";
import type { SerializableTreeNode } from "@/graphql/definitions";

function treeNode(
  account: string,
  balance: Record<string, unknown>,
  children: SerializableTreeNode[] = [],
): SerializableTreeNode {
  return {
    __typename: "SerializableTreeNode",
    account,
    balance,
    balanceChildren: balance,
    children: children as unknown as Record<string, unknown>[],
    cost: null,
    costChildren: null,
    hasTxns: true,
  } as SerializableTreeNode;
}

describe("toAccountMetaMap", () => {
  it("maps directives to account -> meta, null when a directive has none", () => {
    const map = toAccountMetaMap([
      { account: "Assets:Bank:CD", meta: { "cash-flow-role": "investing" } },
      { account: "Assets:Bank:Checking", meta: null },
      { account: "Expenses:Rent" },
    ]);
    expect(map.get("Assets:Bank:CD")).toEqual({
      "cash-flow-role": "investing",
    });
    expect(map.get("Assets:Bank:Checking")).toBeNull();
    expect(map.get("Expenses:Rent")).toBeNull();
    expect(map.has("Income:Salary")).toBe(false);
  });
});

describe("isCashEquivalentAccount", () => {
  it("matches checking/savings/cash/bank asset accounts", () => {
    expect(isCashEquivalentAccount("Assets:US:Chase:Checking")).toBe(true);
    expect(isCashEquivalentAccount("Assets:Bank:Ally:Savings")).toBe(true);
    expect(isCashEquivalentAccount("Assets:Cash")).toBe(true);
  });

  it("rejects non-cash and non-asset accounts", () => {
    expect(isCashEquivalentAccount("Assets:Invest:Brokerage")).toBe(false);
    expect(isCashEquivalentAccount("Liabilities:CreditCard")).toBe(false);
    expect(isCashEquivalentAccount("Expenses:Cash")).toBe(false);
  });
});

describe("classifyCashFlowActivity", () => {
  it("classifies the five roots into activities", () => {
    expect(classifyCashFlowActivity("Income:Salary")).toBe("operating");
    expect(classifyCashFlowActivity("Expenses:Rent")).toBe("operating");
    expect(classifyCashFlowActivity("Assets:Invest:Brokerage")).toBe(
      "investing",
    );
    expect(classifyCashFlowActivity("Liabilities:Mortgage")).toBe("financing");
    expect(classifyCashFlowActivity("Equity:Opening-Balances")).toBe(
      "financing",
    );
  });

  it("never classifies cash accounts as rows", () => {
    expect(classifyCashFlowActivity("Assets:US:Chase:Checking")).toBeNull();
    expect(classifyCashFlowActivity("Assets:Bank")).toBeNull();
  });
});

describe("subtractBalanceRecords", () => {
  it("subtracts with exact decimal arithmetic", () => {
    expect(subtractBalanceRecords({ USD: "1000.10" }, { USD: "0.20" })).toEqual(
      { USD: "999.90" },
    );
  });
});

describe("collectCashAccounts", () => {
  it("collects cash subtrees without double-counting nested cash accounts", () => {
    const assets = treeNode("Assets", { USD: "12000" }, [
      treeNode("Assets:Bank", { USD: "11000" }, [
        treeNode("Assets:Bank:Checking", { USD: "10000" }),
        treeNode("Assets:Bank:Savings", { USD: "1000" }),
      ]),
      treeNode("Assets:Invest:Brokerage", { USD: "1000" }),
    ]);

    const snapshots = collectCashAccounts(assets);
    // Assets:Bank matches the heuristic, so its membership carries down to
    // its leaves; leaf balances sum to the same rollup, never double-counted.
    expect(snapshots).toEqual([
      {
        account: "Assets:Bank:Checking",
        balance: { USD: "10000" },
        roleSource: "heuristic",
      },
      {
        account: "Assets:Bank:Savings",
        balance: { USD: "1000" },
        roleSource: "heuristic",
      },
    ]);
  });

  it("marks declared cash accounts with the declared source", () => {
    const assets = treeNode("Assets", { USD: "2300" }, [
      treeNode("Assets:Invest", { USD: "2300" }, [
        treeNode("Assets:Invest:MoneyMarket", { USD: "2300" }),
      ]),
    ]);
    const accountMeta = new Map([
      ["Assets:Invest:MoneyMarket", { "cash-flow-role": "cash" }],
    ]);

    expect(collectCashAccounts(assets, accountMeta)).toEqual([
      {
        account: "Assets:Invest:MoneyMarket",
        balance: { USD: "2300" },
        roleSource: "declared",
      },
    ]);
  });

  it("keeps the declared source when a cash leaf sits under a heuristic-cash ancestor", () => {
    // Regression: the ancestor's heuristic match must not mask the leaf's
    // own declaration (the export's inferred-CCE disclosure gates on this).
    const assets = treeNode("Assets", { USD: "1000" }, [
      treeNode("Assets:Bank", { USD: "1000" }, [
        treeNode("Assets:Bank:BoA", { USD: "1000" }),
      ]),
    ]);
    const accountMeta = new Map([
      ["Assets:Bank:BoA", { "cash-flow-role": "cash" }],
    ]);

    expect(collectCashAccounts(assets, accountMeta)).toEqual([
      {
        account: "Assets:Bank:BoA",
        balance: { USD: "1000" },
        roleSource: "declared",
      },
    ]);
  });

  it("pulls a declared non-cash account out of a heuristic-cash subtree", () => {
    const assets = treeNode("Assets", { USD: "11000" }, [
      treeNode("Assets:Bank", { USD: "11000" }, [
        treeNode("Assets:Bank:Checking", { USD: "10000" }),
        treeNode("Assets:Bank:CD", { USD: "1000" }),
      ]),
    ]);
    const accountMeta = new Map([
      ["Assets:Bank:CD", { "cash-flow-role": "investing" }],
    ]);

    expect(collectCashAccounts(assets, accountMeta)).toEqual([
      {
        account: "Assets:Bank:Checking",
        balance: { USD: "10000" },
        roleSource: "heuristic",
      },
    ]);
  });
});

describe("buildCashFlowStatement", () => {
  it("builds a reconciled statement from a realistic period", () => {
    // Beancount credit-normal signs: Income credits are negative, liability
    // balances are negative. One monthly interval.
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-01-31",
        accountChanges: {
          "Income:Salary": { USD: "-5000.00" },
          "Expenses:Rent": { USD: "1500.00" },
          "Expenses:Food": { USD: "400.25" },
          "Assets:Invest:Brokerage": { USD: "2000.00" },
          "Liabilities:CreditCard": { USD: "200.00" }, // paid down toward zero
          "Assets:Bank:Checking": { USD: "899.75" }, // the cash side
        },
      },
    ];

    const statement = buildCashFlowStatement({
      intervals,
      closingCashAccounts: [
        {
          account: "Assets:Bank:Checking",
          balance: { USD: "30899.75" },
          roleSource: "heuristic" as const,
        },
      ],
      primaryCurrency: "USD",
    });

    const rowByAccount = Object.fromEntries(
      statement.rows.map((row) => [row.accountPath, row]),
    );

    // Row amounts are the inverse of the account's change.
    expect(rowByAccount["Income:Salary"].amounts).toEqual({
      USD: "5000.00",
    });
    expect(rowByAccount["Income:Salary"].activity).toBe("operating");
    expect(rowByAccount["Expenses:Rent"].amounts).toEqual({
      USD: "-1500.00",
    });
    expect(rowByAccount["Assets:Invest:Brokerage"].amounts).toEqual({
      USD: "-2000.00",
    });
    expect(rowByAccount["Assets:Invest:Brokerage"].activity).toBe("investing");
    // Paying a credit card is a financing outflow, not an operating expense.
    expect(rowByAccount["Liabilities:CreditCard"].amounts).toEqual({
      USD: "-200.00",
    });
    expect(rowByAccount["Liabilities:CreditCard"].activity).toBe("financing");

    // Cash accounts never appear as rows.
    expect(rowByAccount["Assets:Bank:Checking"]).toBeUndefined();

    expect(statement.totals.operating).toEqual({ USD: "3099.75" });
    expect(statement.totals.investing).toEqual({ USD: "-2000.00" });
    expect(statement.totals.financing).toEqual({ USD: "-200.00" });

    // The bottom line reconciles exactly with the cash account's change.
    expect(statement.netChange).toEqual({ USD: "899.75" });
    expect(statement.closing).toEqual({ USD: "30899.75" });
    expect(statement.opening).toEqual({ USD: "30000.00" });

    // The chart series carries the same per-activity split.
    expect(statement.intervals).toHaveLength(1);
    expect(statement.intervals[0].activities.operating).toEqual({
      USD: "3099.75",
    });
    expect(statement.intervals[0].net).toEqual({ USD: "899.75" });
  });

  it("nets inter-cash transfers to zero: no rows, no change in net cash flow", () => {
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-01-31",
        accountChanges: {
          "Assets:Bank:Checking": { USD: "-500.00" },
          "Assets:Bank:Savings": { USD: "500.00" },
          "Income:Salary": { USD: "-1000.00" },
        },
      },
    ];

    const statement = buildCashFlowStatement({
      intervals,
      closingCashAccounts: [
        {
          account: "Assets:Bank:Checking",
          balance: { USD: "9500.00" },
          roleSource: "heuristic" as const,
        },
        {
          account: "Assets:Bank:Savings",
          balance: { USD: "2500.00" },
          roleSource: "heuristic" as const,
        },
      ],
      primaryCurrency: "USD",
    });

    // The $500 checking -> savings transfer appears nowhere; only the salary
    // inflow counts.
    expect(statement.rows.map((row) => row.accountPath)).toEqual([
      "Income:Salary",
    ]);
    expect(statement.netChange).toEqual({ USD: "1000.00" });
    expect(statement.closing).toEqual({ USD: "12000.00" });
    expect(statement.opening).toEqual({ USD: "11000.00" });
  });

  it("restricts to leaf accounts when interval totals roll up parents", () => {
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-01-31",
        accountChanges: {
          Expenses: { USD: "1500.00" }, // parent rollup — must not double-count
          "Expenses:Rent": { USD: "1500.00" },
        },
      },
    ];

    const statement = buildCashFlowStatement({
      intervals,
      closingCashAccounts: [],
      primaryCurrency: "USD",
    });

    expect(statement.rows.map((row) => row.accountPath)).toEqual([
      "Expenses:Rent",
    ]);
    expect(statement.totals.operating).toEqual({ USD: "-1500.00" });
  });

  it("drops accounts whose movement is zero", () => {
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-01-31",
        accountChanges: {
          "Assets:Invest:Brokerage": { USD: "0.00" },
          "Income:Salary": { USD: "-100.00" },
        },
      },
    ];

    const statement = buildCashFlowStatement({
      intervals,
      closingCashAccounts: [],
      primaryCurrency: "USD",
    });

    expect(statement.rows.map((row) => row.accountPath)).toEqual([
      "Income:Salary",
    ]);
  });

  it("keeps currencies separate instead of summing across units", () => {
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-01-31",
        accountChanges: {
          "Income:Salary": { USD: "-1000.00", EUR: "-200.00" },
          "Expenses:Rent": { USD: "500.00" },
        },
      },
    ];

    const statement = buildCashFlowStatement({
      intervals,
      closingCashAccounts: [
        {
          account: "Assets:Bank:Checking",
          balance: { USD: "6000.00", EUR: "800.00" },
          roleSource: "heuristic" as const,
        },
      ],
      primaryCurrency: "USD",
    });

    expect(statement.totals.operating).toEqual({
      USD: "500.00",
      EUR: "200.00",
    });
    expect(statement.netChange).toEqual({ USD: "500.00", EUR: "200.00" });
    expect(statement.opening).toEqual({ USD: "5500.00", EUR: "600.00" });
  });

  it("accumulates multiple intervals into the period totals", () => {
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-01-31",
        accountChanges: { "Income:Salary": { USD: "-1000.00" } },
      },
      {
        date: "2026-02-28",
        accountChanges: { "Income:Salary": { USD: "-1200.00" } },
      },
    ];

    const statement = buildCashFlowStatement({
      intervals,
      closingCashAccounts: [],
      primaryCurrency: "USD",
    });

    expect(statement.totals.operating).toEqual({ USD: "2200.00" });
    expect(statement.intervals.map((point) => point.net)).toEqual([
      { USD: "1000.00" },
      { USD: "1200.00" },
    ]);
  });

  it("returns an empty statement for an empty ledger period", () => {
    const statement = buildCashFlowStatement({
      intervals: [],
      closingCashAccounts: [],
      primaryCurrency: "USD",
    });

    expect(statement.rows).toEqual([]);
    expect(statement.netChange).toEqual({});
    expect(statement.opening).toEqual({});
    expect(statement.intervals).toEqual([]);
    expect(statement.invalidRoleValues).toEqual([]);
    expect(statement.hasHeuristicCashAccounts).toBe(false);
  });
});

describe("declared cash-flow roles (accountMeta)", () => {
  it("produces output identical to the default when the meta map is empty", () => {
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-01-31",
        accountChanges: {
          "Income:Salary": { USD: "-5000.00" },
          "Expenses:Rent": { USD: "1500.00" },
          "Assets:Bank:Checking": { USD: "3500.00" },
        },
      },
    ];
    const closingCashAccounts = [
      {
        account: "Assets:Bank:Checking",
        balance: { USD: "3500.00" },
        roleSource: "heuristic" as const,
      },
    ];

    const withoutMeta = buildCashFlowStatement({
      intervals,
      closingCashAccounts,
      primaryCurrency: "USD",
    });
    const withEmptyMeta = buildCashFlowStatement({
      intervals,
      closingCashAccounts,
      primaryCurrency: "USD",
      accountMeta: new Map(),
    });

    expect(withEmptyMeta).toEqual(withoutMeta);
    expect(
      withEmptyMeta.rows.every((row) => row.roleSource === "heuristic"),
    ).toBe(true);
  });

  it("excludes an account declared investing from the CCE set and files it as a row", () => {
    // Assets:Bank:CD matches the name heuristic, but the ledger declares it
    // investing: it leaves the CCE set (bottom line drops it) and its change
    // becomes an investing outflow.
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-01-31",
        accountChanges: {
          "Income:Salary": { USD: "-5000.00" },
          "Assets:Bank:CD": { USD: "1500.00" },
          "Assets:Bank:Checking": { USD: "3500.00" },
        },
      },
    ];
    const assets = treeNode("Assets", { USD: "5000.00" }, [
      treeNode("Assets:Bank:Checking", { USD: "3500.00" }),
      treeNode("Assets:Bank:CD", { USD: "1500.00" }),
    ]);
    const accountMeta = new Map([
      ["Assets:Bank:CD", { "cash-flow-role": "investing" }],
    ]);

    const statement = buildCashFlowStatement({
      intervals,
      closingCashAccounts: collectCashAccounts(assets, accountMeta),
      primaryCurrency: "USD",
      accountMeta,
    });

    const rowByAccount = Object.fromEntries(
      statement.rows.map((row) => [row.accountPath, row]),
    );
    expect(rowByAccount["Assets:Bank:CD"].activity).toBe("investing");
    expect(rowByAccount["Assets:Bank:CD"].roleSource).toBe("declared");
    expect(rowByAccount["Assets:Bank:CD"].amounts).toEqual({
      USD: "-1500.00",
    });
    expect(rowByAccount["Income:Salary"].roleSource).toBe("heuristic");

    // Only Checking remains cash; the sum of activity lines still equals the
    // net change in CCE exactly.
    expect(statement.closing).toEqual({ USD: "3500.00" });
    expect(statement.netChange).toEqual({ USD: "3500.00" });
    expect(statement.opening).toEqual({ USD: "0.00" });
    expect(statement.invalidRoleValues).toEqual([]);
  });

  it("pulls an account declared cash into the CCE set, so transfers to it net out", () => {
    // A money-market fund the name heuristic misses: declared cash, the
    // checking -> fund transfer is between two CCE accounts and vanishes.
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-01-31",
        accountChanges: {
          "Assets:Bank:Checking": { USD: "-300.00" },
          "Assets:Invest:MoneyMarket": { USD: "300.00" },
        },
      },
    ];
    const assets = treeNode("Assets", { USD: "7000.00" }, [
      treeNode("Assets:Bank:Checking", { USD: "4700.00" }),
      treeNode("Assets:Invest", { USD: "2300.00" }, [
        treeNode("Assets:Invest:MoneyMarket", { USD: "2300.00" }),
      ]),
    ]);
    const accountMeta = new Map([
      ["Assets:Invest:MoneyMarket", { "cash-flow-role": "cash" }],
    ]);

    const cashAccounts = collectCashAccounts(assets, accountMeta);
    expect(cashAccounts.map((snapshot) => snapshot.account)).toEqual([
      "Assets:Bank:Checking",
      "Assets:Invest:MoneyMarket",
    ]);

    const statement = buildCashFlowStatement({
      intervals,
      closingCashAccounts: cashAccounts,
      primaryCurrency: "USD",
      accountMeta,
    });

    expect(statement.rows).toEqual([]);
    expect(statement.netChange).toEqual({});
    expect(statement.closing).toEqual({ USD: "7000.00" });
    expect(statement.opening).toEqual({ USD: "7000.00" });
    // Checking is still heuristic-resolved even though MoneyMarket is declared.
    expect(statement.hasHeuristicCashAccounts).toBe(true);
  });

  it("reports no heuristic cash accounts when every CCE member is declared", () => {
    const assets = treeNode("Assets", { USD: "7000.00" }, [
      treeNode("Assets:Bank:Checking", { USD: "4700.00" }),
      treeNode("Assets:Invest:MoneyMarket", { USD: "2300.00" }),
    ]);
    const accountMeta = new Map([
      ["Assets:Bank:Checking", { "cash-flow-role": "cash" }],
      ["Assets:Invest:MoneyMarket", { "cash-flow-role": "cash" }],
    ]);

    const statement = buildCashFlowStatement({
      intervals: [],
      closingCashAccounts: collectCashAccounts(assets, accountMeta),
      primaryCurrency: "USD",
      accountMeta,
    });

    expect(statement.hasHeuristicCashAccounts).toBe(false);
  });

  it("honors a declared activity role verbatim, even against the root mapping", () => {
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-01-31",
        accountChanges: { "Equity:Opening-Balances": { USD: "1000.00" } },
      },
    ];

    const statement = buildCashFlowStatement({
      intervals,
      closingCashAccounts: [],
      primaryCurrency: "USD",
      accountMeta: new Map([
        ["Equity:Opening-Balances", { "cash-flow-role": "operating" }],
      ]),
    });

    expect(statement.rows).toHaveLength(1);
    expect(statement.rows[0].activity).toBe("operating");
    expect(statement.rows[0].roleSource).toBe("declared");
    expect(statement.totals.financing).toEqual({});
  });

  it("falls back to the heuristic and flags invalid declared values", () => {
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-01-31",
        accountChanges: {
          "Expenses:Rent": { USD: "100.00" },
          "Assets:Bank:Checking": { USD: "-100.00" },
        },
      },
    ];
    const accountMeta = new Map<string, Record<string, unknown> | null>([
      ["Expenses:Rent", { "cash-flow-role": "invsting" }], // typo
      ["Assets:Bank:Checking", null], // no metadata at all
    ]);

    const statement = buildCashFlowStatement({
      intervals,
      closingCashAccounts: [
        {
          account: "Assets:Bank:Checking",
          balance: { USD: "900.00" },
          roleSource: "heuristic" as const,
        },
      ],
      primaryCurrency: "USD",
      accountMeta,
    });

    // The typo is ignored: Rent classifies by root as operating, and the
    // account is reported for the status panel.
    expect(statement.rows[0].accountPath).toBe("Expenses:Rent");
    expect(statement.rows[0].activity).toBe("operating");
    expect(statement.rows[0].roleSource).toBe("heuristic");
    expect(statement.invalidRoleValues).toEqual([
      { account: "Expenses:Rent", value: "invsting" },
    ]);
  });
});
