import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpSetup } from "../mcp-setup";
import {
  claudeCodeCommand,
  clientJson,
  curlCommand,
} from "../mcp-setup-config";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/config/config", () => ({
  // A split-host deployment: the dashboard is served from one origin and the
  // API from another. This is the case the panel has to get right.
  config: { apiUrl: "https://api.example.test/api-gateway/" },
}));

/**
 * w2/m29:t001. The mint dialog used to show the plaintext and nothing else,
 * so the one screen where the key is ever visible was the one screen that did
 * not say what to do with it.
 */
describe("the MCP setup snippets", () => {
  const endpoint = "https://api.example.test/api-gateway/mcp";

  it("puts the endpoint and the key into the Claude Code command", () => {
    expect(claudeCodeCommand(endpoint, "bcio_abc")).toBe(
      `claude mcp add --transport http beancount ${endpoint} --header "Authorization: Bearer bcio_abc"`,
    );
  });

  it("emits client JSON a Cursor or Claude Desktop config can take verbatim", () => {
    expect(JSON.parse(clientJson(endpoint, "bcio_abc"))).toEqual({
      mcpServers: {
        beancount: {
          type: "http",
          url: endpoint,
          headers: { Authorization: "Bearer bcio_abc" },
        },
      },
    });
  });

  it("sends the curl probe to the same endpoint with both Accept types", () => {
    const command = curlCommand(endpoint, "bcio_abc");
    expect(command).toContain(endpoint);
    expect(command).toContain("Authorization: Bearer bcio_abc");
    // The endpoint refuses a request that does not accept both (ADR 0007).
    expect(command).toContain("application/json, text/event-stream");
  });
});

describe("McpSetup", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          endpoint: "https://discovered.example.test/api-gateway/mcp",
        }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
  });

  it("prefers the endpoint the deployment advertises over one it derives", async () => {
    render(<McpSetup token="bcio_minted" />);

    await waitFor(() => {
      expect(
        screen.getByText(/discovered\.example\.test/, { exact: false }),
      ).toBeTruthy();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.test/.well-known/mcp.json",
    );
  });

  it("falls back to the API origin when discovery is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    render(<McpSetup token="bcio_minted" />);

    // Derived from `config.apiUrl`, never the dashboard's own origin — those
    // are different hosts here, and only one of them serves MCP.
    expect(
      await screen.findByText(/api\.example\.test\/api-gateway\/mcp/, {
        exact: false,
      }),
    ).toBeTruthy();
  });

  it("fills in the minted key so the command is ready to run", async () => {
    render(<McpSetup token="bcio_minted" />);
    expect(
      await screen.findByText(/Bearer bcio_minted/, { exact: false }),
    ).toBeTruthy();
  });

  it("shows a placeholder rather than a stale key when there is none", async () => {
    // On the settings page the key is unrecoverable by then; the endpoint and
    // the shape of the config are not.
    render(<McpSetup />);
    expect(
      await screen.findByText(/Bearer bcio_your_token/, { exact: false }),
    ).toBeTruthy();
  });
});
