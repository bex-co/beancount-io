import {
  getBackendBase,
  interactionForwardHeaders,
} from "@/common/lib/oauth/forward-to-backend";

/**
 * Who is asking for consent, as the page shows it (ADR 019 D4).
 *
 * `redirect` is where the authorization code goes — the one thing a requester
 * cannot choose freely, so it is always shown. `clientName` is whatever the app
 * called itself and is displayed as such. `vouchedBy` is the domain publishing
 * a CIMD client's metadata.
 */
export type ConsentRequester = {
  redirect: string;
  clientName: string | null;
  vouchedBy: string | null;
  loopbackOnly: boolean;
};

/**
 * The redirect as a person should read it: the host for web redirects, and
 * scheme plus host for an app's private-use scheme (`cursor://anysphere.…`),
 * where the scheme is what identifies the app.
 */
function displayRedirect(redirectUri: string): string | null {
  try {
    const url = new URL(redirectUri);
    if (url.protocol === "http:" || url.protocol === "https:") return url.host;
    return url.host ? `${url.protocol}//${url.host}` : url.protocol;
  } catch {
    return null;
  }
}

/** Maps the backend's interaction details; null when they cannot identify the requester. */
export function toConsentRequester(details: unknown): ConsentRequester | null {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  const redirect =
    typeof d.redirect_uri === "string" ? displayRedirect(d.redirect_uri) : null;
  if (!redirect) return null;
  return {
    redirect,
    clientName:
      typeof d.client_name === "string" && d.client_name.trim()
        ? d.client_name.trim()
        : null,
    vouchedBy: typeof d.client_id_host === "string" ? d.client_id_host : null,
    loopbackOnly: d.loopback_only === true,
  };
}

/**
 * `GET /oauth/consent/requester?uid=…`. It lives under `/oauth/consent` because
 * oidc-provider scopes the interaction cookie to that path, so this is the one
 * place the browser sends it; the backend reads the interaction only with it.
 */
export async function handleConsentRequesterGet({
  request,
}: {
  request: Request;
}): Promise<Response> {
  const uid = new URL(request.url).searchParams.get("uid") ?? "";
  const upstream = await fetch(
    `${getBackendBase()}/api-gateway/oauth/interaction/${encodeURIComponent(uid)}`,
    { headers: interactionForwardHeaders(request) },
  ).catch(() => null);
  // A 200 with a non-JSON body (a proxy's error page) is as unidentified as a
  // failed request — it must not become a 500.
  const details =
    upstream?.ok === true ? await upstream.json().catch(() => null) : null;
  const requester = toConsentRequester(details);
  return Response.json(requester, {
    status: requester ? 200 : 404,
    headers: { "cache-control": "no-store" },
  });
}
