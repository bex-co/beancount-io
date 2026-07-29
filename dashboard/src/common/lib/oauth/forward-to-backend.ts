export function getBackendBase(): string {
  const sseApiUrl =
    import.meta.env.VITE_API_URL ?? "http://localhost:4104/api-gateway/";
  return new URL(sseApiUrl).origin;
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
