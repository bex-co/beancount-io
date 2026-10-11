import "reflect-metadata";
import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  PingRequestSchema,
  InitializedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  setMcpRoute,
  MCP_ENDPOINT_PATH,
} from "@/features/ai-agent/api/mcp-route";
import { bodyParserMiddleware } from "@/server/middleware/body-parser-middleware";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";

const resolveIdentityMock = jest.fn();
jest.mock("@/server/api/identity", () => ({
  ...jest.requireActual("@/server/api/identity"),
  resolveIdentity: (...args: unknown[]) => resolveIdentityMock(...args),
}));

const config = {
  api: { scopeEnforcement: "shadow" },
  oauth: { issuer: "https://beancount.io" },
} as AppConfig;
const layers = { database: {}, services: {}, workflows: {} } as AppLayers;
let socket: http.Server;
let url: string;
const ping = jest.fn().mockResolvedValue({});
const initialized = jest.fn();
const factory = jest.fn(() => {
  const server = new McpServer({ name: "socket-envelope-test", version: "1" });
  server.server.setRequestHandler(PingRequestSchema, ping);
  server.server.setNotificationHandler(
    InitializedNotificationSchema,
    initialized,
  );
  return server;
});

beforeAll(async () => {
  const app = new Koa();
  const router = new Router();
  app.use(restErrorMiddleware());
  app.use(bodyParserMiddleware());
  setMcpRoute(router, layers, config, factory);
  app.use(router.routes()).use(router.allowedMethods());
  socket = http.createServer(app.callback());
  await new Promise<void>((resolve) => socket.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(socket.address() as { port: number }).port}${MCP_ENDPOINT_PATH}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => socket.close(() => resolve()));
});
beforeEach(() => {
  jest.clearAllMocks();
  resolveIdentityMock.mockResolvedValue({
    userId: "usr_1",
    method: "apikey",
    scopes: new Set(["ledger.read"]),
    tokenId: "tok_1",
  });
});

/** Every response, including SSE, must finish inside the abort deadline. */
async function post(
  body: string,
  overrides: Record<string, string | undefined> = {},
  rawHeaders?: string[],
) {
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    ...overrides,
  };
  const pairs = Object.entries(headers).flatMap(([name, value]) =>
    value === undefined ? [] : [name, value],
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    return await new Promise<{
      status: number;
      contentType: string | undefined;
      authenticate: string | undefined;
      text: string;
    }>((resolve, reject) => {
      const request = http.request(
        url,
        {
          method: "POST",
          headers: ["Host", new URL(url).host, ...(rawHeaders ?? pairs)],
          signal: controller.signal,
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.once("error", reject);
          response.once("end", () =>
            resolve({
              status: response.statusCode!,
              contentType: response.headers["content-type"],
              authenticate: response.headers["www-authenticate"],
              text: Buffer.concat(chunks).toString("utf8"),
            }),
          );
        },
      );
      request.once("error", reject);
      request.end(body);
    });
  } finally {
    clearTimeout(timeout);
  }
}
function messages(text: string): unknown[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:") && line.slice(5).trim())
    .map((line) => JSON.parse(line.slice(5)));
}

it.each([
  {},
  { jsonrpc: "1.0", id: 1, method: "tools/list" },
  { jsonrpc: "2.0", id: 1 },
])(
  "valid JSON %j with an invalid envelope receives InvalidRequest",
  async (body) => {
    const res = await post(JSON.stringify(body));
    expect(res.status).toBe(400);
    expect(res.contentType).toContain("application/json");
    expect(JSON.parse(res.text)).toEqual({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: expect.stringMatching(/^Invalid Request:/),
      },
      id: null,
    });
    expect(ping).not.toHaveBeenCalled();
    expect(initialized).not.toHaveBeenCalled();
    expect(factory).not.toHaveBeenCalled();
  },
);
it("malformed JSON retains ParseError", async () => {
  const res = await post("{");
  expect(res.status).toBe(400);
  expect(JSON.parse(res.text)).toEqual({
    jsonrpc: "2.0",
    error: { code: -32700, message: "Parse error: the body is not valid JSON" },
    id: null,
  });
  expect(factory).not.toHaveBeenCalled();
});
it("ping remains a completed SSE response", async () => {
  const res = await post(
    JSON.stringify({ jsonrpc: "2.0", id: 7, method: "ping" }),
  );
  expect(res.status).toBe(200);
  expect(res.contentType).toContain("text/event-stream");
  expect(messages(res.text)).toEqual([{ jsonrpc: "2.0", id: 7, result: {} }]);
  expect(ping).toHaveBeenCalledTimes(1);
});
it("initialize succeeds", async () => {
  const res = await post(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "socket-test", version: "1" },
      },
    }),
  );
  expect(res.status).toBe(200);
  expect(messages(res.text)).toEqual([
    expect.objectContaining({
      id: 1,
      result: expect.objectContaining({
        protocolVersion: "2025-11-25",
        serverInfo: { name: "socket-envelope-test", version: "1" },
      }),
    }),
  ]);
});
it("notification completes without a response body", async () => {
  const res = await post(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  );
  expect(res.status).toBe(202);
  expect(res.text).toBe("");
  expect(initialized).toHaveBeenCalledTimes(1);
});
it("batches dispatch both pings", async () => {
  const res = await post(
    JSON.stringify(
      [1, 2].map((id) => ({ jsonrpc: "2.0", id, method: "ping" })),
    ),
  );
  expect(res.status).toBe(200);
  expect(messages(res.text)).toEqual([
    { jsonrpc: "2.0", id: 1, result: {} },
    { jsonrpc: "2.0", id: 2, result: {} },
  ]);
  expect(ping).toHaveBeenCalledTimes(2);
});
it("empty body is still ParseError", async () => {
  const res = await post("");
  expect(res.status).toBe(400);
  expect(JSON.parse(res.text)).toMatchObject({
    error: { code: -32700 },
    id: null,
  });
});

