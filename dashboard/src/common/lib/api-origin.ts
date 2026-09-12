/**
 * The API's public origin, derived from the configured gateway URL.
 *
 * One copy of "how do we turn `apiUrl` into a public origin", because the
 * answer depends on where the gateway is mounted: a deployment that changes
 * that path must not fix one caller and silently break another.
 *
 * Pure and client-safe — `forward-to-backend.ts` adds the server-only config
 * lookup on top, and the MCP setup panel uses it in the browser.
 */
export function apiOriginFrom(apiUrl: string): string {
  const url = new URL(apiUrl);
  const marker = "/api-gateway";
  const markerIndex = url.pathname.lastIndexOf(marker);
  if (markerIndex === -1) {
    throw new Error("API URL must contain /api-gateway");
  }
  const publicPrefix = url.pathname.slice(0, markerIndex).replace(/\/$/, "");
  return `${url.origin}${publicPrefix}`;
}
