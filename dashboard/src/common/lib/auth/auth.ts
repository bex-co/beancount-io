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

/**
 * Guards against open redirects. Only same-origin relative paths survive:
 * absolute URLs ("https://evil.example"), protocol-relative paths
 * ("//evil.example"), backslash variants ("/\evil.example") and paths
 * obfuscated with control characters ("/\t/evil.example") are all rejected.
 *
 * The candidate is resolved against a fixed placeholder origin and accepted
 * only when it stays on that origin, so the browser's own parsing decides what
 * counts as relative rather than a list of string prefixes.
 */
export const getSafeRedirectPath = (
  next: string | undefined,
): string | undefined => {
  if (!next || !next.startsWith("/")) return undefined;
  if (hasControlCharacter(next)) return undefined;
  if (next.startsWith("//") || next.startsWith("/\\")) return undefined;

  let resolved: URL;
  try {
    resolved = new URL(next, RESOLUTION_BASE);
  } catch {
    return undefined;
  }

  if (resolved.origin !== RESOLUTION_BASE) return undefined;
  if (
    !resolved.pathname.startsWith("/") ||
    resolved.pathname.startsWith("//")
  ) {
    return undefined;
  }

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
};

type RequireAuthLocation = {
  pathname: string;
  searchStr?: string;
  hash?: string;
};

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
