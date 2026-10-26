import { isExcludedAccount } from "@/features/reports/overview/lib/account-categorizer";
import {
  invertDecimal,
  sumBalanceRecords,
} from "@/features/reports/export/model";
import { CASH_FLOW_ACTIVITY_BY_ROOT, type CashFlowRoot } from "../config";
import { resolveCashFlowRole, type RoleResolution } from "./role-resolver";
import { accountAsRootType, type AccountRoots } from "./account-roots";
import type { SerializableTreeNode } from "@/graphql/definitions";

export type CashFlowActivity = "operating" | "investing" | "financing";

export const CASH_FLOW_ACTIVITIES: readonly CashFlowActivity[] = [
  "operating",
  "investing",
  "financing",
];

/**
 * Account name -> the `open`-directive metadata map (null when the directive
 * carries none), from getLedgerAccountDirectives. Feeds resolveCashFlowRole;
 * ledgers without annotations pass an empty map (or nothing) and resolve
 * purely by heuristic.
 */
export type AccountMetaMap = ReadonlyMap<
  string,
  Record<string, unknown> | null
>;

/** Build the meta map from `getLedgerAccountDirectives` items. */
export function toAccountMetaMap(
  directives: ReadonlyArray<{
    account: string;
    meta?: Record<string, unknown> | null;
  }>,
): AccountMetaMap {
  return new Map(directives.map((item) => [item.account, item.meta ?? null]));
}

/**
 * Per-interval, per-account signed changes (fava interval-totals semantics:
 * the account's activity within the interval, per currency, as exact decimal
 * strings — never JS floats).
 */
export interface IntervalAccountChanges {
  date: string;
  /** account name -> (currency -> signed decimal change within the interval) */
  accountChanges: Record<string, Record<string, unknown>>;
}

/** Converted or filtered movements cannot support a reconciled cash statement. */
export class CashFlowReconciliationError extends Error {
  constructor(
    readonly date: string,
    readonly differences: Record<string, string>,
  ) {
    super(`Cash flow movements do not reconcile for ${date}`);
    this.name = "CashFlowReconciliationError";
  }
}

export interface CashAccountSnapshot {
  account: string;
  /** Rollup balance at period end, per currency. */
  balance: Record<string, unknown>;
  /** Whether CCE membership came from ledger metadata or the name heuristics. */
  roleSource: RoleResolution["source"];
}

export interface CashFlowRow {
  accountPath: string;
  label: string;
  activity: CashFlowActivity;
  /** Whether the activity came from ledger metadata or the name heuristics. */
  roleSource: RoleResolution["source"];
  /**
   * Cash impact per currency as exact decimal strings: the inverse of the
   * account's change over the period (+ = cash inflow, - = cash outflow).
   */
  amounts: Record<string, string>;
}

/**
 * An account whose `open` directive carried a `cash-flow-role` value that is
 * not a valid role. Resolution fell back to the heuristic for it; the status
 * panel flags it ("unknown cash-flow-role value, using default").
 */
export interface InvalidCashFlowRoleValue {
  account: string;
  value: unknown;
}

export interface CashFlowIntervalPoint {
  date: string;
  /** Per-activity net cash impact per currency for this interval. */
  activities: Record<CashFlowActivity, Record<string, string>>;
  /** Net cash flow per currency for this interval (sum of the activities). */
  net: Record<string, string>;
}

export interface CashFlowStatement {
  /** Period rows for non-cash accounts with nonzero movement, by activity. */
  rows: CashFlowRow[];
  /** Per-activity totals per currency. */
  totals: Record<CashFlowActivity, Record<string, string>>;
  /**
   * Net change in cash & equivalents per currency. Equals the sum of all row
   * amounts exactly, by the double-entry identity (every interval's changes
   * across all roots sum to zero, so the change in cash accounts is the
   * negated sum of every other account's change).
   */
  netChange: Record<string, string>;
  /** CCE balance at period start (closing - netChange), per currency. */
  opening: Record<string, string>;
  /** CCE balance at period end, per currency. */
  closing: Record<string, string>;
  /** Per-interval activity/net series for charts. */
  intervals: CashFlowIntervalPoint[];
  /**
   * Accounts whose declared `cash-flow-role` was not a valid role (sorted by
   * account name). Empty for unannotated ledgers and for clean annotations.
   */
  invalidRoleValues: InvalidCashFlowRoleValue[];
  /**
   * True when at least one CCE member account was classified by the name
   * heuristics rather than a declared `cash-flow-role`. Gates the export's
   * inferred-cash-set disclosure (per-row sources live on `rows`).
   */
  hasHeuristicCashAccounts: boolean;
}

