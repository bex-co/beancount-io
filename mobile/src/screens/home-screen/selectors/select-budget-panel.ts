/**
 * Ranking for the Home budget panel. The panel has room for a few rows, so it
 * shows the budgets closest to (or past) their limit rather than the first few
 * alphabetically — the ones worth knowing about before you spend again.
 */
import { dropRoot } from "../../../common/account-util";
import { formatLedgerDate } from "../../../common/date-format";
import {
  formatMoneyWithCurrency,
  formatSignedMoneyWithCurrency,
} from "../../../common/number-utils";
import {
  groupDirection,
  budgetDisplayScale,
  calculateBudgetForIntervalExact,
} from "../../budget-screen/selectors/budget-selectors";
import { decimalOf, negateDecimal } from "../../../common/decimal-number";
import type {
  BudgetGroup,
  VarianceStatus,
} from "../../budget-screen/selectors/budget-selectors";
import { STATUS_LABEL_KEYS } from "../../budget-screen/selectors/budget-labels";
import { selectBudgetCardStats } from "../../budget-screen/selectors/select-budget-card-stats";
import { signed } from "../../budget-screen/selectors/signed-holding";
import { notInTotalNotes, type Holding } from "../../../common/balance-display";

export type BudgetPanelInput = {
  group: BudgetGroup;
  /**
   * Actual activity for the current period, or null when it hasn't loaded:
   * the ledger's decimal string where it has one, so 9007199254740993 keeps
   * its last digit (w4/1039).
   */
  actual: string | number | null;
  /** Last day of the period the actual covers. */
  periodEnd: string;
  /** The period's activity in other currencies, as the ledger signs it. */
  notInTotal?: Holding[];
};

export type BudgetPanelRow = {
  account: string;
  shortAccount: string;
  currency: string;
  /** Fraction digits the budget is recorded at (cents at least), for display. */
  scale: number;
  /** Budget for the current period, as a magnitude. */
  budget: number;
  /** Actual for the same period, sign-corrected to match. */
  actual: number;
  /** `budget` and `actual` as exact decimals, which the row shows. */
  budgetExact?: string;
  actualExact?: string;
  /**
   * Spend as a percentage of budget, clamped at 0. A budget of 0 has nothing
   * to divide by: 100 (a full meter) once anything is spent, else 0.
   */
  progressPercent: number;
  /** A budget of 0 or less, so `progressPercent` is no percentage to read out. */
  noBudget: boolean;
  /** Set when the budget is not yet in effect: nothing to judge (w21/101). */
  startsOn?: string;
  /** True when this budget is on the good side of its target. */
  favorable: boolean;
  /** Where the actual stands against the target; null when not yet in effect. */
  status: VarianceStatus | null;
  /** An income target, to be reached, rather than a spending cap. */
  income: boolean;
  /** Activity in other currencies the actual leaves out (w21/709). */
  notInTotal: Holding[];
  /** True when that activity could turn the status around: none is given. */
  unjudged: boolean;
};

/**
 * @param asOf - Today. A period still in progress is judged against its full
 *   target, as the web dashboard does (w21/994), and one not begun has none,
 *   as the Budget screen does, so the row and the screen agree (w21/076).
 */
export function selectBudgetPanelRows(
  inputs: BudgetPanelInput[],
  limit: number,
  asOf?: string,
  windowStart?: string,
): BudgetPanelRow[] {
  const ranked = inputs.map(({ group, actual, periodEnd, notInTotal = [] }) => {
    // Reuse the card's derivation so the two surfaces can't drift on the
    // favorability rules. It reads a series, so hand it the single period the
    // panel cares about, sign-corrected the way the card's series already is.
    const direction = groupDirection(group);
    const directed = (value: string) =>
      direction === 1 ? value : negateDecimal(value);
    const scale = budgetDisplayScale(group.budgetHistory);
    const actualExact = directed(
      typeof actual === "string" ? actual : decimalOf(actual ?? 0),
    );
    const budgetExact = directed(
      calculateBudgetForIntervalExact(
        periodEnd,
        group.interval,
        group.budgetHistory,
        asOf,
        windowStart,
      ),
    );
    const stats = selectBudgetCardStats(
      group,
      [
        {
          date: periodEnd,
          actual: Number(actualExact),
          actualExact,
          budget: Number(budgetExact),
          budgetExact,
          notInTotal: notInTotal.map((holding) => signed(holding, direction)),
        },
      ],
      asOf,
    );
    const spent = stats.actual ?? 0;
    const noBudget = stats.budget <= 0;
    // Whether the period has run its course. An income that arrives once (an
    // unpaid salary) is behind its target for most of a month, which is no miss
    // until the period is over (w21/377). Unknown when no day is given.
    const over = asOf === undefined || periodEnd <= asOf;
    if (stats.startsOn !== null) {
      return {
        over,
        row: {
          account: group.account,
          shortAccount: dropRoot(group.account),
          currency: group.currency,
          scale,
          budget: stats.budget,
          actual: spent,
          budgetExact: stats.budgetExact,
          actualExact: stats.actualExact ?? "0",
          progressPercent: 0,
          noBudget,
          favorable: true,
          status: null,
          income: direction === -1,
          startsOn: stats.startsOn,
          notInTotal: stats.notInTotal,
          unjudged: false,
        },
      };
    }

    return {
      over,
      row: {
        account: group.account,
        shortAccount: dropRoot(group.account),
        currency: group.currency,
        scale,
        budget: stats.budget,
        actual: spent,
        budgetExact: stats.budgetExact,
        actualExact: stats.actualExact ?? "0",
        progressPercent: stats.progressPercent ?? 0,
        noBudget,
        favorable: stats.favorable,
        status: stats.status,
        income: direction === -1,
        notInTotal: stats.notInTotal,
        unjudged: stats.unjudged,
      },
    };
  });

  // Most at risk first (w21/218). Utilization alone treated an income target
  // beaten at 150% as the biggest risk and hid a budget at 97% of its limit:
  //  4. a zero budget already spent past (it read "0% used", w21/076);
  //  3. anything off its target the wrong way, the bigger miss first (an
  //     expense over its cap, an income target behind once its period is over);
  //  2. spending closest to its cap;
  //  1.5 an income target behind with its period still running: it is not a
  //     miss yet, so it never outranks an expense near its cap (w21/377);
  //  1. income that met or beat its target: nothing to act on;
  //  0. a budget not yet in effect.
  // Ties break on account so the order is stable between renders rather than
  // depending on query completion order.
  const rank = ({
    row,
    over,
  }: {
    row: BudgetPanelRow;
    over: boolean;
  }): [number, number] =>
    row.startsOn !== undefined
      ? [0, 0]
      : !row.favorable && row.noBudget && row.actual > 0
        ? [4, 0]
        : !row.favorable && row.income && !over
          ? [1.5, Math.abs(row.progressPercent - 100)]
          : !row.favorable
            ? [3, Math.abs(row.progressPercent - 100)]
            : row.income
              ? [1, 0]
              : [2, row.progressPercent];
  return ranked
    .sort((a, b) => {
      const [tierA, scoreA] = rank(a);
      const [tierB, scoreB] = rank(b);
      return (
        tierB - tierA ||
        scoreB - scoreA ||
        a.row.account.localeCompare(b.row.account)
      );
    })
    .map(({ row }) => row)
    .slice(0, limit);
}

