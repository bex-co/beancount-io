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
 * the server's netting lines — zero when debits equal credits. The
 * `inverted` flag only changes how credit rows are displayed; summing display
 * signs reported a balanced ledger as out by twice its credits (w4/267).
 * Valued at market or at cost the roots alone never net: a holding's
 * unrealized gain and a currency's translation are in the valuation
 * adjustment (w1/291), and the rounding the ledger's tolerance accepted is in
 * the rounding residual (w1/305), so correct books read as out of balance
 * without them.
 */
export function computeTrialBalanceReconciliation(
  hierarchyData: HierarchyListNode[],
  ...lines: Array<Record<string, unknown> | null | undefined>
): Record<string, string> {
  if (hierarchyData.length === 0) {
    return {};
  }
  return sumBalanceRecords([
    ...hierarchyData.map(rootBalance),
    ...lines.map((line) => line ?? {}),
  ]);
}

export function hasTrialBalanceReconciliationDifference(
  difference: Record<string, string>,
): boolean {
  return Object.values(difference).some(
    (value) => !isZeroStatementAmount(value),
  );
}
