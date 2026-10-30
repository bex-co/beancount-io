/**
 * The one rule for which browser origins the gateway trusts: any
 * `beancount.io` host (apex or subdomain, so a sibling subdomain such as the
 * repository host counts as trusted), and `localhost` / `127.0.0.1` on any
 * port. The CORS middleware answers response headers from it and the MCP route
 * answers 403 from it (ADR 0007 D12), so the two can never disagree.
 */
export function isAllowedOrigin(origin: string): boolean {
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
