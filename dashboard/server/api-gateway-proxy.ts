import { defineHandler, proxyRequest } from "nitro/h3";

/**
 * Opt-in same-origin API: forward `/api-gateway/*` and `/.well-known/*` to the
 * backend so the
 * browser talks to the dashboard host alone.
 *
 * A deployment whose dashboard and API sit on hostnames with no shared parent
 * domain they own (a PaaS-assigned `*.example-paas.app` pair) cannot share the
 * sign-in cookie across them. Serving the API from the dashboard's own origin
 * needs no shared parent and no CORS.
 *
 * Inert unless API_PROXY_URL is set at runtime (e.g.
 * `http://beancount-api:4104`), so every other deployment, where the browser
 * reaches the API directly, is unchanged: the handler returns without
 * touching the request and the app serves it as before.
 */
/**
 * What the API serves on the public host: its own gateway, and the well-known
 * documents (OAuth and MCP discovery, app links), whose issuer is this host.
 * The docker deployment's Caddyfile routes the same two prefixes to the backend.
 */
const PROXIED_PREFIXES = ["/api-gateway/", "/.well-known/"];

export function isProxiedPath(pathname: string): boolean {
  return PROXIED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default defineHandler((event) => {
  const target = process.env.API_PROXY_URL?.trim();
  if (!target || !isProxiedPath(event.url.pathname)) return;

  const url = new URL(event.url.pathname + event.url.search, target);
  return proxyRequest(event, url.toString(), {
    headers: {
      "x-forwarded-host": event.url.host,
      "x-forwarded-proto":
        event.req.headers.get("x-forwarded-proto") ?? "https",
    },
  });
});
