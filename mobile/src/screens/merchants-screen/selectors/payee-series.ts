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
  moneyRootsBqlFilter,
  type QueryResultTableLike,
} from "./bql-table";
import { utcDate } from "../../../common/calendar-date";

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
  account: "account",
  costNumber: "cost_number",
  costCurrency: "cost_currency",
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
export function buildPayeeSeriesBql(
  cutoffDate: string,
  roots?: { expenses?: string; income?: string },
): string {
  // Debited legs too, for a payee that is only ever a transfer (a card
  // payment, an ATM withdrawal); `mapPayeeSeries` uses them only for such a
  // payee (w21/173). Their cost, for one bought at cost (w21/711).
  return (
    "SELECT date as txn_date, payee, number as amount, currency, account, " +
    "cost_number, cost_currency " +
    "WHERE payee != '' " +
    `AND (${moneyRootsBqlFilter(roots)} OR number > 0) ` +
    `AND date >= ${cutoffDate}`
  );
}

/** Whether `account` sits under the ledger's Expenses or Income root. */
function isMoneyLeg(
  account: string,
  roots: { expenses?: string; income?: string },
): boolean {
  return [roots.expenses || "Expenses", roots.income || "Income"].some(
    (root) => account === root || account.startsWith(`${root}:`),
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
  const lastDay = utcDate(nextYear, nextMonth, 0).getUTCDate();
  const nextDay = Math.min(day, lastDay);
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
}

/** How many distinct days a `${date}\0${currency}` series has events on. */
function distinctDates(byKey: ReadonlyMap<string, number>): number {
  const dates = new Set<string>();
  for (const key of byKey.keys()) dates.add(key.slice(0, key.indexOf("\0")));
  return dates.size;
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
  roots: { expenses?: string; income?: string } = {},
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
  // Absent from older statements: every row is then a money leg.
  const accountIdx = columnIndex(table.types, COL.account);
  const costNumberIdx = columnIndex(table.types, COL.costNumber);
  const costCurrencyIdx = columnIndex(table.types, COL.costCurrency);

  /** payee → `${date}\0${currency}` → summed amount, Expenses/Income legs */
  const sums = new Map<string, Map<string, number>>();
  /** The same from debited transfer legs, for payees with no money legs. */
  const transfers = new Map<string, Map<string, number>>();

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
    const account = accountIdx < 0 ? null : asString(row[accountIdx]);
    const moneyLeg = account === null || isMoneyLeg(account, roots);
    const target = moneyLeg ? sums : transfers;
    let forPayee = target.get(payee);
    if (!forPayee) {
      forPayee = new Map();
      target.set(payee, forPayee);
    }
    // A transfer into a holding bought at cost (a monthly $500 into VTI) is
    // the money paid, not the shares: 1.5625 VTI read as "~1.5625 VTI"
    // (w21/711).
    const costNumber =
      moneyLeg || costNumberIdx < 0 ? null : asNumber(row[costNumberIdx]);
    const costCurrency =
      costNumber === null || costCurrencyIdx < 0
        ? null
        : asString(row[costCurrencyIdx]);
    const [value, unit] =
      costNumber !== null && costCurrency
        ? [amount * costNumber, costCurrency]
        : [amount, currency];
    const key = `${date}\0${unit}`;
    forPayee.set(key, (forPayee.get(key) ?? 0) + value);
  }

  // A payee whose events are mostly transfers reads its debited legs instead:
  // whichever of the two series has more distinct dates, ties going to the
  // money legs. Deciding on the mere presence of a money leg lost a whole
  // transfer series to one ATM fee (an Expenses leg) anywhere in the window
  // (w21/334).
  for (const [payee, byKey] of transfers) {
    const money = sums.get(payee);
    if (!money || distinctDates(byKey) > distinctDates(money)) {
      sums.set(payee, byKey);
    }
  }

  for (const [payee, byKey] of sums) {
    const points: SeriesPoint[] = [];
    for (const [key, amount] of byKey) {
      const sep = key.indexOf("\0");
      const date = key.slice(0, sep);
      const currency = key.slice(sep + 1);
      // Summed legs carry float noise (10.99 + 0.88 is 11.870000000000001).
      points.push({ date, currency, amount: Number(amount.toFixed(10)) });
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
