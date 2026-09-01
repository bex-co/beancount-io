import "reflect-metadata";
import http from "node:http";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { setMcpRoute } from "../mcp-route";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";

const resolveIdentityMock = jest.fn();
jest.mock("@/server/api/identity", () => ({
  ...jest.requireActual("@/server/api/identity"),
  resolveIdentity: (...args: unknown[]) => resolveIdentityMock(...args),
}));

const config = {
  api: { scopeEnforcement: "shadow" },
  oauth: { issuer: "https://beancount.io" },
} as AppConfig;

const ledgerScoped: Identity = {
  userId: "usr_1",
  method: "apikey",
  scopes: new Set(["ledger.read"]),
  tokenId: "tok_1",
  ledgerScope: "alice/personal",
};

const layers = {
  database: {},
  services: { ledgerShell: {}, ledgerRepo: {}, apiKey: {}, llm: {} },
  workflows: { ledgerReceipt: {} },
} as unknown as AppLayers;

/**
 * The transport is stateless, so there is no session for a standalone SSE
 * stream to belong to. The bug this guards: the transport answered GET by
 * opening one anyway, and `handleRequest` does not resolve until that stream
 * ends — so the `finally` that closes the server never ran. The observable
 * symptom was a 200 `text/event-stream` that sent nothing and never closed,
 * leaking an McpServer per connection, which is why these assertions are made
 * against a real socket rather than a fabricated ctx: a hang is only visible
 * where the response actually has to complete.
 */
describe("MCP route: methods other than POST", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    app.use(restErrorMiddleware());
    app.use(bodyParser());
    setMcpRoute(
      router,
      layers,
      config,
      () => new McpServer({ name: "test", version: "1.0.0" }),
    );
    app.use(router.routes()).use(router.allowedMethods());
    server = http.createServer(app.callback());
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const { port } = server.address() as { port: number };
    url = `http://127.0.0.1:${port}/api-gateway/mcp`;
  });

  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  beforeEach(() => {
    resolveIdentityMock.mockReset();
    resolveIdentityMock.mockResolvedValue(ledgerScoped);
  });

  /** Completes, or rejects — never hangs. Five seconds is far past a 405. */
  async function requestWithin(method: string, ms = 5000) {
    const res = await Promise.race([
      fetch(url, { method, headers: { Accept: "text/event-stream" } }),
      new Promise<never>((_, rej) =>
        setTimeout(
          () => rej(new Error(`${method} did not respond within ${ms}ms`)),
          ms,
        ),
      ),
    ]);
    // Draining the body is the actual hang check: headers arrived promptly even
    // when the stream never ended.
    const body = await Promise.race([
      res.text(),
      new Promise<never>((_, rej) =>
        setTimeout(
          () => rej(new Error(`${method} body never ended within ${ms}ms`)),
          ms,
        ),
      ),
    ]);
    return { res, body };
  }

  it.each(["GET", "DELETE"])(
    "%s is refused 405 and the response completes",
    async (method) => {
      const { res, body } = await requestWithin(method);

      expect(res.status).toBe(405);
      expect(res.headers.get("allow")).toBe("POST");
      expect(JSON.parse(body)).toMatchObject({
        jsonrpc: "2.0",
        error: { code: -32000 },
        id: null,
      });
    },
  );

  it("refuses an unauthenticated GET with 401 and the discovery hint, not 405", async () => {
    resolveIdentityMock.mockResolvedValue(undefined);
    const { res, body } = await requestWithin("GET");

    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe(
      'Bearer resource_metadata="https://beancount.io/.well-known/oauth-protected-resource"',
    );
    expect(JSON.parse(body)).toEqual({ error: "unauthorized" });
  });

  it("refuses a GET from an unpinned credential as FORBIDDEN, not 405", async () => {
    resolveIdentityMock.mockResolvedValue({
      ...ledgerScoped,
      ledgerScope: undefined,
    });
    const { res } = await requestWithin("GET");

    expect(res.status).toBe(403);
  });
});
