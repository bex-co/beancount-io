/**
 * Windowed per-payee series for recurrence detection: map `queryShell` rows into
 * `Map<payee, SeriesPoint[]>`, summing same-day same-currency amounts so a
 * multi-posting transaction is one event.
 *
 * Free of `@/` value imports so the jest-lite runner can require it.
 */

import type { SeriesPoint } from "./detect-recurrence";
import {
  asNumber,
  asString,
  columnIndex,
  type QueryResultTableLike,
} from "./bql-table";

/**
 * How far back the series statement looks. ~37 months fits three yearly events
 * plus margin (the milestone's "covers yearly cadence with margin" intent);
 * a literal 15 months only ever holds two Dec-31 samples, which fails the
 * ≥3-event eligibility rule. Validated 2026-08-20 against `open_ledger/minimax`.
 */
export const PAYEE_SERIES_WINDOW_MONTHS = 37;

/** Column aliases on the fixed series statement. */
const COL = {
  date: "txn_date",
  payee: "payee",
  amount: "amount",
  currency: "currency",
} as const;

/**
 * Fixed app-authored BQL returning one posting row of (date, payee, amount,
 * currency) for Expenses/Income legs only — balance-sheet counterparts would
 * cancel signed amounts on the same day. Cutoff is interpolated by the app;
 * never shown to the user (see `.pm/DO_NOT_DO.md:18` / m35 README).
 *
 * Validated 2026-08-20 against live `queryShell` on `open_ledger/minimax`
 * (aliases `txn_date`/`amount` work; `account ~ '^Expenses' OR '^Income'`
 * filters dual legs; Decimal amounts arrive as strings).
 */
export function buildPayeeSeriesBql(cutoffDate: string): string {
  return (
    "SELECT date as txn_date, payee, number as amount, currency " +
    "WHERE payee != '' " +
    "AND (account ~ '^Expenses' OR account ~ '^Income') " +
    `AND date >= ${cutoffDate}`
  );
}

/**
 * Shift a ledger `YYYY-MM-DD` by `months` (negative = past). Day-of-month is
 * preserved when valid; otherwise clamped to the target month's last day so
 * Jan 31 − 1 month → Dec 31, not an invalid date.
 */
export function shiftLedgerMonths(
  isoDate: string,
  months: number,
): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const zeroBased = month - 1 + months;
  const nextYear = year + Math.floor(zeroBased / 12);
  const nextMonth = (((zeroBased % 12) + 12) % 12) + 1;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  const nextDay = Math.min(day, lastDay);
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
}

/** Cutoff date for the series window ending on `today`. */
export function payeeSeriesCutoff(today: string): string | null {
  return shiftLedgerMonths(today, -PAYEE_SERIES_WINDOW_MONTHS);
}

/**
 * Map a series table into per-payee points. Columns resolved by name; null /
 * unparseable cells skipped; same (payee, date, currency) amounts summed.
 */
export function mapPayeeSeries(
  table: QueryResultTableLike | null | undefined,
): Map<string, SeriesPoint[]> {
  const result = new Map<string, SeriesPoint[]>();
  if (!table?.types || !table.rows) {
    return result;
  }

  const dateIdx = columnIndex(table.types, COL.date);
  const payeeIdx = columnIndex(table.types, COL.payee);
  const amountIdx = columnIndex(table.types, COL.amount);
  const currencyIdx = columnIndex(table.types, COL.currency);
  if (dateIdx < 0 || payeeIdx < 0 || amountIdx < 0 || currencyIdx < 0) {
    return result;
  }

  /** payee → `${date}\0${currency}` → summed amount */
  const sums = new Map<string, Map<string, number>>();

  for (const row of table.rows) {
    if (!Array.isArray(row)) {
      continue;
    }
    const payee = asString(row[payeeIdx]);
    const date = asString(row[dateIdx]);
    const currency = asString(row[currencyIdx]);
    const amount = asNumber(row[amountIdx]);
    if (!payee || !date || !currency || amount === null) {
      continue;
    }
    let forPayee = sums.get(payee);
    if (!forPayee) {
      forPayee = new Map();
      sums.set(payee, forPayee);
    }
    const key = `${date}\0${currency}`;
    forPayee.set(key, (forPayee.get(key) ?? 0) + amount);
  }

  for (const [payee, byKey] of sums) {
    const points: SeriesPoint[] = [];
    for (const [key, amount] of byKey) {
      const sep = key.indexOf("\0");
      const date = key.slice(0, sep);
      const currency = key.slice(sep + 1);
      points.push({ date, currency, amount });
    }
    points.sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) {
        return byDate;
      }
      return a.currency.localeCompare(b.currency);
    });
    result.set(payee, points);
  }

  return result;
}
