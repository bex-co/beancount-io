import { isZeroStatementAmount } from "@/features/reports/export/presentation";
import type { CashAccountSnapshot, InvalidCashFlowRoleValue } from "./model";

/** Structural subset of the generated LedgerAccountItem the panel needs. */
export interface AccountDirectiveLike {
  account: string;
  openedAt: string | null;
  closedAt: string | null;
  entryCount: number;
}

export interface CashAccountStatusRow {
  account: string;
  openedAt: string | null;
  closedAt: string | null;
  /** Closing balance per currency from the report's assets hierarchy. */
  balance: Record<string, unknown>;
  entryCount: number | null;
  /**
   * Raw `cash-flow-role` value from the account's open directive when it was
   * not a valid role — resolution fell back to the heuristic and the panel
   * shows an "unknown value, using default" note.
   */
  invalidRoleValue?: unknown;
}

/** True when every currency amount is an exact zero decimal. */
export function isZeroBalanceRecord(balance: Record<string, unknown>): boolean {
  const values = Object.values(balance);
  if (values.length === 0) return true;
  return values.every(
    (value) => typeof value === "string" && isZeroStatementAmount(value),
  );
}

/** Closed (has a closedAt directive) with a zero closing balance. */
export function isClosedZeroBalance(row: CashAccountStatusRow): boolean {
  return row.closedAt !== null && isZeroBalanceRecord(row.balance);
}

/**
 * Join the CCE accounts the statement counted (collectCashAccounts output)
 * with their account directives by account name. The snapshot drives the row
 * set — exactly the accounts role resolution included — and its closing
 * balance; the directive contributes status metadata. A missing directive
 * yields null status fields rather than a fabricated one.
 *
 * Accounts whose open directive carried an invalid `cash-flow-role` value
 * are flagged via `invalidRoleValue`; invalid-value accounts that are NOT
 * cash equivalents are appended as balance-less rows so the note is never
 * silently dropped (spec: nothing is silently accepted).
 */
export function joinCashAccountStatus(
  snapshots: CashAccountSnapshot[],
  directives: AccountDirectiveLike[],
  invalidRoleValues: InvalidCashFlowRoleValue[] = [],
): CashAccountStatusRow[] {
  const byAccount = new Map(directives.map((item) => [item.account, item]));
  const invalidByAccount = new Map(
    invalidRoleValues.map((item) => [item.account, item.value]),
  );
  const rows = snapshots.map((snapshot) => {
    const directive = byAccount.get(snapshot.account);
    const row: CashAccountStatusRow = {
      account: snapshot.account,
      openedAt: directive?.openedAt ?? null,
      closedAt: directive?.closedAt ?? null,
      balance: snapshot.balance,
      entryCount: directive?.entryCount ?? null,
    };
    if (invalidByAccount.has(snapshot.account)) {
      row.invalidRoleValue = invalidByAccount.get(snapshot.account);
    }
    return row;
  });

  const cashAccounts = new Set(snapshots.map((snapshot) => snapshot.account));
  invalidRoleValues.forEach(({ account, value }) => {
    if (cashAccounts.has(account)) return;
    const directive = byAccount.get(account);
    rows.push({
      account,
      openedAt: directive?.openedAt ?? null,
      closedAt: directive?.closedAt ?? null,
      balance: {},
      entryCount: directive?.entryCount ?? null,
      invalidRoleValue: value,
    });
  });

  return rows;
}

/**
 * Balance-sheet behavior: closed, zero-balance accounts are hidden unless
 * showClosedAccounts (fava option / panel toggle) is on.
 */
export function filterCashAccountStatus(
  rows: CashAccountStatusRow[],
  showClosedAccounts: boolean,
): CashAccountStatusRow[] {
  if (showClosedAccounts) return rows;
  return rows.filter((row) => !isClosedZeroBalance(row));
}
