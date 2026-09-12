import { z } from "zod";

/** The four holdings groupings, in tab order. */
export const HOLDINGS_VIEWS = [
  "holdings",
  "by-account",
  "by-currency",
  "by-cost-currency",
] as const;

export type HoldingsView = (typeof HOLDINGS_VIEWS)[number];

export const DEFAULT_HOLDINGS_VIEW: HoldingsView = "holdings";

export interface HoldingsSearch {
  view: HoldingsView;
}

export function isHoldingsView(value: unknown): value is HoldingsView {
  return HOLDINGS_VIEWS.some((view) => view === value);
}

/**
 * The holdings page keeps its selected grouping in the URL so a drill-down into
 * an account plus browser Back returns to the same tab. Anything other than a
 * known view — a typo, an array, an injected value — silently becomes the
 * default grouping; the page must never fail to render over a search param.
 */
export const holdingsSearchSchema = z
  .object({ view: z.unknown().optional() })
  .transform(
    ({ view }): HoldingsSearch => ({
      view: isHoldingsView(view) ? view : DEFAULT_HOLDINGS_VIEW,
    }),
  );
