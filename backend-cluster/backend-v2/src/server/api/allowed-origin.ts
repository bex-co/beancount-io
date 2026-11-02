/**
 * The one rule for which browser origins the gateway trusts: any
 * `beancount.io` host (apex or subdomain, so a sibling subdomain such as the
 * repository host counts as trusted), and `localhost` / `127.0.0.1` on any
 * port. The CORS middleware answers response headers from it and the MCP route
 * answers 403 from it (ADR 0007 D12), so the two can never disagree.
 *
 * `EXTRA_ALLOWED_ORIGINS` (comma-separated, exact origins such as
 * `https://app.example.com`) adds hosts outside `beancount.io`, for a
 * deployment whose dashboard lives on another domain (e.g. the bex target).
 */
function extraAllowedOrigins(): string[] {
  return (process.env.EXTRA_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string): boolean {
  if (extraAllowedOrigins().includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "beancount.io" ||
      hostname.endsWith(".beancount.io") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}
