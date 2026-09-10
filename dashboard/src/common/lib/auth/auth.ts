import { redirect } from "@tanstack/react-router";

/**
 * Guards against open redirects. Only same-origin relative paths survive:
 * absolute URLs ("https://evil.example"), protocol-relative paths
 * ("//evil.example") and backslash variants ("/\evil.example", which browsers
 * resolve to a different origin) are all rejected.
 */
export const getSafeRedirectPath = (
  next: string | undefined,
): string | undefined => {
  if (!next || !next.startsWith("/")) return undefined;
  if (next.startsWith("//") || next.startsWith("/\\")) return undefined;
  return next;
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
