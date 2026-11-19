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

  // The API's credit roots are negative; `inverted` only flips their display.
  it.each([true, false])(
    "reconciles a balanced ledger whatever the credit-sign display (inverted=%s, w4/267)",
    (inverted) => {
      const difference = computeTrialBalanceReconciliation([
        rootNode("Equity", { USD: "-50" }, inverted),
        rootNode("Liabilities", { USD: "-30" }, inverted),
        rootNode("Income", { USD: "-20" }, inverted),
        rootNode("Assets", { USD: "60" }),
        rootNode("Expenses", { USD: "40" }),
      ]);

      expect(difference).toEqual({ USD: "0" });
      expect(hasTrialBalanceReconciliationDifference(difference)).toBe(false);
    },
  );

  it("keeps the QA ledger's exact balance at zero with credits displayed positive", () => {
    const difference = computeTrialBalanceReconciliation([
      rootNode("Equity", { USD: "-13200" }, true),
      rootNode("Liabilities", { USD: "-143.25" }, true),
      rootNode("Income", { USD: "-8000" }, true),
      rootNode("Assets", { USD: "17251.76" }),
      rootNode("Expenses", { USD: "4091.49" }),
    ]);
    expect(hasTrialBalanceReconciliationDifference(difference)).toBe(false);
  });

  it("keeps genuine per-unit differences separate", () => {
    const difference = computeTrialBalanceReconciliation([
      rootNode("Assets", { USD: "-33809", ACME: "150" }, false),
      rootNode("Income", { USD: "0" }, true),
    ]);
    expect(difference).toEqual({ USD: "-33809", ACME: "150" });
  });

  // w1/291: valued at market, holdings and currencies leave the roots out by
  // their unrealized gain and translation; the server's line carries it.
  it("nets valued roots through the valuation adjustment line", () => {
    const roots = [
      rootNode("Equity", { USD: "-1000.00" }, true),
      rootNode("Assets", { USD: "1109.0000" }),
    ];

    expect(
      hasTrialBalanceReconciliationDifference(
        computeTrialBalanceReconciliation(roots),
      ),
    ).toBe(true);
    const difference = computeTrialBalanceReconciliation(roots, {
      USD: "-109.0000",
    });
    expect(hasTrialBalanceReconciliationDifference(difference)).toBe(false);
  });

  it("nets an at-cost exchange through a line in two currencies", () => {
    const difference = computeTrialBalanceReconciliation(
      [
        rootNode("Equity", { USD: "-1000.00" }, true),
        rootNode("Assets", { USD: "901.00", EUR: "90.00" }),
      ],
      { USD: "99.00", EUR: "-90.00" },
    );

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
