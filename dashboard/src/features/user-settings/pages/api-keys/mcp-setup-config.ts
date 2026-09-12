import { useEffect, useState } from "react";
import { apiOriginFrom } from "@/common/lib/api-origin";
import { config } from "@/config/config";

/**
 * The client configuration a newcomer pastes into their MCP client
 * (w2/m29:t001).
 *
 * Pure string builders and the endpoint lookup, kept out of the component file
 * so the panel exports only components.
 */

/** The placeholder shown until the user has a key in hand. */
export const KEY_PLACEHOLDER = "bcio_your_token";

export const MCP_GUIDE_URL =
  "https://github.com/bex-co/beancount-io/blob/main/backend-cluster/backend-v2/docs/mcp.md";

/** The API's public origin, or this page's own when the URL is unusable. */
function apiOrigin(): string {
  try {
    return apiOriginFrom(new URL(config.apiUrl, window.location.origin).href);
  } catch {
    // A misconfigured `VITE_API_URL` must not blank the panel; the dashboard's
    // own origin is the right guess for a single-host deployment.
    return window.location.origin;
  }
}

export function claudeCodeCommand(endpoint: string, key: string): string {
  return `claude mcp add --transport http beancount ${endpoint} --header "Authorization: Bearer ${key}"`;
}

export function clientJson(endpoint: string, key: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        beancount: {
          type: "http",
          url: endpoint,
          headers: { Authorization: `Bearer ${key}` },
        },
      },
    },
    null,
    2,
  );
}

export function curlCommand(endpoint: string, key: string): string {
  return [
    `curl -sS ${endpoint} \\`,
    `  -H "Authorization: Bearer ${key}" \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -H 'Accept: application/json, text/event-stream' \\`,
    `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
  ].join("\n");
}

/**
 * Where this deployment serves MCP.
 *
 * Read from `/.well-known/mcp.json` rather than composed here, so a self-host
 * shows its own address: the manifest is the deployment's own answer, and
 * since w2/m29:t002 it derives that from the API origin rather than the
 * dashboard's. The derived value is only a fallback for when the manifest
 * cannot be fetched — it is the same string the manifest would return.
 */
export function useMcpEndpoint(): string {
  const fallback = `${apiOrigin()}/api-gateway/mcp`;
  const [endpoint, setEndpoint] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${apiOrigin()}/.well-known/mcp.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest: { endpoint?: string } | null) => {
        if (!cancelled && typeof manifest?.endpoint === "string") {
          setEndpoint(manifest.endpoint);
        }
      })
      .catch(() => {
        // Discovery is advisory: the derived fallback is already correct for
        // every deployment that serves the dashboard and API together.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return endpoint;
}
