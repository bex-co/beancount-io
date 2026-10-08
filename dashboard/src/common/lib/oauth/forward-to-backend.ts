import { serverConfig } from "@/config/config.server";

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

// The consent form is a handful of small fields; capping the proxied body
// keeps an unauthenticated client from buffering arbitrary memory here.
/**
 * The headers that let the backend resolve a forwarded OAuth interaction: the
 * browser's interaction cookie, and the public host and scheme it pins the
 * issuer from.
 */
export function interactionForwardHeaders(
  request: Request,
): Record<string, string> {
  const url = new URL(request.url);
  return {
    cookie: request.headers.get("cookie") ?? "",
    "x-forwarded-host": url.host,
    "x-forwarded-proto": url.protocol.replace(":", ""),
  };
}

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
 * response headers preserved) to one of the backend's oidc-provider instances —
 * shared by both the MCP consent page and the identity-login consent page,
 * which differ only in which interaction endpoint they target.
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
      ...interactionForwardHeaders(request),
      ...(request.headers.get("authorization")
        ? { authorization: request.headers.get("authorization")! }
        : {}),
    },
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  const location = upstream.headers.get("location");
  if (location) responseHeaders.set("location", location);
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

  return new Response(null, {
    status: upstream.status || 303,
    headers: responseHeaders,
  });
}
