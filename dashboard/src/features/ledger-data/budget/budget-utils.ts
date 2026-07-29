import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import type {
  BudgetEntry,
  BudgetGroup,
  BudgetHistoryEntry,
  BudgetValue,
} from "./types";

interface ParsedBudgetAmount {
  value: number;
  currency: string;
}

interface BudgetFields extends ParsedBudgetAmount {
  account: string;
  interval: string;
  amount: string;
}

export function parseBudgetAmount(amount: string): ParsedBudgetAmount {
  const [number = "0", currency = ""] = amount.trim().split(/\s+/);
  const value = Number.parseFloat(number);
  return { value: Number.isNaN(value) ? 0 : value, currency };
}

function getBudgetFields(entry: BudgetEntry): BudgetFields | null {
  const account = typeof entry.values[0] === "string" ? entry.values[0] : "";
  const interval = typeof entry.values[1] === "string" ? entry.values[1] : "";
  const amountRaw = entry.values[2];

  if (
    !account ||
    !interval ||
    !amountRaw ||
    typeof amountRaw !== "object" ||
    !("number" in amountRaw)
  ) {
    return null;
  }

  const value = Number.parseFloat(String((amountRaw as BudgetValue).number));
  const currency = String((amountRaw as BudgetValue).currency ?? "");
  if (Number.isNaN(value) || !currency) return null;

  return {
    account,
    interval,
    value,
    currency,
    amount: `${(amountRaw as BudgetValue).number} ${currency}`,
  };
}

/**
 * Fava keeps one budget history per account and currency. A newer directive
 * replaces the previous directive for that pair, even when its cadence changes.
 */
export function groupBudgetEntries(
  entries: BudgetEntry[],
  activeDate = format(new Date(), "yyyy-MM-dd"),
): BudgetGroup[] {
  const groups = new Map<
    string,
    Array<{ entry: BudgetEntry; fields: BudgetFields }>
  >();

  for (const entry of entries) {
    const fields = getBudgetFields(entry);
    if (!fields) continue;
    const key = `${fields.account}::${fields.currency}`;
    const group = groups.get(key) ?? [];
    group.push({ entry, fields });
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map((groupEntries) => {
      const sorted = [...groupEntries].sort((a, b) =>
        a.entry.date.localeCompare(b.entry.date),
      );
      const current =
        [...sorted].reverse().find(({ entry }) => entry.date <= activeDate) ??
        sorted[0];

      return {
        account: current.fields.account,
        interval: current.fields.interval,
        currency: current.fields.currency,
        amount: current.fields.amount,
        entry_hash: current.entry.entry_hash,
        budgetHistory: sorted.map(({ entry, fields }) => ({
          date: entry.date,
          interval: fields.interval,
          amount: fields.amount,
          entry_hash: entry.entry_hash,
        })),
      };
    })
    .sort(
      (a, b) =>
        a.account.localeCompare(b.account) ||
        a.currency.localeCompare(b.currency),
    );
}

function normalizeInterval(interval: string): string {
  const normalized = interval.toLowerCase();
  return normalized === "daily" ? "day" : normalized.replace(/ly$/, "");
}

function getIntervalStart(date: Date, interval: string): Date {
  switch (normalizeInterval(interval)) {
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date, { weekStartsOn: 1 });
    case "quarter":
      return startOfQuarter(date);
    case "year":
      return startOfYear(date);
    default:
      return startOfMonth(date);
  }
}

function getNextIntervalStart(date: Date, interval: string): Date {
  switch (normalizeInterval(interval)) {
    case "day":
      return addDays(getIntervalStart(date, interval), 1);
    case "week":
      return addWeeks(getIntervalStart(date, interval), 1);
    case "quarter":
      return addQuarters(getIntervalStart(date, interval), 1);
    case "year":
      return addYears(getIntervalStart(date, interval), 1);
    default:
      return addMonths(getIntervalStart(date, interval), 1);
  }
}

function getDaysInBudgetPeriod(date: Date, interval: string): number {
  return differenceInCalendarDays(
    getNextIntervalStart(date, interval),
    getIntervalStart(date, interval),
  );
}

/**
 * Convert the active directives to the chart's interval. This mirrors Fava's
 * daily-equivalent calculation and correctly handles changes mid-period.
 */
export function calculateBudgetForInterval(
  intervalEnd: string,
  chartInterval: string,
  history: BudgetHistoryEntry[],
): number {
  const end = parseISO(intervalEnd);
  const start = getIntervalStart(end, chartInterval);
  const ordered = [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ ...entry, ...parseBudgetAmount(entry.amount) }));

  let activeIndex = -1;
  let total = 0;

  for (let day = start; day <= end; day = addDays(day, 1)) {
    const date = format(day, "yyyy-MM-dd");
    while (
      activeIndex + 1 < ordered.length &&
      ordered[activeIndex + 1].date <= date
    ) {
      activeIndex += 1;
    }

    const active = ordered[activeIndex];
    if (!active) continue;
    total += active.value / getDaysInBudgetPeriod(day, active.interval);
  }

  return total;
}
