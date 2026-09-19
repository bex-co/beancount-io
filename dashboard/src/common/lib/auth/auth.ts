import { redirect } from "@tanstack/react-router";

/** Origin used only to resolve a candidate path; never navigated to. */
const RESOLUTION_BASE = "https://placeholder.invalid";

/**
 * True when the candidate contains an ASCII control character. Browsers strip
 * these before resolving a URL, so "/\t/evil.example" resolves to
 * https://evil.example -- a prefix check alone cannot see that.
 *
 * Written as a scan rather than a regex because matching control characters is
 * exactly what the `no-control-regex` lint rule exists to flag.
 */
const hasControlCharacter = (value: string): boolean => {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
};

/** Percent-decoding layers a candidate path is checked through. */
const MAX_DECODE_DEPTH = 4;

/** The path portion of a URL reference: everything before `?` or `#`. */
const pathOf = (value: string): string => value.split(/[?#]/, 1)[0];

/**
 * Decodes each well-formed `%XX` escape to its byte, leaving malformed ones
 * alone, so a stray `%` can neither throw nor stop the checks below. Every
 * character that can move a path off origin is ASCII, so byte-wise decoding
 * sees them exactly as a decoding layer would.
 */
const decodePercentEscapes = (value: string): string =>
  value.replace(/%([0-9a-f]{2})/gi, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );

/**
 * The candidate's path as each further decoding layer would read it. The
 * continuation is emitted still encoded, so "/%09/evil.example" passes a check
 * of the value as received and becomes "/\t/evil.example" wherever it is
 * decoded once more. Only the path decides where a relative reference goes, so
 * an encoded newline inside a query string (a BQL deep link) is not an escape.
 * `null` means the path is still decoding after MAX_DECODE_DEPTH layers.
 */
const decodedPathLayers = (next: string): string[] | null => {
  const layers: string[] = [];
  let path = pathOf(next);
  for (let depth = 0; depth < MAX_DECODE_DEPTH; depth += 1) {
    const decoded = decodePercentEscapes(path);
    if (decoded === path) return layers;
    path = pathOf(decoded);
    layers.push(path);
  }
  return null;
};

/**
 * True unless the candidate is a relative path that stays on the placeholder
 * origin once the browser's own parsing resolves it.
 */
const leavesOrigin = (candidate: string): boolean => {
  if (!candidate.startsWith("/") || hasControlCharacter(candidate)) return true;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return true;

  let resolved: URL;
  try {
    resolved = new URL(candidate, RESOLUTION_BASE);
  } catch {
    return true;
  }
  return (
    resolved.origin !== RESOLUTION_BASE ||
    !resolved.pathname.startsWith("/") ||
    resolved.pathname.startsWith("//")
  );
};

/**
 * Guards against open redirects. Only same-origin relative paths survive:
 * absolute URLs ("https://evil.example"), protocol-relative paths
 * ("//evil.example"), backslash variants ("/\evil.example") and paths
 * obfuscated with control characters ("/\t/evil.example") are all rejected —
 * raw or percent-encoded ("/%09/evil.example", "/%5cevil.example",
 * "/%2509/evil.example"), since a later layer may decode the path again.
 *
 * The candidate is resolved against a fixed placeholder origin and accepted
 * only when it, and every decoding of its path, stays on that origin, so the
 * browser's own parsing decides what counts as relative rather than a list of
 * string prefixes. A hostile value is rejected, never repaired.
 */
export const getSafeRedirectPath = (
  next: string | undefined,
): string | undefined => {
  if (!next || leavesOrigin(next)) return undefined;
  const layers = decodedPathLayers(next);
  if (layers === null || layers.some(leavesOrigin)) return undefined;

  const resolved = new URL(next, RESOLUTION_BASE);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
};

type RequireAuthLocation = {
  pathname: string;
  searchStr?: string;
  hash?: string;
};

/**
 * A TanStack router location as a relative URL string.
 *
 * The delimiters are not symmetrical: `searchStr` keeps its leading `?`, but
 * the parsed `hash` has had its `#` sliced off (router-core builds its own
 * `href` from the raw hash and only then strips the delimiter for the exposed
 * field) — unlike `window.location.hash`, which keeps it. Concatenating the
 * three parts therefore glues the fragment onto the end of the query, or onto
 * the path when there is no query, so `?time=2016#overview` arrives as
 * `?time=2016overview`.
 */
export const toRelativeLocation = ({
  pathname,
  searchStr,
  hash,
}: RequireAuthLocation): string =>
  `${pathname}${searchStr ?? ""}${hash ? `#${hash}` : ""}`;

/**
 * Creates a beforeLoad function that checks authentication using the root route context.
 * The root route's beforeLoad fetches userProfile once and passes it down via context,
 * so this function avoids duplicate network requests.
 *
 * When unauthenticated, `next` prefers the requested location (path + search + hash)
 * so deep links like `/settings/api-keys` survive login. `fallbackPath` is used only
 * when the location cannot form a safe relative path.
 */
export const requireAuth = (fallbackPath?: string) => {
  return ({
    context,
    location,
  }: {
    context: { userProfile: unknown };
    location: RequireAuthLocation;
  }): void => {
    if (!context.userProfile) {
      const requested = getSafeRedirectPath(
        `${location.pathname}${location.searchStr ?? ""}${location.hash ?? ""}`,
      );
      throw redirect({
        to: "/auth/login",
        search: {
          next: requested ?? fallbackPath,
        },
      });
    }
  };
};
