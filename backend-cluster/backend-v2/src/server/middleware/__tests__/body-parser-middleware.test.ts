import http from "node:http";
import { brotliCompressSync, gzipSync } from "node:zlib";
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
    router.post("/api-gateway", echo);
    router.post("/api-gateway/v1/echo", echo);
    router.post("/api-gateway/oauth/token", echo);
    router.post("/api-gateway/oauth/raw", async (ctx) => {
      reached(ctx.path);
      const chunks: Buffer[] = [];
      for await (const chunk of ctx.req) chunks.push(Buffer.from(chunk));
      ctx.body = {
        received: ctx.request.body ?? null,
        raw: Buffer.concat(chunks).toString("utf8"),
      };
    });
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

  const post = (path: string, body: string, contentType = "application/json") =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": contentType },
      body,
      signal: AbortSignal.timeout(5000),
    });

  // An oversized Content-Length is refused before the upload finishes, which
  // can race the client's pending writes. Chunked requests exercise the byte
  // limit while allowing the client to read the actual HTTP refusal.
  const postOversized = (path: string, body: string) =>
    new Promise<{ status: number | undefined; body: string }>(
      (resolve, reject) => {
        const request = http.request(
          `${base}${path}`,
          {
            method: "POST",
            agent: false,
            headers: {
              "content-type": "application/json",
              "transfer-encoding": "chunked",
            },
            signal: AbortSignal.timeout(5000),
          },
          (response) => {
            const chunks: Buffer[] = [];
            response.on("data", (chunk: Buffer) => chunks.push(chunk));
            response.on("error", reject);
            response.on("end", () =>
              resolve({
                status: response.statusCode,
                body: Buffer.concat(chunks).toString("utf8"),
              }),
            );
          },
        );
        request.on("error", reject);
        request.end(body);
      },
    );

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
    const response = await postOversized(
      MCP_ENDPOINT_PATH,
      JSON.stringify({ pad: "x".repeat(2 * 1024 * 1024 + 1) }),
    );
    expect(response.status).toBe(413);
    // w23/073: it said "could not be read as a JSON-RPC request".
    expect(JSON.parse(response.body)).toEqual({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message:
          "Invalid Request: the body exceeds the 2 MiB limit (including JSON escaping and the envelope); split large batches into separate requests",
      },
      id: null,
    });
    expect(reached).not.toHaveBeenCalled();
  });

  it("admits the JSON envelope for an exactly 1 MiB base64 GraphQL file upload", async () => {
    const bytes = Buffer.alloc(1024 * 1024, "a");
    const request = {
      operationName: "CreateLedgerFile",
      query:
        "mutation CreateLedgerFile($ledgerId: String!, $path: String!, $content: String!, $message: String!) { createLedgerFile(ledgerId: $ledgerId, path: $path, content: $content, message: $message) { path sha } }",
      variables: {
        ledgerId: "synthetic/upload",
        path: "at-limit.bin",
        content: bytes.toString("base64"),
        message: "Upload synthetic at-limit file",
      },
    };
    expect(request.variables.content.length).toBe(1398104);
    const response = await post("/api-gateway", JSON.stringify(request));
    expect(response.status).toBe(200);
    const received = (await response.json()).received;
    expect(received).toEqual(request);
    expect(Buffer.from(received.variables.content, "base64")).toEqual(bytes);
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it("retains a bounded 2 MiB JSON refusal outside MCP", async () => {
    const response = await postOversized(
      "/api-gateway",
      JSON.stringify({
        variables: { content: "x".repeat(2 * 1024 * 1024 + 1) },
      }),
    );
    expect(response.status).toBe(413);
    expect(response.body).not.toContain("jsonrpc");
    expect(reached).not.toHaveBeenCalled();
  });

  it("keeps the 56 KiB form limit independent of the larger JSON allowance", async () => {
    const form = `value=${"x".repeat(56 * 1024 - 6)}`;
    const accepted = await post(
      "/api-gateway/v1/echo",
      form,
      "application/x-www-form-urlencoded",
    );
    expect(accepted.status).toBe(200);
    expect((await accepted.json()).received).toEqual({ value: form.slice(6) });
    const oversized = await post(
      "/api-gateway/v1/echo",
      `${form}x`,
      "application/x-www-form-urlencoded",
    );
    expect(oversized.status).toBe(413);
    await oversized.text();
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it("leaves the OIDC core request stream intact for its own body parser", async () => {
    const raw = "not JSON: the OIDC provider must receive these exact bytes";
    const response = await post("/api-gateway/oauth/raw", raw);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: null, raw });
    expect(reached).toHaveBeenCalledTimes(1);
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

  const postEncoded = (path: string, body: Buffer, encoding: string) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-encoding": encoding,
      },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(5000),
    });

  // CVE-2026-111497: a Brotli body reached zlib's decoder before any auth.
  describe("Brotli-encoded bodies", () => {
    const brotli = brotliCompressSync(Buffer.from('{"a":1}'));

    it.each([
      ["a REST route", "/api-gateway/v1/echo", "br"],
      ["the GraphQL route", "/api-gateway", "BR"],
      ["an encoding list naming br", "/api-gateway/v1/echo", "gzip, br"],
      ["an oidc-provider core route", "/api-gateway/oauth/raw", "br"],
    ])("refuses one on %s with 415", async (_label, path, encoding) => {
      const response = await postEncoded(path, brotli, encoding);
      expect(response.status).toBe(415);
      expect(await response.text()).toContain("Brotli");
      expect(reached).not.toHaveBeenCalled();
    });

    it("refuses one on the MCP endpoint as a JSON-RPC error", async () => {
      const response = await postEncoded(MCP_ENDPOINT_PATH, brotli, "br");
      expect(response.status).toBe(415);
      expect(await response.json()).toMatchObject({
        jsonrpc: "2.0",
        error: { code: -32600 },
        id: null,
      });
      expect(reached).not.toHaveBeenCalled();
    });

    it("still parses a gzip body", async () => {
      const response = await postEncoded(
        "/api-gateway/v1/echo",
        gzipSync(Buffer.from('{"a":1}')),
        "gzip",
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: { a: 1 } });
    });
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
