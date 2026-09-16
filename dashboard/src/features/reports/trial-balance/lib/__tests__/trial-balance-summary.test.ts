import { describe, expect, it } from "vitest";
import type { HierarchyListNode } from "@/features/reports/balance-sheet/hierarchy-list-types";
import {
  computeTrialBalanceReconciliation,
  hasTrialBalanceReconciliationDifference,
} from "../trial-balance-summary";

function rootNode(
  account: string,
  balance: Record<string, string>,
  inverted?: boolean,
): HierarchyListNode {
  return {
    __typename: "SerializableTreeNode",
    account,
    balance,
    balanceChildren: balance,
    children: [],
    hasTxns: true,
    cost: null,
    costChildren: null,
    inverted,
  };
}

describe("computeTrialBalanceReconciliation", () => {
  it("returns an empty record when there are no root rows", () => {
    expect(computeTrialBalanceReconciliation([])).toEqual({});
  });

  it("sums displayed root balances per unit and reconciles a balanced ledger", () => {
    const difference = computeTrialBalanceReconciliation([
      rootNode("Equity", { USD: "50" }, true),
      rootNode("Liabilities", { USD: "30" }, true),
      rootNode("Income", { USD: "20" }, true),
      rootNode("Assets", { USD: "60" }),
      rootNode("Expenses", { USD: "40" }),
    ]);

    expect(difference).toEqual({ USD: "0" });
    expect(hasTrialBalanceReconciliationDifference(difference)).toBe(false);
  });

  it("shows the exact per-unit difference when roots do not reconcile", () => {
    const difference = computeTrialBalanceReconciliation([
      rootNode("Assets", { USD: "100" }),
      rootNode("Expenses", { USD: "50" }),
    ]);

    expect(difference).toEqual({ USD: "150" });
    expect(hasTrialBalanceReconciliationDifference(difference)).toBe(true);
  });
});
