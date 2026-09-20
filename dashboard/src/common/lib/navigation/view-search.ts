import { z } from "zod";

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
 * Builds the `validateSearch` schema for a page whose selected view is held in
 * `?view=`. Compose it on the child route; the ledger filters stay on the
 * parent.
 */
export function createViewSearchSchema<T extends string>(
  views: readonly T[],
  fallback: T,
) {
  // `view` stays optional in the output: the default selection leaves the URL
  // clean, and nothing that links here has to name a view it does not care
  // about. The page applies `fallback` when it is absent or unrecognised.
  void fallback;
  return z
    .object({ view: z.unknown().optional() })
    .transform(({ view }): { view?: T } => ({
      view: isOneOfViews(views, view) ? view : undefined,
    }));
}
