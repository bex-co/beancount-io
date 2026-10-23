/**
 * What a row's flag badge says: a pending `!`, a forecast `#` (Fava's
 * forecast plugin writes its projected entries so), a pad's `P`, or any other
 * flag as written. A cleared entry (`*`) has none. Only `!` was marked, so a
 * forecast filled the Transactions tab with future "spending" that read as
 * booked (w21/746).
 */
export type EntryFlagBadge =
  | { kind: "pending" }
  | { kind: "forecast" }
  | { kind: "padding" }
  | { kind: "other"; flag: string };

export function entryFlagBadge(
  flag: string | undefined,
): EntryFlagBadge | null {
  switch (flag) {
    case undefined:
    case "":
    case "*":
      return null;
    case "!":
      return { kind: "pending" };
    case "#":
      return { kind: "forecast" };
    case "P":
      return { kind: "padding" };
    default:
      return { kind: "other", flag };
  }
}

/** What a flag badge says in words: Pending, Forecast, Pad, or the flag. */
export function entryFlagBadgeText(
  badge: EntryFlagBadge,
  labels: { pending: string; forecast: string; pad: string },
): string {
  switch (badge.kind) {
    case "pending":
      return labels.pending;
    case "forecast":
      return labels.forecast;
    case "padding":
      return labels.pad;
    default:
      return badge.flag;
  }
}