/**
 * Cash & cash equivalents heuristic. The patterns live in
 * `../config` (`CASH_EQUIVALENT_PATTERNS`) and are shared with the
 * Sankey's exclusion list (account-categorizer.ts) so both surfaces agree
 * on what counts as cash. This is a documented heuristic, not account
 * metadata — exports must disclose it.
 */
export function isCashEquivalentAccount(accountName: string): boolean {
  return isExcludedAccount(accountName);
}

/**
 * Classify a non-cash account into a cash-flow activity via
 * resolveCashFlowRole: a declared `cash-flow-role` (from `meta`) wins over
 * the name heuristics. Returns null for CCE accounts (they are the cash
 * being explained, never a row) and — heuristic only — for anything outside
 * the five roots. A declared activity role is honored verbatim.
 *
 * Signs (beancount credit-normal): the row amount is the inverse of the
 * account's change, so e.g. an Income credit (-5000) is a +5000 operating
 * inflow, and paying down a credit card (liability +200 toward zero) is a
 * -200 financing outflow.
 */
export function classifyCashFlowActivity(
  name: string,
  meta?: Record<string, unknown> | null,
  roots?: AccountRoots,
): CashFlowActivity | null {
  if (!name) return null;

  // A renamed root (Revenus) is read as its type (Income) (w4/1022).
  const accountName = accountAsRootType(name, roots);
  const prefix = accountName.split(":")[0] as CashFlowRoot;
  const heuristicActivity = CASH_FLOW_ACTIVITY_BY_ROOT[prefix] ?? null;
  if (heuristicActivity === null) return null;

  const { role } = resolveCashFlowRole(accountName, meta);
  return role === "cash" ? null : role;
}

const ZERO_DECIMAL = /^[+-]?0+(?:\.0+)?$/;

function isZeroDecimal(value: string): boolean {
  return ZERO_DECIMAL.test(value.trim());
}

function isZeroAmounts(amounts: Record<string, string>): boolean {
  return Object.values(amounts).every((amount) => isZeroDecimal(amount));
}

/**
 * Beancount accepts each transaction within a tolerance (half a cent for
 * two-decimal amounts), so at-cost movements over an interval carry small
 * residuals that the ledger itself books to `Equity:Conversions` only at the
 * end of a clamped period (w0/022). An interval's residual is tolerated up to
 * that half-cent per contributing account change; a valuation difference —
 * the 60 USD w4/198 guards against — stays far outside it.
 */
const BALANCING_TOLERANCE_PER_CHANGE = 0.005;

function postingsInUnit(
  changes: Record<string, unknown>[],
  unit: string,
): number {
  return changes.filter((change) => {
    const value = change[unit];
    return typeof value === "string" && !isZeroDecimal(value);
  }).length;
}

/** `|residual| <= 0.005 * count`, compared exactly on decimal strings. */
function withinBalancingTolerance(residual: string, count: number): boolean {
  if (isZeroDecimal(residual)) return true;
  const match = /^[+-]?(\d+)(?:\.(\d+))?$/.exec(residual.trim());
  if (!match) return false;
  const [, whole, fraction = ""] = match;
  const scale = Math.max(fraction.length, 3);
  const magnitude = BigInt(whole + fraction.padEnd(scale, "0"));
  const bound =
    BigInt(Math.round(BALANCING_TOLERANCE_PER_CHANGE * 1000) * count) *
    10n ** BigInt(scale - 3);
  return magnitude <= bound;
}

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

/** Balance-record subtraction with exact decimal arithmetic. */
export function subtractBalanceRecords(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): Record<string, string> {
  return sumBalanceRecords([left, invertBalanceRecord(right)]);
}

type CashSource = "declared" | "heuristic" | null;

/**
 * How an account is cash, or `null` when it is not, given its parent's
 * membership. A declared role decides for the account itself; otherwise the
 * account is cash when a cash ancestor's membership carries down or its own
 * name heuristic matches.
 */
function cashSourceOf(
  account: string,
  inherited: CashSource,
  accountMeta?: AccountMetaMap,
  roots?: AccountRoots,
): CashSource {
  const resolution = resolveCashFlowRole(
    accountAsRootType(account, roots),
    accountMeta?.get(account),
  );
  const isCash =
    resolution.source === "declared"
      ? resolution.role === "cash"
      : inherited !== null || resolution.role === "cash";
  if (!isCash) return null;
  return resolution.source === "declared"
    ? "declared"
    : (inherited ?? "heuristic");
}

/**
 * Every cash & cash-equivalent account the ledger defines — the keys of its
 * `toAccountMetaMap`, one per `open` directive — by the same rule as
 * `collectCashAccounts`, but without a report's closing hierarchy: a filter
 * can leave that hierarchy without any cash account at all (w4/m56). Closed
 * accounts count, and an ancestor without an `open` directive resolves by its
 * name, as its hierarchy node does.
 */