/**
 * The panel once every actuals read has settled. A read that failed with
 * nothing cached fails the whole panel: its row would read "$0.00 of
 * $500.00", a claim about spending the failed read cannot back (w21/080).
 */
export function settleBudgetPanel(
  results: { input: BudgetPanelInput; failed: boolean }[],
  limit: number,
  asOf?: string,
  windowStart?: string,
): { rows: BudgetPanelRow[]; failed: boolean } {
  if (results.some((result) => result.failed)) {
    return { rows: [], failed: true };
  }
  return {
    rows: selectBudgetPanelRows(
      results.map((result) => result.input),
      limit,
      asOf,
      windowStart,
    ),
    failed: false,
  };
}

/**
 * What a panel row announces beyond its account name.
 *
 * The row is one button wrapping the amounts and the meter, so an
 * `accessibilityLabel` on it collapses the subtree and hides every number a
 * sighted user reads. The label stays the account; this goes in
 * `accessibilityValue.text`, which VoiceOver speaks after the label — so it
 * repeats neither the account nor anything the label already says.
 *
 * Pure and string-only: the same `formatMoneyWithCurrency` the row renders, so
 * the spoken amounts cannot drift from the visible ones.
 */
/**
 * The percent a budget row speaks. Rounding to nearest said "100% used" for
 * $497.60 of $500 (under target) and for $502.00 (over it), and "0%" for $2:
 * under 100 it rounds down, over 100 it rounds up, and a small non-zero spend
 * is "<1", which a screen reader says as "less than 1 percent" (w21/597).
 */
export function spokenPercent(percent: number): number | string {
  if (percent > 0 && percent < 1) return "<1";
  if (Math.abs(percent - 100) < 1e-9) return 100;
  return percent < 100 ? Math.floor(percent) : Math.ceil(percent);
}

export function budgetPanelRowAccessibilityValue(
  row: BudgetPanelRow,
  t: (key: string, options?: Record<string, string | number>) => string,
  locale = "en",
): string {
  const [notInTotal] = notInTotalNotes(row.notInTotal, (key, params) =>
    t(key, params as Record<string, string>),
  );
  const judged =
    row.startsOn !== undefined
      ? t("budgetStartsOn", { date: formatLedgerDate(row.startsOn, locale) })
      : row.unjudged
        ? null
        : // The card's own wording: "Below target" over an income budget that
          // was beaten, or for a spend exactly on target, was wrong (w21/218).
          t(
            row.status !== null
              ? STATUS_LABEL_KEYS[row.status]
              : row.favorable
                ? "budgetBelowTarget"
                : "budgetAboveTarget",
          );
  // What the visible row says under its meter, spoken in the status's place
  // when there is no status (w21/709).
  const status = [judged, notInTotal]
    .filter((part) => part !== null && part !== undefined)
    .join(" · ");
  if (row.noBudget || row.startsOn !== undefined) {
    return t("budgetPanelRowValueNoBudget", {
      actual: formatSignedMoneyWithCurrency(
        row.actualExact ?? row.actual,
        row.currency,
        false,
        row.scale,
      ),
      budget: formatMoneyWithCurrency(
        row.budgetExact ?? row.budget,
        row.currency,
        row.scale,
      ),
      status,
    });
  }
  // An income target is reached, not used up: "111% used" read a salary
  // over its target as spending (w21/790).
  return t(row.income ? "budgetPanelRowValueIncome" : "budgetPanelRowValue", {
    actual: formatSignedMoneyWithCurrency(
      row.actualExact ?? row.actual,
      row.currency,
      false,
      row.scale,
    ),
    budget: formatMoneyWithCurrency(
      row.budgetExact ?? row.budget,
      row.currency,
      row.scale,
    ),
    // Whole percent: a spoken "73.4166 percent" is noise, and the meter it
    // describes is a bar, not a readout.
    percent: spokenPercent(row.progressPercent),
    status,
  });
}
