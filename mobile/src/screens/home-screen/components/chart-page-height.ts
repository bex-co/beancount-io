/**
 * Height of one Home chart page: the chart's variable-height header (value +
 * change, which wraps onto extra lines at larger text sizes) plus the
 * fixed-height plot below it.
 *
 * The pager needs a bounded height, so the card used to hard-code 240 against a
 * 170pt plot — 70pt for the header, which is not enough the moment the headline
 * amount wraps. This derives the height from the measured header instead, and
 * stays at the hard-coded value until a measurement arrives so the skeleton and
 * the first painted frame are the same size as before.
 *
 * Import-free so the unit-test runner can load it under plain Node.
 */
export function chartPageHeight(
  measuredHeaderHeight: number | null,
  chartHeight: number,
  fallbackHeight: number,
): number {
  if (
    measuredHeaderHeight === null ||
    !Number.isFinite(measuredHeaderHeight) ||
    measuredHeaderHeight <= 0
  ) {
    return fallbackHeight;
  }
  // Never below the designed height: at the default text size the header is
  // shorter than the 70pt the old constant allowed for, and shrinking the card
  // would change a layout that is not broken.
  return Math.max(
    fallbackHeight,
    Math.ceil(measuredHeaderHeight + chartHeight),
  );
}
