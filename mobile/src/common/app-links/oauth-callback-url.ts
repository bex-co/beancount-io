/**
 * Pure helpers for app-link URL classification — kept free of Apollo so the
 * jest-lite runner can load them without ESM/CJS type friction.
 */

export function isOAuthCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Custom schemes: io.beancount.ios:/oauth/callback
    if (
      parsed.pathname === "/oauth/callback" ||
      parsed.pathname === "oauth/callback"
    ) {
      return true;
    }
    if (parsed.pathname.endsWith("/oauth/callback")) {
      return true;
    }
    return false;
  } catch {
    return /oauth\/callback/i.test(url);
  }
}
