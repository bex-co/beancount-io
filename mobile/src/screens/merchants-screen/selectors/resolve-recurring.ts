/**
 * Resolve detection vs. a manual override into the verdict the UI shows.
 * Override always wins; absence falls through to detection. Free of `@/`
 * imports so jest-lite can require it.
 */

import type { Cadence, RecurrenceVerdict } from "./detect-recurrence";
import { shiftLedgerMonths } from "./payee-series";

export type RecurringOverride = "recurring" | "notRecurring";

/**
 * What the directory / merchant view treat as "this merchant is recurring".
 * A manual mark without a detectable cadence surfaces as `irregular` when the
 * history was long enough to analyse, and as `unknown` when it was too short
 * to tell: two identical monthly payments are not irregular (w0/039). It is
 * `inactive` when the payee's payments all predate the series window, which
 * holds none of them (w21/617).
 */
export type ResolvedCadence = Cadence | "irregular" | "unknown" | "inactive";

/** A yearly payee's gap plus a month: a longer silence has ended, whatever the window holds. */
const RECENT_PAYMENT_MONTHS = 13;

/**
 * Whether a payee's last payment is too old to count as recent, so a series
 * too short to analyse is down to the payee stopping, not to a new ledger: a
 * gym paid monthly from 2019 to 2023 read "Not enough history" beside "54
 * transactions", also when its last payments sat just inside the series window
 * (w21/617, w21/662).
 */
export function endedBeforeSeriesWindow(
  lastDate: string | null | undefined,
  today: string,
): boolean {
  const cutoff = shiftLedgerMonths(today, -RECENT_PAYMENT_MONTHS);
  return Boolean(lastDate) && cutoff !== null && lastDate! < cutoff;
}

export interface ResolvedRecurring {
  isRecurring: boolean;
  /** Present when recurring — from detection, or `"irregular"`/`"unknown"` when only marked. */
  cadence: ResolvedCadence | null;
  detection: RecurrenceVerdict | null;
  /** Where the yes/no came from. */
  source: "override" | "detection" | "none";
}

export function resolveRecurringVerdict(
  detection: RecurrenceVerdict | null,
  override: RecurringOverride | null,
  /** The payee's series had enough dates to analyse (`hasEnoughHistory`). */
  enoughHistory: boolean,
  /** The payee's payments all predate the series window (`endedBeforeSeriesWindow`). */
  endedBeforeWindow = false,
): ResolvedRecurring {
  if (override === "recurring") {
    return {
      isRecurring: true,
      cadence:
        detection?.cadence ??
        (enoughHistory
          ? "irregular"
          : endedBeforeWindow
            ? "inactive"
            : "unknown"),
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
