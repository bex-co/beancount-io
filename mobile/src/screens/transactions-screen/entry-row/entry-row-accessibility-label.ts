/**
 * Accessible name for a tappable transaction/journal row.
 * Omits decorative icon glyphs; reads what the row shows: the name, its
 * narration line, the amount and its flag badge. The narration line and a
 * translated "Pending" were missing, so two rows told apart only by their
 * narration sounded the same and a German row said "Pending" (w21/140).
 */
export function entryRowAccessibilityLabel(options: {
  name: string;
  /** The row's second line, the narration under a payee; null when none. */
  secondary: string | null;
  amountStr: string | null;
  /** What the flag badge says ("Pending", "Forecast"); null without one. */
  flagLabel: string | null;
}): string {
  const parts = [options.name];
  if (options.secondary) {
    parts.push(options.secondary);
  }
  if (options.amountStr) {
    parts.push(options.amountStr);
  }
  if (options.flagLabel) {
    parts.push(options.flagLabel);
  }
  return parts.join(", ");
}
