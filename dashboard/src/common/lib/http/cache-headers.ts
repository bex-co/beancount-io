/** Where Vite emits hashed build assets (`build.assetsDir`). */
const BUILD_ASSETS_PREFIX = "/lgassets/";

function withCacheControl(response: Response, value: string): Response {
  try {
    response.headers.set("Cache-Control", value);
    return response;
  } catch {
    // Some responses (redirects built by the platform) have immutable headers.
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", value);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

/**
 * Cache policy for server-rendered responses.
 *
 * Every deploy replaces the hashed build assets, so a page opened before the
 * deploy asks for files that are gone. Left without a policy, that 404 is
 * stored by the CDN and the browser for hours, and a normal reload — which
 * reuses fresh subresources — keeps replaying it. A missing build asset is
 * therefore never stored, and pages are always revalidated so a reload picks
 * up the current asset names.
 */
export function applyCacheHeaders(
  request: Request,
  response: Response,
): Response {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith(BUILD_ASSETS_PREFIX)) {
    return response.status === 404
      ? withCacheControl(response, "no-store")
      : response;
  }

  const isHtml = response.headers.get("Content-Type")?.includes("text/html");
  if (isHtml && !response.headers.has("Cache-Control")) {
    return withCacheControl(response, "no-cache");
  }
  return response;
}
