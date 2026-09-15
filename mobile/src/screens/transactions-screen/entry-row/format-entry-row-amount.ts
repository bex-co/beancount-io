/**
 * The signed amount a transaction row shows: `+` for money in, `-` for money
 * out, and unsigned when the entry has no direction (a zero, or a transfer
 * between two cash accounts).
 *
 * `text` is the unsigned figure from `formatAmount`, so the sign is added here,
 * at the row, the way the transaction detail hero adds it. Without it a
 * negative entry read exactly like a positive one, and the rows under a
 * merchant stopped adding up to the total shown above them.
 */
export function formatEntryRowAmount(text: string, value: number): string {
  if (value > 0) return `+${text}`;
  if (value < 0) return `-${text}`;
  return text;
}
