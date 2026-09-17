/**
 * Parser for the forwarded-context envelope backend-v2 sends with every ledger
 * call: one header of comma-separated `key=value` pairs. The format and the
 * reasoning behind it are ADR 016; the rules that must be seen at this edit
 * site:
 *
 * - **Everything parsed here is untrusted.** backend-v2 accepts an inbound
 *   `X-Request-Id`, so any value may have been chosen by the caller. Never read
 *   one for authentication, authorization, or a limit decision — those arrive
 *   on the named channels `server/auth.ts` reads straight off the request
 *   (`Authorization`, `x-directive-limit-exempt`), and keeping them apart is
 *   what lets this service tell a backend-v2 decision from a caller's claim.
 * - `session-token` is the one credential it carries (ADR 016 §7), relayed to
 *   beancount.io and never verified here. It must never be logged.
 * - Unknown keys are kept and ignored, so a new field can ship without a
 *   lockstep deploy.
 */
export const FORWARDED_CONTEXT_HEADER = "x-bcio-context";

/**
 * Parser bounds. Every published DoS in this class of header — the
 * OpenTelemetry and Datadog baggage advisories — came from parsing an
 * unbounded attacker-supplied value, always on the extract side. The length is
 * checked before any splitting, so a huge header costs one comparison.
 */
const MAX_HEADER_LENGTH = 8192;
const MAX_ENTRIES = 32;
const MAX_KEY_LENGTH = 64;
/**
 * Sized for a credential, not a label: `session-token` carries the caller's
 * own token (ADR 016 §7), and a session JWT of backend-v2's shape measures
 * 220–248 characters.
 */
const MAX_VALUE_LENGTH = 2048;

const KEY_RE = /^[a-z][a-z0-9-]*$/u;
/**
 * Printable ASCII except `,`, the only character the grammar needs to reserve.
 * `=` is allowed: the split takes the first one, so a later one is just data
 * and an opaque value (base64 padding, say) survives intact. Control
 * characters are excluded because this value reaches log lines.
 */
const VALUE_RE = /^[\x20-\x2B\x2D-\x7E]*$/u;

/**
 * Parse the envelope into its entries, keeping only well-formed ones.
 *
 * Never throws and never reports: a malformed envelope is an upstream bug or an
 * attack, and in both cases the right behavior is to carry on with whatever
 * parsed. Entries past the limit are dropped rather than truncated, so a
 * partial value can never be mistaken for a whole one.
 *
 * `split(",", MAX_ENTRIES)` rather than a counter: the cap has to bound entries
 * *examined*, not entries accepted, or a header of separators costs a full scan
 * while the counter never moves.
 */
export function parseForwardedContext(
  raw: string | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!raw || raw.length > MAX_HEADER_LENGTH) return result;

  for (const entry of raw.split(",", MAX_ENTRIES)) {
    const separator = entry.indexOf("=");
    if (separator < 0) continue;
    const key = entry.slice(0, separator).trim();
    if (key.length > MAX_KEY_LENGTH || !KEY_RE.test(key)) continue;
    const value = entry.slice(separator + 1).trim();
    if (value.length > MAX_VALUE_LENGTH || !VALUE_RE.test(value)) continue;
    // First occurrence wins, so a duplicate key cannot overwrite it.
    if (key in result) continue;
    result[key] = value;
  }
  return result;
}
