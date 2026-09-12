const counter = jest.fn();
jest.mock("@/foundation/redis/redis-counter", () => ({
  incrementInWindow: (...args: unknown[]) => counter(...args),
}));

import type { RouterContext } from "@koa/router";
import { restRateLimitMiddleware } from "../rate-limit-middleware";
import { MCP_TRANSPORT_OP_ID, OP_BUDGETS } from "@/server/api/rate-limit";
import { RateLimitedError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";

/**
 * w2/m28:t004. The middleware half of the MCP transport budget: an agent
 * session is dozens of POSTs to one path, and the handshake is protocol
 * overhead the caller did not choose.
 */
const identity: Identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  tokenId: "tok_1",
};

/** A Koa context matched to the MCP mount, carrying `body` as its payload. */
function mcpContext(body: unknown): RouterContext {
  return {
    method: "POST",
    path: "/api-gateway/mcp",
    ip: "10.0.0.1",
    state: { identity },
    request: { body },
    matched: [{ methods: ["POST"], path: "/api-gateway/mcp" }],
    set: jest.fn(),
  } as unknown as RouterContext;
}

beforeEach(() => {
  counter.mockReset();
  counter.mockResolvedValue({ count: 1, resetInMs: 60_000 });
});

describe("the MCP transport budget", () => {
  it("does not charge a handshake message", async () => {
    const next = jest.fn(async () => {});
    await restRateLimitMiddleware()(
      mcpContext({ jsonrpc: "2.0", method: "initialize", id: 1 }),
      next,
    );
    expect(counter).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("charges a tool call", async () => {
    await restRateLimitMiddleware()(
      mcpContext({ jsonrpc: "2.0", method: "tools/call", id: 2 }),
      async () => {},
    );
    expect(counter).toHaveBeenCalledTimes(1);
  });

  /** The acceptance criterion, run rather than argued. */
  it("lets a 200-read session through without a 429", async () => {
    const budget = OP_BUDGETS[MCP_TRANSPORT_OP_ID];
    let charged = 0;
    counter.mockImplementation(async () => {
      charged += 1;
      return { count: charged, resetInMs: 60_000 };
    });

    const middleware = restRateLimitMiddleware();
    // One handshake, then 200 reads — the shape of the session that 429'd.
    await middleware(
      mcpContext({ jsonrpc: "2.0", method: "initialize", id: 0 }),
      async () => {},
    );
    for (let call = 0; call < 200; call += 1) {
      await expect(
        middleware(
          mcpContext({ jsonrpc: "2.0", method: "tools/call", id: call }),
          async () => {},
        ),
      ).resolves.not.toThrow();
    }
    expect(charged).toBe(200);
    expect(charged).toBeLessThanOrEqual(budget.max);
  });

  it("still refuses a caller past the transport budget", async () => {
    counter.mockResolvedValue({
      count: OP_BUDGETS[MCP_TRANSPORT_OP_ID].max + 1,
      resetInMs: 30_000,
    });
    await expect(
      restRateLimitMiddleware()(
        mcpContext({ jsonrpc: "2.0", method: "tools/call", id: 1 }),
        async () => {},
      ),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });
});
