import { getBackendBase } from "@/common/lib/oauth/forward-to-backend";

export async function handleConsentPost({
  request,
}: {
  request: Request;
}): Promise<Response> {
  const uid = new URL(request.url).searchParams.get("uid") ?? "";
  const backendBase = getBackendBase();

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
      body: await request.text(),
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
