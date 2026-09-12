import {
  MCP_HANDSHAKE_OP_ID,
  MCP_TRANSPORT_OP_ID,
} from "@/server/api/rate-limit";

/**
 * How this mount wants its requests charged (w2/014).
 *
 * The limiter used to know that one route string was MCP, that MCP bodies are
 * JSON-RPC, and which methods are ceremony — three facts about this feature
 * living in `server/rest/rate-limit-middleware.ts`. They live here now, where
 * JSON-RPC is already understood, and the limiter is back to "look up the op,
 * charge its budget".
 */

/**
 * JSON-RPC methods that are handshake traffic, not work.
 *
 * A client must `initialize`, acknowledge, and list what is available before
 * it can call anything — that is protocol overhead the caller did not choose,
 * and charging a session's budget for it means a client that merely connects
 * has already spent part of its allowance (w2/m28). Everything these methods
 * can lead to is metered where it happens: `tools/call` and `resources/read`
 * each charge their own op. `resources/list` is deliberately absent — it
 * enumerates ledgers and source files, which is real work, and its list
 * callbacks charge the matching resource op.
 */
const MCP_HANDSHAKE_METHODS: ReadonlySet<string> = new Set([
  "initialize",
  "notifications/initialized",
  "tools/list",
  "resources/templates/list",
  // Prompt discovery is the same shape as `tools/list`: a static enumeration
  // that reaches no service (w2/008). `prompts/get` is deliberately absent —
  // it is the caller choosing to do something, even if the something it
  // returns is text.
  "prompts/list",
  "ping",
]);

/**
 * Whether this MCP request is handshake traffic only.
 *
 * A JSON-RPC batch qualifies only when *every* member is a handshake method,
 * so a real call cannot ride along inside one at the cheaper rate.
 */
export function isMcpHandshakeRequest(body: unknown): boolean {
  const messages = Array.isArray(body) ? body : [body];
  if (messages.length === 0) return false;
  return messages.every(
    (message) =>
      typeof message === "object" &&
      message !== null &&
      MCP_HANDSHAKE_METHODS.has(
        (message as { method?: unknown }).method as string,
      ),
  );
}

/**
 * The op a given MCP request spends.
 *
 * Handshake traffic moves to its own generous bucket rather than being waved
 * through: the previous exemption was total, so an unlimited stream of
 * `{"method":"ping"}` cost a credential nothing at the one limiter that is
 * meant to be unbypassable.
 */
export function mcpRateLimitPolicy(body: unknown): string {
  return isMcpHandshakeRequest(body)
    ? MCP_HANDSHAKE_OP_ID
    : MCP_TRANSPORT_OP_ID;
}
