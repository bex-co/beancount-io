/**
 * Search-field box metrics, in an import-free module so both the component and
 * the unit-test runner can read them.
 *
 * Three screens size boxes from these numbers (the merchants sort button, the
 * account-picker loading placeholder, the merchants list skeleton) and must
 * track whatever the field itself does, or the search row stops lining up the
 * moment the user's text size changes.
 */

/** The field's box at the default text size. */
export const SEARCH_BAR_HEIGHT = 36;
export const SEARCH_BAR_RADIUS = 10;

/**
 * The field grows with the text, but not without limit: past this multiple the
 * box is taller than the content needs and starts crowding the list below it.
 * The inner `paddingVertical` keeps very large text off the border even then.
 */
const SEARCH_FIELD_MAX_SCALE = 2;

/** Breathing room above and below the typed text inside the field. */
export const SEARCH_FIELD_PADDING_VERTICAL = 4;

/**
 * Minimum height of the search field (and of anything aligned with it) at a
 * given Dynamic Type scale.
 *
 * Exactly `SEARCH_BAR_HEIGHT` at the default scale — and at every scale below
 * it, since the platform can report a scale under 1 for the smallest text
 * setting and the field must not shrink below its tap target.
 */
export function searchFieldHeight(fontScale: number | undefined): number {
  if (typeof fontScale !== "number" || !Number.isFinite(fontScale)) {
    return SEARCH_BAR_HEIGHT;
  }
  const scale = Math.min(Math.max(fontScale, 1), SEARCH_FIELD_MAX_SCALE);
  return Math.round(SEARCH_BAR_HEIGHT * scale);
}
