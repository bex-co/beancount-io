type Dated = { date: string };
type Statement = {
  incomeData: Dated[];
  expensesData: Dated[];
  netProfitData: Dated[];
};

/** One series with this month's points replaced by the month-to-date read's. */
function replaceThisMonth<P extends Dated>(
  series: readonly P[],
  monthToDate: readonly P[],
  thisMonth: string,
): P[] {
  return [
    ...series.filter((point) => point.date.slice(0, 7) !== thisMonth),
    ...monthToDate.filter((point) => point.date.slice(0, 7) === thisMonth),
  ];
}

/**
 * The statement with the current month read to today. Reports charted whole
 * calendar months, so a bill pre-entered for later this month counted in
 * October's bar while Home's Spending stopped at today (w21/523). Last month
 * and earlier stay as the whole-ledger read had them. Until the month-to-date
 * read lands (`undefined`), the statement is returned as it came.
 */
export function withMonthToDateStatement<S extends Statement>(
  statement: S | undefined,
  monthToDate: S | undefined,
  today: string,
): S | undefined {
  if (!statement || !monthToDate) return statement;
  const thisMonth = today.slice(0, 7);
  return {
    ...statement,
    incomeData: replaceThisMonth(
      statement.incomeData,
      monthToDate.incomeData,
      thisMonth,
    ),
    expensesData: replaceThisMonth(
      statement.expensesData,
      monthToDate.expensesData,
      thisMonth,
    ),
    netProfitData: replaceThisMonth(
      statement.netProfitData,
      monthToDate.netProfitData,
      thisMonth,
    ),
  };
}

/**
 * Whether the current month is read to today. ALL counts everything the ledger
 * holds, later months included, so it keeps the whole month too: reading
 * October to today while charting a November entry dropped one pre-entered for
 * October 30 and kept the other (w21/671).
 */
export function readsMonthToDate(
  scheduledThisMonth: boolean,
  range: string,
): boolean {
  return scheduledThisMonth && range !== "ALL";
}
