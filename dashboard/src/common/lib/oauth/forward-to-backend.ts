import { serverConfig } from "@/config/config.server";
import { DASHBOARD_OAUTH_TRANSACTION_COOKIE } from "@/features/oauth/dashboard-oauth";

export function backendBaseFromApiUrl(apiUrl: string): string {
  const url = new URL(apiUrl);
  const marker = "/api-gateway";
  const markerIndex = url.pathname.lastIndexOf(marker);
  if (markerIndex === -1) {
    throw new Error("OAuth backend URL must contain /api-gateway");
  }
  const publicPrefix = url.pathname.slice(0, markerIndex).replace(/\/$/, "");
  return `${url.origin}${publicPrefix}`;
}

/**
 * The in-cluster backend address, never the public one.
 *
 * This must come from `config.server.ts` rather than the isomorphic `config`:
 * that module's values are baked in from `import.meta.env` for the browser, and
 * the SSR server dialling the backend over its own public URL hairpins through
 * the ingress it was served from — blocked outright on platforms that deny
 * pod->node egress, and simply the wrong container in a compose network.
 */
export function getBackendBase(): string {
  return backendBaseFromApiUrl(serverConfig.apiUrl);
}

/**
 * Keep the Dashboard's signed PKCE transaction at the Dashboard server
 * boundary. Backend-v2 needs the auth and oidc-provider cookies, but never the
 * verifier/state payload held by this cookie.
 */
function backendCookieHeader(value: string | null): string {
  return (value ?? "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => {
      const separator = cookie.indexOf("=");
      return (
        separator > 0 &&
        cookie.slice(0, separator) !== DASHBOARD_OAUTH_TRANSACTION_COOKIE
      );
    })
    .join("; ");
}

