import { CHART_INTERVALS, DEFAULT_CHART_INTERVAL } from "@/common/types/chart";
import { useUrlView } from "./use-url-view";

/**
 * A report's grouping interval, held in `?interval=` beside its selected
 * chart: a shared scope edit unmounts the page at the ledger layout boundary,
 * and an interval in page state came back Monthly after every one (w4/m57).
 */
export function useReportInterval(from: string) {
  return useUrlView(from, CHART_INTERVALS, DEFAULT_CHART_INTERVAL, "interval");
}
