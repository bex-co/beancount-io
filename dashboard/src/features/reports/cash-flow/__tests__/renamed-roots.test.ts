import { describe, expect, it } from "vitest";
import type { SerializableTreeNode } from "@/graphql/definitions";
import {
  cashFlowRootVariables,
  ledgerAccountRoots,
} from "../lib/account-roots";
import { mergeIntervalAccountChanges } from "../lib/merge-intervals";
import {
  buildCashFlowStatement,
  collectCashAccounts,
  toAccountMetaMap,
} from "../lib/model";

/**
 * A ledger that renames its roots (Actifs/Dettes/Capital/Revenus/Charges)
 * read its interval totals under the English names. The producer takes
 * `accountName` as a prefix, so all five came back empty: no operating rows,
 * and opening cash invented as closing minus nothing (w4/1022). This runs the
 * page's own pipeline: root selection → the five reads → merge → statement.
 */
const POSTINGS: Array<[account: string, change: string]> = [
  ["Actifs:Bank:Checking", "75.00"],
  ["Revenus:Salary", "-100.00"],
  ["Charges:Groceries", "25.00"],
];

/** The ledger service's interval totals: accounts under a prefix only. */
function intervalTotals(accountName: string) {
  const accountBalances = Object.fromEntries(
    POSTINGS.filter(([account]) => account.startsWith(accountName)).map(
      ([account, change]) => [account, { USD: change }],
    ),
  );
  return Object.keys(accountBalances).length === 0
    ? []
    : [{ date: "2026-01-31", accountBalances }];
}

const RENAMED = {
  nameAssets: "Actifs",
  nameLiabilities: "Dettes",
  nameEquity: "Capital",
  nameIncome: "Revenus",
  nameExpenses: "Charges",
};

const assets = {
  account: "Actifs",
  balance: {},
  children: [
    {
      account: "Actifs:Bank",
      balance: {},
      children: [
        {
          account: "Actifs:Bank:Checking",
          balance: { USD: "75.00" },
          children: [],
        },
      ],
    },
  ],
} as unknown as SerializableTreeNode;

function statementFor(
  options: typeof RENAMED | undefined,
  meta: Array<{ account: string; meta: Record<string, unknown> | null }>,
) {
  const variables = cashFlowRootVariables(options);
  const roots = ledgerAccountRoots(options);
  const accountMeta = toAccountMetaMap(meta);
  const intervals = mergeIntervalAccountChanges(
    intervalTotals(variables.incomeRoot),
    intervalTotals(variables.expensesRoot),
    intervalTotals(variables.assetsRoot),
    intervalTotals(variables.liabilitiesRoot),
    intervalTotals(variables.equityRoot),
  );
  return buildCashFlowStatement({
    intervals,
    closingCashAccounts: collectCashAccounts(assets, accountMeta, roots),
    primaryCurrency: "USD",
    accountMeta,
    roots,
  });
}

const DECLARED = [
  { account: "Actifs:Bank:Checking", meta: { "cash-flow-role": "cash" } },
  { account: "Revenus:Salary", meta: { "cash-flow-role": "operating" } },
  { account: "Charges:Groceries", meta: { "cash-flow-role": "operating" } },
];

describe("Cash Flow with renamed roots", () => {
  it("asks for the ledger's own root names", () => {
    expect(cashFlowRootVariables(RENAMED)).toEqual({
      incomeRoot: "Revenus",
      expensesRoot: "Charges",
      assetsRoot: "Actifs",
      liabilitiesRoot: "Dettes",
      equityRoot: "Capital",
    });
    expect(cashFlowRootVariables(undefined).incomeRoot).toBe("Income");
  });

  it("reports the declared movements and reconciles 0 → 75 → 75", () => {
    const statement = statementFor(RENAMED, DECLARED);
    expect(
      statement.rows
        .map((row) => [row.accountPath, row.activity, row.amounts])
        .sort(),
    ).toEqual([
      ["Charges:Groceries", "operating", { USD: "-25.00" }],
      ["Revenus:Salary", "operating", { USD: "100.00" }],
    ]);
    expect(statement.totals.operating).toEqual({ USD: "75.00" });
    expect(statement.netChange).toEqual({ USD: "75.00" });
    expect(statement.opening).toEqual({ USD: "0.00" });
    expect(statement.closing).toEqual({ USD: "75.00" });
  });

  it("classifies undeclared renamed accounts by their root's type", () => {
    // Without declarations: Revenus is Income, Charges is Expenses, and the
    // Actifs checking account is cash by the Assets name heuristic.
    const statement = statementFor(RENAMED, []);
    expect(statement.rows.map((row) => row.accountPath).sort()).toEqual([
      "Charges:Groceries",
      "Revenus:Salary",
    ]);
    expect(statement.opening).toEqual({ USD: "0.00" });
    expect(statement.closing).toEqual({ USD: "75.00" });
  });
});
