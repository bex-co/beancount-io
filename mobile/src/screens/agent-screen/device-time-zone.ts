/**
 * The device's IANA time zone, sent with every agent request so the agent knows
 * today's date where the user is, and files an undated receipt under it
 * (w21/856). Undefined when the runtime cannot say, which the server reads as
 * "unknown".
 */
export function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}