export function cashAccountMembership(
  accountMeta: AccountMetaMap,
  roots?: AccountRoots,
): string[] {
  return [...accountMeta.keys()]
    .filter((account) => isCashAccountByMembership(account, accountMeta, roots))
    .sort();
}

/**
 * Whether one account counts as cash, by the same declared, ancestor and
 * name rules `collectCashAccounts` snapshots with. The row loop gates on
 * this — not on the account's direct role — so a cash-matching ancestor's
 * inherited membership keeps a nested leaf out of the rows, exactly as it
 * keeps it in the closing balance. A leaf that explicitly declares a
 * non-cash role resolves non-cash here too, so the declaration still pulls
 * it out of the subtree and into its activity.
 */
export function isCashAccountByMembership(
  account: string,
  accountMeta?: AccountMetaMap,
  roots?: AccountRoots,
): boolean {
  const parts = account.split(":");
  if (accountAsRootType(parts[0]!, roots) !== "Assets") return false;
  let source: CashSource = null;
  for (let depth = 2; depth <= parts.length; depth += 1) {
    const name = parts.slice(0, depth).join(":");
    source = cashSourceOf(name, source, accountMeta, roots);
  }
  return source !== null;
}

/**
 * Collect the cash & equivalents accounts from the closing assets hierarchy,
 * with their rollup balances. Roles resolve per leaf account: a declared
 * `cash-flow-role` (via `accountMeta`) always decides for that account;
 * without a declaration, a cash-matching ancestor's heuristic membership
 * carries down the whole subtree (the pre-declaration wholesale behavior, so
 * nested cash accounts are never double-counted), and otherwise the account's
 * own name heuristic decides. This lets a declared activity role pull one
 * account (e.g. a CD) out of a cash-matching subtree, and keeps the snapshot
 * source honest when the leaf itself declared `"cash"`.
 */
export function collectCashAccounts(
  assetsHierarchy: SerializableTreeNode,
  accountMeta?: AccountMetaMap,
  roots?: AccountRoots,
): CashAccountSnapshot[] {
  const snapshots: CashAccountSnapshot[] = [];

  const visit = (
    node: SerializableTreeNode,
    inheritedCash: CashSource,
  ): void => {
    const cashSource = cashSourceOf(
      node.account,
      inheritedCash,
      accountMeta,
      roots,
    );

    const children = node.children as unknown as SerializableTreeNode[];
    if (children.length > 0) {
      children.forEach((child) => visit(child, cashSource));
      return;
    }
    if (cashSource === null) {
      return;
    }
    const balance = node.balanceChildren ?? node.balance;
    if (balance && Object.keys(balance).length > 0) {
      snapshots.push({
        account: node.account,
        balance,
        roleSource: cashSource,
      });
    }
  };

  (assetsHierarchy.children as unknown as SerializableTreeNode[]).forEach(
    (child) => visit(child, null),
  );
  return snapshots;
}

interface ActivityBucket {
  /** account -> accumulated signed changes + how the activity was resolved */
  accountDeltas: Map<
    string,
    {
      changes: Record<string, unknown>[];
      roleSource: RoleResolution["source"];
    }
  >;
}

/**
 * Build the direct-method cash flow statement from per-interval account
 * changes across all five roots plus the closing CCE balances.
 *
 * Roles (CCE membership + activity section) resolve through
 * resolveCashFlowRole: a declared `cash-flow-role` on the account's `open`
 * directive (passed in via `accountMeta`) wins; accounts without annotations
 * resolve by the config heuristics exactly as before.
 *
 * Transfers between cash accounts net to zero by construction: they touch
 * only CCE accounts, which never appear as rows, and they do not change the
 * CCE total — so they are never counted as inflow or outflow.
 */
