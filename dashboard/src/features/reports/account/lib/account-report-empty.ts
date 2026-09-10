type BalancePoint = {
  balance: Record<string, unknown>;
};

type AccountReportData = {
  accountBalanceData?: BalancePoint[] | null;
  intervalTotalsData?: BalancePoint[] | null;
};

function hasNonZeroBalance(point: BalancePoint): boolean {
  return Object.values(point.balance).some((amount) => {
    const numeric = Number(amount);
    return Number.isFinite(numeric) && numeric !== 0;
  });
}

/**
 * Chart aggregates may be all zeros while the account still has journal
 * history (e.g. a repaid loan under yearly grouping). Use this only to decide
 * whether chart cards show a designed empty state — never to hide interval
 * controls or the independently loaded account journal.
 */
export function isAccountReportEmpty(
  report: AccountReportData | null | undefined,
): boolean {
  if (!report) return true;

  return [report.accountBalanceData, report.intervalTotalsData].every(
    (series) => !series?.some(hasNonZeroBalance),
  );
}
