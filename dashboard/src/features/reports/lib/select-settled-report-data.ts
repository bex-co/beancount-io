/**
 * Financial report reads must not present retained Apollo `previousData` under
 * a newly selected conversion, interval, filter, or ledger. While the query is
 * loading, treat the view as pending and withhold settled results.
 */
export function selectSettledReportData<T>(
  loading: boolean,
  data: T | null | undefined,
): { pending: true } | { pending: false; data: T | undefined } {
  if (loading) {
    return { pending: true };
  }
  return { pending: false, data: data ?? undefined };
}