export function buildCashFlowStatement(input: {
  intervals: IntervalAccountChanges[];
  closingCashAccounts: CashAccountSnapshot[];
  primaryCurrency: string;
  accountMeta?: AccountMetaMap;
  /** The ledger's root names; English when omitted (w4/1022). */
  roots?: AccountRoots;
}): CashFlowStatement {
  // Valuation can change security movements without changing actual cash.
  // Check every interval and unit independently before deriving cash from
  // non-cash activity; discrepancies in different chart points cannot cancel.
  input.intervals.forEach((interval) => {
    const changes = Object.values(interval.accountChanges);
    const differences = sumBalanceRecords(changes);
    const beyondTolerance = Object.fromEntries(
      Object.entries(differences).filter(
        ([unit, residual]) =>
          !withinBalancingTolerance(residual, postingsInUnit(changes, unit)),
      ),
    );
    if (!isZeroAmounts(beyondTolerance)) {
      throw new CashFlowReconciliationError(interval.date, beyondTolerance);
    }
  });

  const buckets: Record<CashFlowActivity, ActivityBucket> = {
    operating: { accountDeltas: new Map() },
    investing: { accountDeltas: new Map() },
    financing: { accountDeltas: new Map() },
  };
  const intervalPoints: CashFlowIntervalPoint[] = [];

  input.intervals.forEach((interval) => {
    const perActivity: Record<CashFlowActivity, Record<string, unknown>[]> = {
      operating: [],
      investing: [],
      financing: [],
    };

    // Interval totals are direct postings per exact account — parent and child
    // rows are independent, so count every key once (do not drop parents).
    Object.keys(interval.accountChanges).forEach((account) => {
      const meta = input.accountMeta?.get(account);
      // Same exclusions as classifyCashFlowActivity (a root outside the five
      // beancount roots is heuristic-only excluded; "cash" is never a row),
      // but resolving the role once since the row also records its source.
      const typed = accountAsRootType(account, input.roots);
      const prefix = typed.split(":")[0] as CashFlowRoot;
      if ((CASH_FLOW_ACTIVITY_BY_ROOT[prefix] ?? null) === null) return;
      // Membership gates rows: an inherited-cash leaf counts in closing, so
      // it must not also read as an investing row. Declared non-cash leaves
      // resolve non-cash above too, so their rows survive.
      if (isCashAccountByMembership(account, input.accountMeta, input.roots))
        return;
      const { role, source } = resolveCashFlowRole(typed, meta);
      if (role === "cash") return;
      const activity = role;
      const change = interval.accountChanges[account];
      // Row amounts are the inverse of the account's change.
      const cashImpact = invertBalanceRecord(change);
      const entry = buckets[activity].accountDeltas.get(account) ?? {
        changes: [],
        roleSource: source,
      };
      if (entry.changes.length === 0) {
        buckets[activity].accountDeltas.set(account, entry);
      }
      entry.changes.push(change);
      perActivity[activity].push(cashImpact);
    });

    const activities = Object.fromEntries(
      CASH_FLOW_ACTIVITIES.map((activity) => [
        activity,
        sumBalanceRecords(perActivity[activity]),
      ]),
    ) as Record<CashFlowActivity, Record<string, string>>;
    intervalPoints.push({
      date: interval.date,
      activities,
      net: sumBalanceRecords(Object.values(activities)),
    });
  });

  const rows: CashFlowRow[] = [];
  const totals = Object.fromEntries(
    CASH_FLOW_ACTIVITIES.map((activity) => {
      const bucket = buckets[activity];
      const activityRows: CashFlowRow[] = [];
      bucket.accountDeltas.forEach((entry, account) => {
        const delta = sumBalanceRecords(entry.changes);
        const amounts = Object.fromEntries(
          Object.entries(delta).map(([currency, value]) => [
            currency,
            invertDecimal(value),
          ]),
        );
        if (isZeroAmounts(amounts)) return;
        activityRows.push({
          accountPath: account,
          label: account.split(":").pop() || account,
          activity,
          roleSource: entry.roleSource,
          amounts,
        });
      });
      // Deterministic order: largest primary-currency magnitude first.
      // Floats are used for ordering only; amounts stay exact strings.
      activityRows.sort(
        (a, b) =>
          Math.abs(Number(b.amounts[input.primaryCurrency] ?? 0)) -
          Math.abs(Number(a.amounts[input.primaryCurrency] ?? 0)),
      );
      rows.push(...activityRows);
      return [
        activity,
        sumBalanceRecords(activityRows.map((row) => row.amounts)),
      ];
    }),
  ) as Record<CashFlowActivity, Record<string, string>>;

  const netChange = sumBalanceRecords(Object.values(totals));
  const closing = sumBalanceRecords(
    input.closingCashAccounts.map((snapshot) => snapshot.balance),
  );
  const opening = subtractBalanceRecords(closing, netChange);

  // Every annotated account whose declared value is not a valid role, so the
  // status panel can flag them even when the account had no period movement.
  const invalidRoleValues: InvalidCashFlowRoleValue[] = [];
  input.accountMeta?.forEach((meta, account) => {
    const { invalidValue } = resolveCashFlowRole(account, meta);
    if (invalidValue !== undefined) {
      invalidRoleValues.push({ account, value: invalidValue });
    }
  });
  invalidRoleValues.sort((a, b) => a.account.localeCompare(b.account));

  return {
    rows,
    totals,
    netChange,
    opening,
    closing,
    intervals: intervalPoints,
    invalidRoleValues,
    hasHeuristicCashAccounts: input.closingCashAccounts.some(
      (snapshot) => snapshot.roleSource === "heuristic",
    ),
  };
}
