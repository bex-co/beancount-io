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

/**
 * Creates a beforeLoad function that checks authentication using the root route context.
 * The root route's beforeLoad fetches userProfile once and passes it down via context,
 * so this function avoids duplicate network requests.
 */
export const requireAuth = (redirectPath?: string) => {
  return ({ context }: { context: { userProfile: unknown } }): void => {
    if (!context.userProfile) {
      throw redirect({
        to: "/auth/login",
        search: {
          next: redirectPath,
        },
      });
    }
  };
};
