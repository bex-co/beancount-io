import Router from "@koa/router";
import { isMcpHandshakeRequest, mcpRateLimitPolicy } from "../mcp-rate-policy";
import { MCP_ENDPOINT_PATH, setMcpRoute } from "../mcp-route";
import {
  MCP_HANDSHAKE_OP_ID,
  MCP_TRANSPORT_OP_ID,
  clearRouteRateLimitPolicies,
  rateLimitOpIdFor,
} from "@/server/api/rate-limit";
import { requestOpId } from "@/server/api/rest-op-id";

/**
 * w2/014 — the mount owns the policy, and the op id is tied to the route.
 *
 * The limiter used to know that one hand-copied route string was MCP, that
 * MCP bodies are JSON-RPC, and which methods are ceremony. Renaming the route
 * would have re-charged the handshake with no test failing; this is that test.
 */

describe("the MCP mount's rate-limit policy", () => {
  afterEach(() => clearRouteRateLimitPolicies());

  it("charges handshake traffic to the handshake op and work to the transport op", () => {
    expect(
      mcpRateLimitPolicy({ jsonrpc: "2.0", method: "initialize", id: 1 }),
    ).toBe(MCP_HANDSHAKE_OP_ID);
    expect(
      mcpRateLimitPolicy({ jsonrpc: "2.0", method: "tools/call", id: 1 }),
    ).toBe(MCP_TRANSPORT_OP_ID);
  });

  it("registers itself under the op id of the path it actually mounts", () => {
    // The tie the note asked for: if the route moves and the budget key does
    // not, this fails rather than the handshake quietly re-joining the
    // session's budget.
    const router = new Router();
    setMcpRoute(
      router,
      {} as never,
      {} as never,
      (() => {
        throw new Error("not built in this test");
      }) as never,
    );

    expect(requestOpId(["POST"], MCP_ENDPOINT_PATH, "POST")).toBe(
      MCP_TRANSPORT_OP_ID,
    );
    expect(
      rateLimitOpIdFor(MCP_TRANSPORT_OP_ID, { method: "initialize" }),
    ).toBe(MCP_HANDSHAKE_OP_ID);
    expect(
      rateLimitOpIdFor(MCP_TRANSPORT_OP_ID, { method: "tools/call" }),
    ).toBe(MCP_TRANSPORT_OP_ID);
  });

  it.each([
    "initialize",
    "notifications/initialized",
    "tools/list",
    "resources/templates/list",
    "prompts/list",
    "ping",
  ])("treats %s as handshake traffic", (method) => {
    expect(isMcpHandshakeRequest({ jsonrpc: "2.0", method, id: 1 })).toBe(true);
  });

  it.each([
    "tools/call",
    "resources/read",
    // Enumerating ledgers and source files is real work; its list callbacks
    // charge the matching resource op.
    "resources/list",
    "prompts/get",
  ])("charges %s, which is work rather than handshake", (method) => {
    expect(isMcpHandshakeRequest({ jsonrpc: "2.0", method, id: 1 })).toBe(
      false,
    );
  });

  it("treats a batch as handshake only when every message in it is", () => {
    expect(
      isMcpHandshakeRequest([
        { method: "initialize" },
        { method: "tools/list" },
      ]),
    ).toBe(true);
    // A real call must not ride along inside a batch at the cheaper rate.
    expect(
      isMcpHandshakeRequest([
        { method: "initialize" },
        { method: "tools/call" },
      ]),
    ).toBe(false);
  });

  it("charges anything it cannot read", () => {
    expect(isMcpHandshakeRequest(undefined)).toBe(false);
    expect(isMcpHandshakeRequest([])).toBe(false);
    expect(isMcpHandshakeRequest("not json-rpc")).toBe(false);
    expect(mcpRateLimitPolicy("not json-rpc")).toBe(MCP_TRANSPORT_OP_ID);
  });
});
