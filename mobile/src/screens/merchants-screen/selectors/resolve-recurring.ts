/**
 * Resolve detection vs. a manual override into the verdict the UI shows.
 * Override always wins; absence falls through to detection. Free of `@/`
 * imports so jest-lite can require it.
 */

import type { Cadence, RecurrenceVerdict } from "./detect-recurrence";

export type RecurringOverride = "recurring" | "notRecurring";

/**
 * What the directory / merchant view treat as "this merchant is recurring".
 * Manual mark without a detectable cadence surfaces as `irregular`.
 */
export type ResolvedCadence = Cadence | "irregular";

export interface ResolvedRecurring {
  isRecurring: boolean;
  /** Present when recurring — from detection, or `"irregular"` when only marked. */
  cadence: ResolvedCadence | null;
  detection: RecurrenceVerdict | null;
  /** Where the yes/no came from. */
  source: "override" | "detection" | "none";
}

export function resolveRecurringVerdict(
  detection: RecurrenceVerdict | null,
  override: RecurringOverride | null,
): ResolvedRecurring {
  if (override === "recurring") {
    return {
      isRecurring: true,
      cadence: detection?.cadence ?? "irregular",
      detection,
      source: "override",
    };
  }
  if (override === "notRecurring") {
    return {
      isRecurring: false,
      cadence: null,
      detection,
      source: "override",
    };
  }
  if (detection) {
    return {
      isRecurring: true,
      cadence: detection.cadence,
      detection,
      source: "detection",
    };
  }
  return {
    isRecurring: false,
    cadence: null,
    detection: null,
    source: "none",
  };
}
