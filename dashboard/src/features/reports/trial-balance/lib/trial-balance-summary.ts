import type { HierarchyListNode } from "@/features/reports/balance-sheet/hierarchy-list-types";
import {
  invertDecimal,
  sumBalanceRecords,
} from "@/features/reports/export/model";
import { isZeroStatementAmount } from "@/features/reports/export/presentation";

function invertBalanceRecord(
  balance: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(balance).map(([currency, value]) => [
      currency,
      typeof value === "string" ? invertDecimal(value) : value,
    ]),
  );
}

function rootBalance(node: HierarchyListNode): Record<string, unknown> {
  return (node.balanceChildren ?? node.balance ?? {}) as Record<
    string,
    unknown
  >;
}

/** Per-unit sum of the rendered trial-balance root rows (display signs). */
export function computeTrialBalanceReconciliation(
  hierarchyData: HierarchyListNode[],
): Record<string, string> {
  if (hierarchyData.length === 0) {
    return {};
  }

  const displayedRoots = hierarchyData.map((node) => {
    const balance = rootBalance(node);
    return node.inverted ? invertBalanceRecord(balance) : balance;
  });

  return sumBalanceRecords(displayedRoots);
}

export function hasTrialBalanceReconciliationDifference(
  difference: Record<string, string>,
): boolean {
  return Object.values(difference).some(
    (value) => !isZeroStatementAmount(value),
  );
}