it("a sloppy Content-Type body the Koa parser skips retains the SDK ParseError", async () => {
  const res = await post(
    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    { "content-type": "application/json; charset=" },
  );
  expect(res.status).toBe(400);
  expect(res.contentType).toContain("application/json");
  expect(JSON.parse(res.text)).toMatchObject({
    jsonrpc: "2.0",
    error: { code: -32700 },
    id: null,
  });
  expect(ping).not.toHaveBeenCalled();
});

it.each([undefined, "application/json", "text/event-stream"])(
  "Accept %j retains 406 ahead of invalid envelope classification",
  async (accept) => {
    const res = await post("{}", { accept });
    expect(res.status).toBe(406);
    expect(res.contentType).toContain("application/json");
    expect(JSON.parse(res.text)).toMatchObject({
      jsonrpc: "2.0",
      error: { code: -32000 },
      id: null,
    });
    expect(ping).not.toHaveBeenCalled();
    expect(initialized).not.toHaveBeenCalled();
  },
);

it.each([undefined, "text/plain"])(
  "Content-Type %j retains 415 ahead of invalid envelope classification",
  async (contentType) => {
    const res = await post("{}", { "content-type": contentType });
    expect(res.status).toBe(415);
    expect(res.contentType).toContain("application/json");
    expect(JSON.parse(res.text)).toMatchObject({
      jsonrpc: "2.0",
      error: { code: -32000 },
      id: null,
    });
    expect(ping).not.toHaveBeenCalled();
  },
);

it("duplicate Content-Type retains the installed transport's 415 refusal", async () => {
  const res = await post("{}", {}, [
    "Accept",
    "application/json, text/event-stream",
    "Content-Type",
    "application/json",
    "content-type",
    "text/plain",
  ]);
  expect(res.status).toBe(415);
  expect(res.contentType).toContain("application/json");
  expect(JSON.parse(res.text)).toMatchObject({
    jsonrpc: "2.0",
    error: { code: -32000 },
    id: null,
  });
  expect(ping).not.toHaveBeenCalled();
});

it("unsupported protocol on a valid request retains the transport's refusal", async () => {
  const res = await post(
    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    { "mcp-protocol-version": "1900-01-01" },
  );
  expect(res.status).toBe(400);
  expect(res.contentType).toContain("application/json");
  expect(JSON.parse(res.text)).toMatchObject({
    jsonrpc: "2.0",
    error: { code: -32000 },
    id: null,
  });
  expect(ping).not.toHaveBeenCalled();
});

it("unauthenticated invalid objects still receive 401 and the discovery hint", async () => {
  resolveIdentityMock.mockResolvedValue(undefined);
  const res = await post("{}");
  expect(res.status).toBe(401);
  expect(res.authenticate).toBe(
    'Bearer resource_metadata="https://beancount.io/.well-known/oauth-protected-resource"',
  );
  expect(JSON.parse(res.text)).toEqual({ error: "unauthorized" });
  expect(factory).not.toHaveBeenCalled();
});

it("the existing empty batch completes with 202", async () => {
  const res = await post("[]");
  expect(res.status).toBe(202);
  expect(res.text).toBe("");
  expect(ping).not.toHaveBeenCalled();
  expect(initialized).not.toHaveBeenCalled();
});

it("an invalid batch member refuses the entire batch before dispatch", async () => {
  const res = await post(
    JSON.stringify([{ jsonrpc: "2.0", id: 1, method: "ping" }, {}]),
  );
  expect(res.status).toBe(400);
  expect(res.contentType).toContain("application/json");
  expect(JSON.parse(res.text)).toMatchObject({
    jsonrpc: "2.0",
    error: { code: -32600 },
    id: null,
  });
  expect(factory).not.toHaveBeenCalled();
  expect(ping).not.toHaveBeenCalled();
});

it("invalid envelope classification still precedes protocol validation", async () => {
  const res = await post("{}", { "mcp-protocol-version": "1900-01-01" });
  expect(res.status).toBe(400);
  expect(JSON.parse(res.text)).toMatchObject({
    jsonrpc: "2.0",
    error: { code: -32600 },
    id: null,
  });
  expect(factory).not.toHaveBeenCalled();
});
