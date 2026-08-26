import { resolveCashFlowRole } from "@/features/reports/cash-flow/lib/role-resolver";

export type AccountCategory =
  | "source"
  | "operating"
  | "investing"
  | "financing"
  | "exclude";

/** Root heuristic for the roots that can carry a cash-flow activity. */
const ROOT_CATEGORIES: Record<string, AccountCategory> = {
  Expenses: "operating",
  Assets: "investing",
  Liabilities: "financing",
};

/**
 * Categorize a Beancount account for the Sankey diagram.
 *
 * Categories resolve through the shared `resolveCashFlowRole`: a declared
 * `cash-flow-role` on the account's `open` directive (passed in via `meta`)
 * wins over the root heuristic for the Assets/Liabilities/Expenses roots.
 *
 * Sankey vocabulary is unchanged and declarations never remap it:
 * - `Income` is always the `source` side (even when declared otherwise, e.g.
 *   `Income:X` with `cash-flow-role: "investing"` stays `source`);
 * - `Equity` and unknown roots stay `exclude`;
 * - a resolved `"cash"` role has no Sankey category — those accounts are
 *   dropped from the flow nodes via `isExcludedAccount`, so this falls back
 *   to the root's own category.
 *
 * With no `meta`, every account resolves by heuristic and the result is
 * identical to the old root-prefix switch.
 */
export function categorizeAccount(
  accountName: string,
  meta?: Record<string, unknown> | null,
): AccountCategory {
  if (!accountName) {
    return "exclude";
  }
  const prefix = accountName.split(":")[0];

  if (prefix === "Income") {
    return "source";
  }
  if (prefix === "Equity") {
    return "exclude";
  }

  const rootCategory = ROOT_CATEGORIES[prefix];
  if (!rootCategory) {
    return "exclude";
  }

  const { role } = resolveCashFlowRole(accountName, meta);
  return role === "cash" ? rootCategory : role;
}

/**
 * Check if an account should be excluded from cash flow visualization
 * (i.e. it resolves to the `"cash"` role and therefore is not a flow node).
 *
 * Resolves through `resolveCashFlowRole`: a declared `cash-flow-role: "cash"`
 * excludes an account the name heuristic misses, and a declared activity
 * role keeps an account the heuristic would have captured (e.g.
 * `cash-flow-role: "investing"` on `Assets:US:Bank:CD`). With no `meta`
 * this reduces to the `CASH_EQUIVALENT_PATTERNS` check, exactly as before.
 *
 * `Income`/`Equity` roots keep their fixed Sankey vocabulary — a declared
 * role never remaps them, so it cannot exclude them either. (The name
 * heuristic is anchored to `Assets:` and already never matches them.)
 */
export function isExcludedAccount(
  accountName: string,
  meta?: Record<string, unknown> | null,
): boolean {
  if (!accountName) {
    return false;
  }

  const prefix = accountName.split(":")[0];
  const effectiveMeta =
    prefix === "Income" || prefix === "Equity" ? null : meta;
  return resolveCashFlowRole(accountName, effectiveMeta).role === "cash";
}

/**
 * Extract account name at a specific hierarchical depth
 * @param accountName - Full account name (e.g., "Income:Salary:Gross")
 * @param depth - Desired depth level (1, 2, or 3)
 * @returns Account name at specified depth (e.g., "Income:Salary" at depth 2)
 */
export function extractAccountAtDepth(
  accountName: string,
  depth: number,
): string {
  if (!accountName) {
    return "";
  }
  const parts = accountName.split(":");
  const targetDepth = Math.min(depth, parts.length);
  return parts.slice(0, targetDepth).join(":");
}
