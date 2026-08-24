import { defaultServerUrl } from "@/config";

export {
  allowsInsecureLocalhost,
  endpointFor,
  validateServerUrl,
  type ServerUrlErrorCode,
  type ServerUrlValidation,
} from "./server-url-validation";
import {
  allowsInsecureLocalhost,
  endpointFor,
  validateServerUrl,
  type ServerUrlErrorCode,
} from "./server-url-validation";
import { discoverOAuthServer } from "./oauth/discovery";

export const OFFICIAL_SERVER_URL = "https://beancount.io/";

export function defaultRuntimeServerUrl(): string {
  const configured = validateServerUrl(defaultServerUrl, {
    allowInsecureLocalhost: allowsInsecureLocalhost(),
  });
  return configured.ok ? configured.url : OFFICIAL_SERVER_URL;
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
    const [healthResult, oauthResult] = await Promise.allSettled([
      fetch(endpointFor(validation.url, "api-gateway/"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: HEALTH_QUERY }),
        signal: controller.signal,
      }),
      discoverOAuthServer(validation.url, fetch, controller.signal),
    ]);
    if (controller.signal.aborted) return { kind: "timeout" };
    if (healthResult.status === "rejected") return { kind: "unreachable" };
    if (oauthResult.status === "rejected") return { kind: "incompatible" };

    const response = healthResult.value;
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
