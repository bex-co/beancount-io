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
 * Empty account reports may contain zero-filled chart points. Treat those the
 * same as empty arrays so a fresh ledger gets one designed state, not blank
 * chart cards.
 */
export function isAccountReportEmpty(
  report: AccountReportData | null | undefined,
): boolean {
  if (!report) return true;

  return [report.accountBalanceData, report.intervalTotalsData].every(
    (series) => !series?.some(hasNonZeroBalance),
  );
}
