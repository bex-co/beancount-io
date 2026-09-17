import { getRequestContext } from "@/shared/async-context";

/**
 * Serializer for the forwarded-context envelope on backend-v2 → ledger-v2
 * calls. The format and the reasoning behind it are ADR 016; the rules that
 * must be seen at this edit site:
 *
 * - Nothing here may be read for authorization at the far end — it is
 *   attacker-influenced, since this service accepts an inbound `X-Request-Id`.
 * - `session-token` is the one credential it may carry (ADR 016 §7), and it
 *   must never be logged.
 */
export const FORWARDED_CONTEXT_HEADER = "x-bcio-context";

/**
 * Mirrors the ledger service's parser bound; a longer value is dropped there,
 * so sending it would only cost bytes. Sized for a credential rather than a
 * label: a session JWT of this service's shape measures 220–248 characters.
 */
const MAX_VALUE_LENGTH = 2048;

/**
 * A request ID worth forwarding. The same shape the ledger service accepts —
 * anything else is dropped there and replaced with a fresh ID, so sending it
 * would only cost bytes. Restricting the charset also keeps a caller-supplied
 * value from carrying separators or control characters into a log line.
 */
const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/u;

/**
 * Characters a token may use and still survive the envelope grammar. A comma
 * is the entry separator and a control character would break a log line, so a
 * value containing either is omitted rather than corrupting the envelope.
 * Every credential this service issues — JWTs, `bcio_` keys, OAuth tokens —
 * is within this set.
 */
const TOKEN_RE = /^[\x21-\x2B\x2D-\x7E]+$/u;

/**
 * Serialize the current request's context for the next hop.
 *
 * Returns an empty object outside a request (a scheduler job, a script, a unit
 * test), so the header is absent rather than empty and the ledger service mints
 * its own ID.
 */
export function forwardedContextHeaders(): Record<string, string> {
  const context = getRequestContext();
  if (!context) return {};
  const entries: string[] = [];

  // Each guard below is load-bearing: the regexes bound the charset, and the
  // length check bounds the token, whose regex is unbounded.
  const { requestId, sessionToken } = context;
  if (REQUEST_ID_RE.test(requestId)) {
    entries.push(`request-id=${requestId}`);
  }
  if (
    sessionToken &&
    sessionToken.length <= MAX_VALUE_LENGTH &&
    TOKEN_RE.test(sessionToken)
  ) {
    entries.push(`session-token=${sessionToken}`);
  }

  return entries.length === 0
    ? {}
    : { [FORWARDED_CONTEXT_HEADER]: entries.join(",") };
}
