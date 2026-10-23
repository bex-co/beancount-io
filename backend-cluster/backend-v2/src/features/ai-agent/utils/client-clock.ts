/**
 * The caller's time zone, and so its today. The agent was told no date and no
 * zone, so "this month" was the model's guess, and an undated receipt was filed
 * under the server's UTC date: tomorrow in a US evening, yesterday in a New
 * Zealand morning (w21/856). Clients send an IANA zone name; the date follows
 * from it and the server's clock, so the two cannot disagree.
 */
export type ClientClock = {
  /** An IANA time zone name such as `America/Los_Angeles`. */
  timeZone: string;
  /** `YYYY-MM-DD` in that zone. */
  today: string;
};

/** The calendar day of `now` in `timeZone`, or null when the zone is unknown. */
export function localDate(now: Date, timeZone: string): string | null {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return null;
  }
}

/** The clock for a request's `timeZone` field, or undefined when absent or not a zone. */
export function parseClientClock(
  timeZone: unknown,
  now: Date = new Date(),
): ClientClock | undefined {
  if (typeof timeZone !== "string" || timeZone.length === 0) return undefined;
  if (timeZone.length > 64) return undefined;
  const today = localDate(now, timeZone);
  return today === null ? undefined : { timeZone, today };
}

/** The lines the agent's instructions carry about the date. */
export function clockInstructions(
  clock: ClientClock | undefined,
  now: Date = new Date(),
): string {
  if (clock) {
    return `## Today\nToday's date is ${clock.today} in the user's time zone (${clock.timeZone}). Resolve "today", "this month" and "last week" from it.`;
  }
  return `## Today\nToday's date is ${now.toISOString().slice(0, 10)} (UTC); the user's time zone is unknown.`;
}
