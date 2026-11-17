/**
 * The tooltip surface every chart shares: the app's popover radius, padding
 * and soft shadow. The app chart themes set it as their default; a tooltip
 * that brings its own `extraCssText` replaces the theme's, so it starts with
 * this string too.
 */
export const TOOLTIP_SURFACE_CSS =
  "border-radius:10px;padding:8px 12px;box-shadow:0 12px 32px -12px rgba(15,23,15,0.28);";

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
  extraCssText: `${TOOLTIP_SURFACE_CSS}max-width:min(17rem,calc(100vw - 2rem));white-space:normal;word-break:break-word;`,
} as const;
