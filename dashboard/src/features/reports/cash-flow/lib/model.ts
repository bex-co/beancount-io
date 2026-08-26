import { isExcludedAccount } from "@/features/reports/overview/lib/account-categorizer";
import {
  invertDecimal,
  sumBalanceRecords,
} from "@/features/reports/export/model";
import { CASH_FLOW_ACTIVITY_BY_ROOT, type CashFlowRoot } from "../config";
import { resolveCashFlowRole, type RoleResolution } from "./role-resolver";
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
  accountName: string,
  meta?: Record<string, unknown> | null,
): CashFlowActivity | null {
  if (!accountName) return null;

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

/**
 * Interval totals may roll up parent accounts alongside their children; only
 * leaf accounts carry postings, so restrict to leaves to avoid
 * double-counting.
 */
function leafAccounts(accountChanges: Record<string, unknown>): string[] {
  return Object.keys(accountChanges).filter(
    (account) =>
      !Object.keys(accountChanges).some((other) =>
        other.startsWith(`${account}:`),
      ),
  );
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
): CashAccountSnapshot[] {
  const snapshots: CashAccountSnapshot[] = [];

  const visit = (
    node: SerializableTreeNode,
    inheritedCash: "declared" | "heuristic" | null,
  ): void => {
    const resolution = resolveCashFlowRole(
      node.account,
      accountMeta?.get(node.account),
    );
    // A declared role decides for this node; otherwise the account is cash
    // when a cash ancestor's membership carries down or its own name
    // heuristic matches.
    const isCash =
      resolution.source === "declared"
        ? resolution.role === "cash"
        : inheritedCash !== null || resolution.role === "cash";
    const cashSource: "declared" | "heuristic" | null = !isCash
      ? null
      : resolution.source === "declared"
        ? "declared"
        : (inheritedCash ?? "heuristic");

    const children = node.children as unknown as SerializableTreeNode[];
    if (children.length > 0) {
      children.forEach((child) => visit(child, cashSource));
      return;
    }
    if (!isCash) {
      return;
    }
    const balance = node.balanceChildren ?? node.balance;
    if (balance && Object.keys(balance).length > 0) {
      snapshots.push({
        account: node.account,
        balance,
        roleSource: cashSource ?? "heuristic",
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
}): CashFlowStatement {
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

    leafAccounts(interval.accountChanges).forEach((account) => {
      const meta = input.accountMeta?.get(account);
      // Same exclusions as classifyCashFlowActivity (a root outside the five
      // beancount roots is heuristic-only excluded; "cash" is never a row),
      // but resolving the role once since the row also records its source.
      const prefix = account.split(":")[0] as CashFlowRoot;
      if ((CASH_FLOW_ACTIVITY_BY_ROOT[prefix] ?? null) === null) return;
      const { role, source } = resolveCashFlowRole(account, meta);
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
