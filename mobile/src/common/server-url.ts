import { defaultServerUrl } from "@/config";

export const OFFICIAL_SERVER_URL = "https://beancount.io/";

export type ServerUrlErrorCode =
  "empty" | "invalid" | "credentials" | "query" | "insecure";

export type ServerUrlValidation =
  { ok: true; url: string } | { ok: false; code: ServerUrlErrorCode };

type ServerUrlOptions = {
  allowInsecureLocalhost?: boolean;
};

const localhostNames = new Set(["localhost", "127.0.0.1", "::1"]);

export function allowsInsecureLocalhost(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

function isLocalhost(hostname: string): boolean {
  return localhostNames.has(hostname.toLowerCase());
}

/**
 * Validate a base URL rather than an API endpoint. A pathname is intentional:
 * reverse proxies commonly serve Beancount.io below a path prefix.
 */
export function validateServerUrl(
  input: string,
  options: ServerUrlOptions = {},
): ServerUrlValidation {
  const candidate = input.trim();
  if (!candidate) {
    return { ok: false, code: "empty" };
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, code: "invalid" };
  }

  if (
    !parsed.hostname ||
    (parsed.protocol !== "https:" && parsed.protocol !== "http:")
  ) {
    return { ok: false, code: "invalid" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, code: "credentials" };
  }

  if (parsed.search || parsed.hash) {
    return { ok: false, code: "query" };
  }

  const allowHttp = options.allowInsecureLocalhost ?? allowsInsecureLocalhost();
  if (
    parsed.protocol === "http:" &&
    !(allowHttp && isLocalhost(parsed.hostname))
  ) {
    return { ok: false, code: "insecure" };
  }

  parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/`;
  return { ok: true, url: parsed.toString() };
}

export function defaultRuntimeServerUrl(): string {
  const configured = validateServerUrl(defaultServerUrl, {
    allowInsecureLocalhost: allowsInsecureLocalhost(),
  });
  return configured.ok ? configured.url : OFFICIAL_SERVER_URL;
}

export function endpointFor(serverUrl: string, path: string): string {
  return new URL(path.replace(/^\/+/, ""), serverUrl).toString();
}

export type ServerConnectionResult =
  | { kind: "connected" }
  | { kind: "invalid"; code: ServerUrlErrorCode }
  | { kind: "timeout" }
  | { kind: "unreachable" }
  | { kind: "incompatible" };

const HEALTH_QUERY = "query ServerHealth { health }";
const CONNECTION_TIMEOUT_MS = 8_000;

/**
 * A small contract probe for the exact public GraphQL surface the mobile app
 * needs. It is deliberately advisory: people may save a valid server while
 * offline or before joining their VPN.
 */
export async function testServerConnection(
  input: string,
  timeoutMs: number = CONNECTION_TIMEOUT_MS,
): Promise<ServerConnectionResult> {
  const validation = validateServerUrl(input);
  if (!validation.ok) {
    return { kind: "invalid", code: validation.code };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpointFor(validation.url, "api-gateway/"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: HEALTH_QUERY }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { kind: "incompatible" };
    }

    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "data" in body &&
      typeof body.data === "object" &&
      body.data !== null &&
      "health" in body.data &&
      body.data.health === "OK"
    ) {
      return { kind: "connected" };
    }
    return { kind: "incompatible" };
  } catch {
    return controller.signal.aborted
      ? { kind: "timeout" }
      : { kind: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}
