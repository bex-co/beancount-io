import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import { bodyParserMiddleware } from "../body-parser-middleware";
import { MCP_ENDPOINT_PATH } from "@/features/ai-agent/api/mcp-route";

/**
 * w5/048. A body the parser cannot read never reaches the MCP route, so the
 * refusal has to speak JSON-RPC from here. Asserted against a real socket:
 * the defect was the response's content type and body, which a fabricated ctx
 * would not show.
 */
describe("bodyParserMiddleware", () => {
  let server: http.Server;
  let base: string;
  const reached = jest.fn();

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    app.use(bodyParserMiddleware());
    const echo: Router.Middleware = (ctx) => {
      reached(ctx.path);
      ctx.body = { received: ctx.request.body ?? null };
    };
    router.post(MCP_ENDPOINT_PATH, echo);
    router.post("/api-gateway/v1/echo", echo);
    router.post("/api-gateway/oauth/token", echo);
    router.post("/api-gateway/oauth/interaction/abc", echo);
    app.use(router.routes());
    server = http.createServer(app.callback());
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const { port } = server.address() as { port: number };
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  beforeEach(() => reached.mockClear());

  const post = (path: string, body: string) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });

  it.each([
    ["a scalar", "5", -32600],
    ["a JSON string", '"hello"', -32600],
    ["malformed JSON", "{oops", -32700],
    ["whitespace only", "   ", -32700],
  ])(
    "answers %s on the MCP endpoint as a JSON-RPC error",
    async (_label, body, code) => {
      const response = await post(MCP_ENDPOINT_PATH, body);
      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toMatch(/application\/json/);
      expect(await response.json()).toEqual({
        jsonrpc: "2.0",
        error: { code, message: expect.any(String) },
        id: null,
      });
      expect(reached).not.toHaveBeenCalled();
    },
  );

  it("answers an oversized MCP body as a JSON-RPC error with the parser's status", async () => {
    const response = await post(
      MCP_ENDPOINT_PATH,
      JSON.stringify({ pad: "x".repeat(1024 * 1024 + 1) }),
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      jsonrpc: "2.0",
      error: { code: -32600 },
      id: null,
    });
    expect(reached).not.toHaveBeenCalled();
  });

  it("parses a well-formed MCP body and hands it to the route", async () => {
    const request = { jsonrpc: "2.0", method: "ping", id: 1 };
    const response = await post(MCP_ENDPOINT_PATH, JSON.stringify(request));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: request });
  });

  it("leaves a malformed body on any other path to the parser's own refusal", async () => {
    const response = await post("/api-gateway/v1/echo", "{oops");
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("jsonrpc");
    expect(reached).not.toHaveBeenCalled();
  });

  it("skips oidc-provider's core routes but still parses interaction routes", async () => {
    const core = await post("/api-gateway/oauth/token", '{"a":1}');
    expect(await core.json()).toEqual({ received: null });
    const interaction = await post(
      "/api-gateway/oauth/interaction/abc",
      '{"a":1}',
    );
    expect(await interaction.json()).toEqual({ received: { a: 1 } });
  });
});
