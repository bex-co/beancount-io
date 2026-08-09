import { getBackendBase } from "@/common/lib/oauth/forward-to-backend";

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

export async function handleConsentPost({
  request,
}: {
  request: Request;
}): Promise<Response> {
  const uid = new URL(request.url).searchParams.get("uid") ?? "";
  const backendBase = getBackendBase();

  const body = await readBodyWithinLimit(request, MAX_CONSENT_BODY_BYTES);
  if (body === null) {
    return new Response(null, { status: 413 });
  }

  const upstream = await fetch(
    `${backendBase}/api-gateway/oauth/interaction/${uid}/login`,
    {
      method: "POST",
      headers: {
        "content-type":
          request.headers.get("content-type") ??
          "application/x-www-form-urlencoded",
        cookie: request.headers.get("cookie") ?? "",
        ...(request.headers.get("authorization")
          ? { authorization: request.headers.get("authorization")! }
          : {}),
        "x-forwarded-host": new URL(request.url).host,
        "x-forwarded-proto": new URL(request.url).protocol.replace(":", ""),
      },
      body,
      redirect: "manual",
    },
  );

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
