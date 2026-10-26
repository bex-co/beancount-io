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
 * A cash-named parent with a non-cash-named leaf (Assets:Cash:Petty) counts
 * the leaf in closing through inherited membership — and must not also list
 * it as an investing row. The row loop used to resolve the direct role only,
 * so the leaf read both ways.
 */
const POSTINGS: Array<[account: string, change: string]> = [
  ["Assets:Cash:Petty", "100.00"],
  ["Income:Salary", "-100.00"],
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

const assets = {
  account: "Assets",
  balance: {},
  children: [
    {
      account: "Assets:Cash",
      balance: {},
      children: [
        {
          account: "Assets:Cash:Petty",
          balance: { USD: "100.00" },
          children: [],
        },
      ],
    },
  ],
} as unknown as SerializableTreeNode;

function statementFor(
  meta: Array<{ account: string; meta: Record<string, unknown> | null }>,
) {
  const variables = cashFlowRootVariables(undefined);
  const roots = ledgerAccountRoots(undefined);
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

describe("Cash Flow with an inherited-cash leaf", () => {
  it("keeps the leaf in closing and out of the rows", () => {
    const statement = statementFor([]);
    expect(
      statement.rows.map((row) => [row.accountPath, row.activity, row.amounts]),
    ).toEqual([["Income:Salary", "operating", { USD: "100.00" }]]);
    expect(statement.netChange).toEqual({ USD: "100.00" });
    expect(statement.opening).toEqual({ USD: "0.00" });
    expect(statement.closing).toEqual({ USD: "100.00" });
  });

  it("still lets a declared role pull the leaf out of the subtree", () => {
    const statement = statementFor([
      { account: "Assets:Cash:Petty", meta: { "cash-flow-role": "investing" } },
    ]);
    expect(
      statement.rows
        .map((row) => [row.accountPath, row.activity, row.amounts])
        .sort(),
    ).toEqual([
      ["Assets:Cash:Petty", "investing", { USD: "-100.00" }],
      ["Income:Salary", "operating", { USD: "100.00" }],
    ]);
    expect(statement.netChange).toEqual({ USD: "0.00" });
    expect(statement.closing).toEqual({});
    expect(statement.opening).toEqual({ USD: "0.00" });
  });
});
