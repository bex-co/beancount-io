import { z } from "zod";
import { CHART_INTERVALS, type ChartInterval } from "@/common/types/chart";

/**
 * A report's selected view belongs in the URL.
 *
 * The ledger layout replaces its `Outlet` with a loading state whenever the
 * shared account/filter/time scope changes, which unmounts the page and takes
 * any `useState` with it — so a reader who picked a chart or a tab lost that
 * choice simply by editing the time filter. Holdings already solved this for
 * its grouping; this is the same contract, reusable.
 *
 * Anything other than a known view — a typo, an array, an injected value —
 * silently becomes the default. A page must never fail to render over a
 * search param.
 */
export function isOneOfViews<T extends string>(
  views: readonly T[],
  value: unknown,
): value is T {
  return views.some((view) => view === value);
}

/**
 * A report's grouping interval is view preference too, held in `?interval=`
 * so a shared scope edit keeps it (w4/m57). Absent or unknown means the
 * default, which leaves the URL clean.
 */
export function parseIntervalSearch(value: unknown): ChartInterval | undefined {
  return isOneOfViews(CHART_INTERVALS, value) ? value : undefined;
}

/**
 * Builds the `validateSearch` schema for a page whose selected view is held in
 * `?view=`, and, for a report with an interval selector, `?interval=`. Compose
 * it on the child route; the ledger filters stay on the parent.
 */
export function createViewSearchSchema<T extends string>(
  views: readonly T[],
  { interval = false }: { interval?: boolean } = {},
) {
  // Both stay optional in the output: the default selection leaves the URL
  // clean, and nothing that links here has to name a view it does not care
  // about. The page applies its default when either is absent or unrecognised.
  return z
    .object({ view: z.unknown().optional(), interval: z.unknown().optional() })
    .transform((search): { view?: T; interval?: ChartInterval } => ({
      view: isOneOfViews(views, search.view) ? search.view : undefined,
      ...(interval ? { interval: parseIntervalSearch(search.interval) } : {}),
    }));
}
