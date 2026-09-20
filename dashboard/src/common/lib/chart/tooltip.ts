/**
 * Shared bounds for the HTML chart tooltips that carry long account paths.
 *
 * When a tooltip would overflow the right edge, ECharts flips it to
 * `x - width - gap` and only clamps that result when `confine` is set. On a
 * narrow canvas the flipped popup therefore lands at a negative x and its
 * leading text — the date, the account prefix — sits off screen with no page
 * scroll to reveal it. `confine` keeps the box inside the chart, and the width
 * cap with wrapping stops a long account path from being laid out wider than
 * the chart in the first place.
 *
 * Applied per consumer rather than to every chart's defaults: these are the
 * tooltips that were reproduced clipping.
 */
export const CONFINED_TOOLTIP = {
  confine: true,
  extraCssText:
    "max-width:min(17rem,calc(100vw - 2rem));white-space:normal;word-break:break-word;",
} as const;
