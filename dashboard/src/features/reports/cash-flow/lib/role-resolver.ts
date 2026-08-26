import {
  CASH_EQUIVALENT_PATTERNS,
  CASH_FLOW_ACTIVITY_BY_ROOT,
  type CashFlowRoot,
} from "../config";

/**
 * Shared cash-flow role resolver.
 *
 * One function decides BOTH classification axes for an account — membership
 * in the cash-and-equivalents (CCE) set and the cash-flow activity section —
 * per the spec appendix in `docs/PRFAQ-cash-flow-ledger-classification.md`.
 * Every consumer (statement model, exports, overview Sankey) resolves through
 * here so they can never disagree.
 *
 * Precedence (highest wins):
 *
 * 1. `cash-flow-role` metadata on the account's `open` directive
 *    (`"cash" | "operating" | "investing" | "financing"`, case-sensitive
 *    exact match). A declared role decides both axes at once: `"cash"` puts
 *    the account in the CCE set (never a statement row); an activity role
 *    excludes it from CCE even when the name heuristic would have captured
 *    it (e.g. `cash-flow-role: "investing"` on `Assets:US:Bank:CD`).
 * 2. The name heuristics in `../config` (`CASH_EQUIVALENT_PATTERNS` +
 *    `CASH_FLOW_ACTIVITY_BY_ROOT`).
 *
 * Invalid declared values (typo, wrong case, non-string) are treated as
 * absent: resolution falls through to the heuristic and the raw value is
 * reported via `invalidValue` so callers can flag it. This function never
 * throws.
 */

/** Metadata key read from the account's `open` directive. */
export const CASH_FLOW_ROLE_META_KEY = "cash-flow-role";

export type CashFlowRole = "cash" | "operating" | "investing" | "financing";

export type RoleResolution = {
  /** Final role; "cash" means the account is a CCE member (no activity row). */
  role: CashFlowRole;
  /** Whether the role came from ledger metadata or the name heuristics. */
  source: "declared" | "heuristic";
  /** Raw declared value when one was present but not a valid role. */
  invalidValue?: unknown;
};

const VALID_ROLES: readonly string[] = [
  "cash",
  "operating",
  "investing",
  "financing",
];

export function resolveCashFlowRole(
  account: string,
  meta?: Record<string, unknown> | null,
): RoleResolution {
  const declared = meta?.[CASH_FLOW_ROLE_META_KEY];
  if (typeof declared === "string" && VALID_ROLES.includes(declared)) {
    return { role: declared as CashFlowRole, source: "declared" };
  }

  const resolution: RoleResolution = {
    role: resolveHeuristicRole(account),
    source: "heuristic",
  };
  if (declared !== undefined) {
    resolution.invalidValue = declared;
  }
  return resolution;
}

/**
 * The config.ts heuristics, verbatim: an account matching
 * CASH_EQUIVALENT_PATTERNS is cash; otherwise the root maps to an activity.
 * The patterns are anchored to `Assets:`, so non-asset accounts can never be
 * cash here. Roots outside the five beancount roots (only possible with
 * renamed-root options) behave like Equity — financing.
 */
function resolveHeuristicRole(account: string): CashFlowRole {
  if (CASH_EQUIVALENT_PATTERNS.some((pattern) => pattern.test(account))) {
    return "cash";
  }
  const root = account.split(":")[0] as CashFlowRoot;
  return CASH_FLOW_ACTIVITY_BY_ROOT[root] ?? "financing";
}
