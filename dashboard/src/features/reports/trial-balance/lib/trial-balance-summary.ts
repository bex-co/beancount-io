import type { HierarchyListNode } from "@/features/reports/balance-sheet/hierarchy-list-types";
import { sumBalanceRecords } from "@/features/reports/export/model";
import { isZeroStatementAmount } from "@/features/reports/export/presentation";

function rootBalance(node: HierarchyListNode): Record<string, unknown> {
  return (node.balanceChildren ?? node.balance ?? {}) as Record<
    string,
    unknown
  >;
}

/**
 * Per-unit sum of the trial-balance roots' signed accounting balances, plus
 * the server's valuation adjustment line — zero when debits equal credits.
 * The `inverted` flag only changes how credit rows are displayed; summing
 * display signs reported a balanced ledger as out by twice its credits
 * (w4/267). Valued at market or at cost the roots alone never net: a
 * holding's unrealized gain and a currency's translation are in the
 * adjustment, so correct books read as out of balance without it (w1/291).
 */
export function computeTrialBalanceReconciliation(
  hierarchyData: HierarchyListNode[],
  valuationAdjustment?: Record<string, unknown> | null,
): Record<string, string> {
  if (hierarchyData.length === 0) {
    return {};
  }
  return sumBalanceRecords([
    ...hierarchyData.map(rootBalance),
    valuationAdjustment ?? {},
  ]);
}

export function hasTrialBalanceReconciliationDifference(
  difference: Record<string, string>,
): boolean {
  return Object.values(difference).some(
    (value) => !isZeroStatementAmount(value),
  );
}
