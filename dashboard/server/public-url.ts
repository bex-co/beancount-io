import { defineHandler } from "nitro/h3";

const PATH = "/_internal/public-url";

/**
 * Tell a sibling service this deployment's public address.
 *
 * On a platform that assigns hostnames (bex), the dashboard is the one public
 * entry point and the platform tells it its own address in
 * `RENDER_EXTERNAL_URL`; the API cannot read that, and the address cannot be
 * written into the Blueprint because a second deployer is given a different
 * one. The API asks once at start (backend-v2 `scripts/resolve-public-url.js`,
 * wired by `PUBLIC_URL_FROM` in `bex.yaml`).
 *
 * Inert where `RENDER_EXTERNAL_URL` is unset: the handler returns without
 * touching the request and the app serves it as it always did. The address is
 * already public, so nothing here discloses anything new.
 */
export default defineHandler((event) => {
  if (event.url.pathname !== PATH) return;
  const url = process.env.RENDER_EXTERNAL_URL?.trim();
  if (!url) return;
  event.res.headers.set("content-type", "text/plain; charset=utf-8");
  event.res.headers.set("cache-control", "no-store");
  return url;
});
