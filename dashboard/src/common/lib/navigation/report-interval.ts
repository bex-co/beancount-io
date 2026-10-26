import {
  DEFAULT_CHART_INTERVAL,
  type ChartInterval,
} from "@/common/types/chart";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { ledgerFilterLoaderDeps } from "@/common/lib/ledger-search-params";
import { parseIntervalSearch } from "./view-search";

export interface ReportLoaderDeps extends LedgerSearchParams {
  interval: ChartInterval;
}

/**
 * The shared filters plus the selected interval, so a report's server read
 * groups the same way as the page query it prefetches for (w4/m57).
 */
export function reportIntervalLoaderDeps(search: {
  interval?: unknown;
}): ReportLoaderDeps {
  return {
    ...ledgerFilterLoaderDeps(search),
    interval: parseIntervalSearch(search.interval) ?? DEFAULT_CHART_INTERVAL,
  };
}