export async function forwardToBackend(
  request: Request,
  path: string,
): Promise<Response> {
  const backendBase = getBackendBase();
  const { host, protocol } = new URL(request.url);

  const upstream = await fetch(`${backendBase}${path}`, {
    headers: {
      "x-forwarded-host": host,
      "x-forwarded-proto": protocol.replace(":", ""),
    },
  });

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

const MAX_OAUTH_PROVIDER_BODY_BYTES = 1024 * 1024;

/**
 * Same-origin OAuth front door for browser/native/MCP clients. This keeps the
 * public issuer authoritative even when dashboard SSR and backend-v2 run in
 * separate containers or the issuer carries a path prefix.
 */
export async function proxyOAuthProviderRequest(
  request: Request,
): Promise<Response> {
  const publicUrl = new URL(request.url);
  const oauthMarker = "/api-gateway/oauth/";
  const oauthIndex = publicUrl.pathname.indexOf(oauthMarker);
  const backendPath =
    oauthIndex >= 0
      ? publicUrl.pathname.slice(oauthIndex)
      : publicUrl.pathname.startsWith("/.well-known/oauth-")
        ? publicUrl.pathname
        : undefined;
  if (!backendPath) return new Response("Not found", { status: 404 });

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await readBodyWithinLimit(request, MAX_OAUTH_PROVIDER_BODY_BYTES);
  if (body === null) return new Response(null, { status: 413 });

  const headers = new Headers({
    ...Object.fromEntries(
      ["accept", "content-type", "authorization"].flatMap((name) => {
        const value = request.headers.get(name);
        return value ? [[name, value] as const] : [];
      }),
    ),
    "x-forwarded-host": publicUrl.host,
    "x-forwarded-proto": publicUrl.protocol.replace(":", ""),
  });
  const cookie = backendCookieHeader(request.headers.get("cookie"));
  if (cookie) headers.set("cookie", cookie);
  const upstream = await fetch(
    `${getBackendBase()}${backendPath}${publicUrl.search}`,
    {
      method: request.method,
      headers,
      ...(body === undefined ? {} : { body }),
      redirect: "manual",
    },
  );

  const responseHeaders = new Headers();
  for (const name of [
    "cache-control",
    "content-type",
    "location",
    "pragma",
    "www-authenticate",
  ]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  const upstreamHeaders = upstream.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies =
    typeof upstreamHeaders.getSetCookie === "function"
      ? upstreamHeaders.getSetCookie()
      : [upstreamHeaders.get("set-cookie")].filter(
          (value): value is string => value !== null,
        );
  for (const cookie of setCookies) responseHeaders.append("set-cookie", cookie);

  return new Response(
    request.method === "HEAD" ? null : await upstream.arrayBuffer(),
    {
      status: upstream.status,
      headers: responseHeaders,
    },
  );
}

/** Same-origin browser API proxy, including streaming agent responses. */
export async function proxyApiGatewayRequest(
  request: Request,
): Promise<Response> {
  const publicUrl = new URL(request.url);
  const marker = "/api-gateway/";
  const markerIndex = publicUrl.pathname.indexOf(marker);
  if (markerIndex < 0) return new Response("Not found", { status: 404 });
  const backendPath = publicUrl.pathname.slice(markerIndex);

  const requestHeaders = new Headers(request.headers);
  for (const hopByHop of [
    "connection",
    "content-length",
    "host",
    "keep-alive",
    "transfer-encoding",
  ]) {
    requestHeaders.delete(hopByHop);
  }
  requestHeaders.set("x-forwarded-host", publicUrl.host);
  requestHeaders.set("x-forwarded-proto", publicUrl.protocol.replace(":", ""));
  const cookie = backendCookieHeader(request.headers.get("cookie"));
  if (cookie) requestHeaders.set("cookie", cookie);
  else requestHeaders.delete("cookie");
  const upstreamInit: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: requestHeaders,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
    upstreamInit.body = request.body;
    // Node's fetch requires duplex for a streaming request body. Forwarding
    // the stream avoids buffering uploads or long agent inputs in SSR memory.
    upstreamInit.duplex = "half";
  }
  const upstream = await fetch(
    `${getBackendBase()}${backendPath}${publicUrl.search}`,
    upstreamInit,
  );

  const responseHeaders = new Headers(upstream.headers);
  for (const hopByHop of [
    "connection",
    "content-length",
    "keep-alive",
    "transfer-encoding",
  ]) {
    responseHeaders.delete(hopByHop);
  }
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

// The consent form is a handful of small fields; capping the proxied body
// keeps an unauthenticated client from buffering arbitrary memory here.
const MAX_CONSENT_BODY_BYTES = 64 * 1024;

async function readBodyWithinLimit(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declared = Number(contentLength);
    if (!Number.isInteger(declared) || declared < 0 || declared > maxBytes) {
      return null;
    }
  }

  if (!request.body) {
    return "";
  }

  // Content-Length can be absent or wrong, so bound the actual stream too.
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/**
 * Proxies an OIDC interaction "login" POST (cookies, body, and any Set-Cookie
 * response headers preserved) to one of the backend's oidc-provider instances.
 * Mobile, MCP, identity, and first-party Dashboard consent routes share this
 * server boundary and differ only in which interaction endpoint they target.
 */
export async function proxyOauthInteractionLogin(
  request: Request,
  interactionLoginPath: string,
): Promise<Response> {
  const backendBase = getBackendBase();

  const body = await readBodyWithinLimit(request, MAX_CONSENT_BODY_BYTES);
  if (body === null) {
    return new Response(null, { status: 413 });
  }

  const upstream = await fetch(`${backendBase}${interactionLoginPath}`, {
    method: "POST",
    headers: {
      "content-type":
        request.headers.get("content-type") ??
        "application/x-www-form-urlencoded",
      cookie: backendCookieHeader(request.headers.get("cookie")),
      ...(request.headers.get("authorization")
        ? { authorization: request.headers.get("authorization")! }
        : {}),
      "x-forwarded-host": new URL(request.url).host,
      "x-forwarded-proto": new URL(request.url).protocol.replace(":", ""),
    },
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  const location = upstream.headers.get("location");
  if (location) responseHeaders.set("location", location);
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);
  responseHeaders.set("cache-control", "no-store");
  const setCookies =
    "getSetCookie" in upstream.headers
      ? (
          upstream.headers as unknown as {
            getSetCookie: () => string[];
          }
        ).getSetCookie()
      : [(upstream.headers as unknown as Headers).get("set-cookie")].filter(
          (c): c is string => c !== null,
        );
  for (const c of setCookies) responseHeaders.append("set-cookie", c);

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status || 303,
    headers: responseHeaders,
  });
}
