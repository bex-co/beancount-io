/**
 * Whether earlier columns are clipped off the plot's start edge: the plot is
 * wider than its viewport and the scroll offset has moved past the start
 * (w21/1015). Charts open on the most recent periods, so a long range starts
 * out clipped; a range that fits, or one scrolled back to its start, shows no
 * cue.
 */
export function hasClippedStart(
  plotWidth: number,
  viewportWidth: number,
  offsetX: number,
): boolean {
  return viewportWidth > 0 && plotWidth > viewportWidth + 1 && offsetX > 1;
}

/**
 * Whether the plot was scrolled to its newest end for a viewport of
 * `viewportWidth` (w21/1018). A plot that fits is at its end too. When the
 * viewport width changes — a language switch re-derives the axis column — a
 * chart that was at its end is moved back to it; one the reader scrolled away
 * keeps its place.
 */
export function wasAtEnd(
  plotWidth: number,
  viewportWidth: number,
  offsetX: number,
): boolean {
  return offsetX >= plotWidth - viewportWidth - 1;
}
