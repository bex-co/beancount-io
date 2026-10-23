/** The y-domain a line chart scales its series to: [bottom, top]. */
export type Domain = readonly [number, number];

/**
 * The smallest span the domain covers, as a share of the series' magnitude.
 * Scaled to the move alone, −$12 on $2.5M, "(0.00%)" in the header, fell the
 * plot's full height, and +$0.01 on $15,000 rose it (w21/751). A move of this
 * share or more still fills the plot.
 */
const MIN_SPAN_RATIO = 0.0005;

/**
 * Padded y-domain for a series. The padding stops a flat-ish curve from
 * hugging the top and bottom edges of the plot. Its span is floored at
 * `MIN_SPAN_RATIO` of the series' magnitude, centred on the series, so a move
 * too small to read draws flat; an unmoved series keeps a tenth of its value
 * either side.
 */
export function computeDomain(values: number[]): Domain {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    const pad = Math.abs(max) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  const magnitude = Math.max(Math.abs(min), Math.abs(max));
  const span = Math.max(max - min, magnitude * MIN_SPAN_RATIO);
  const middle = (min + max) / 2;
  const pad = span * 0.1;
  return [middle - span / 2 - pad, middle + span / 2 + pad];
}
