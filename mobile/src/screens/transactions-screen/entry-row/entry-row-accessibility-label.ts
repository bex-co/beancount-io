/**
 * Accessible name for a tappable transaction/journal row.
 * Omits decorative icon glyphs; includes payee/narration, amount, and pending.
 */
export function entryRowAccessibilityLabel(options: {
  name: string;
  amountStr: string | null;
  isPending: boolean;
  pendingLabel?: string;
}): string {
  const parts = [options.name];
  if (options.amountStr) {
    parts.push(options.amountStr);
  }
  if (options.isPending) {
    parts.push(options.pendingLabel ?? "Pending");
  }
  return parts.join(", ");
}
