import {
  isJournalTransaction,
  JournalDirectiveType,
} from "../../journal-screen/types";

export type SpendingCompare = {
  thisMonth: number;
  lastMonth: number;
  thisMonthKey: string;
  lastMonthKey: string;
};

/** Format a year + 1-based month as a "YYYY-MM" key. */
function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Sum of Expenses-account posting amounts (spending) for a transaction in the active currency. */
function expenseTotal(entry: JournalDirectiveType, currency: string): number {
  if (!isJournalTransaction(entry)) {
    return 0;
  }
  let total = 0;
  for (const posting of entry.postings ?? []) {
    const units = posting.units;
    if (!units || units.currency !== currency) {
      continue;
    }
    if (!posting.account.startsWith("Expenses")) {
      continue;
    }
    const amount = Number(units.number);
    if (!isNaN(amount)) {
      total += amount;
    }
  }
  return total;
}

/**
 * Total spending (Expenses postings) for the current month vs. the previous
 * month, derived client-side from journal transactions in the active currency.
 *
 * NOTE (backend gap): there is no expenses-only monthly time series in the API
 * today — `homeCharts` returns net profit (income − expenses) and
 * `accountHierarchy` is a current snapshot. This is an honest, clearly-labelled
 * interim computation; a proper per-month expenses series should come from a
 * backend/schema change. `referenceDate` is injectable for deterministic tests.
 */
export function selectSpendingCompare(
  entries: JournalDirectiveType[],
  currency: string,
  referenceDate: Date = new Date(),
): SpendingCompare {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1; // 1-based
  const thisMonthKey = toMonthKey(year, month);
  const lastMonthKey =
    month === 1 ? toMonthKey(year - 1, 12) : toMonthKey(year, month - 1);

  let thisMonth = 0;
  let lastMonth = 0;

  for (const entry of entries) {
    const key = (entry.date ?? "").slice(0, 7);
    if (key !== thisMonthKey && key !== lastMonthKey) {
      continue;
    }
    const spent = expenseTotal(entry, currency);
    if (key === thisMonthKey) {
      thisMonth += spent;
    } else {
      lastMonth += spent;
    }
  }

  return { thisMonth, lastMonth, thisMonthKey, lastMonthKey };
}
