import "reflect-metadata";
import http from "node:http";
import { brotliCompressSync } from "node:zlib";
import Koa from "koa";
import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { bodyParserMiddleware } from "@/server/middleware/body-parser-middleware";
import { restErrorMiddleware } from "../error-middleware";
import { v1FallbackMiddleware } from "../v1-envelope";
import { anonymousV1Route, registerV1Routes, v1Route } from "../v1-route";

/**
 * w1/222. The v1 contract promises one error shape, `{ ok:false, error:{code,
 * message} }`, but a refusal made before any route ran — an unknown path, a
 * wrong method, a body the parser could not read — answered in Koa's plain
 * text. Asserted over a real socket with the middleware in the server's
 * order: the defect was the response's content type, which a fabricated ctx
 * would not show.
 */
let server: http.Server;
let base: string;
const reached = jest.fn();

beforeAll(async () => {
  const app = new Koa();
  app.silent = true;
  const router = new Router();
  app.use(bodyParserMiddleware());
  router.use(restErrorMiddleware());
  registerV1Routes(
    router,
    { layers: {} as AppLayers, config: {} as AppConfig },
    [
      anonymousV1Route({
        method: "get",
        path: "/api-gateway/v1/qa/report",
        summary: "A read with a required query",
        description: "A read.",
        query: z
          .object({ account: z.string(), limit: z.coerce.number() })
          .strict(),
        responses: { 200: { description: "ok" } },
        handler: async () => {
          reached();
          return [];
        },
      }),
      anonymousV1Route({
        method: "post",
        path: "/api-gateway/v1/qa/text",
        summary: "A write with a body",
        description: "A write.",
        body: z.object({ text: z.string() }).strict(),
        responses: { 200: { description: "ok" } },
        handler: async () => {
          reached();
          return { ok: true };
        },
      }),
      v1Route({
        method: "get",
        path: "/api-gateway/v1/qa/private",
        summary: "A read that needs a credential",
        description: "A read.",
        responses: { 200: { description: "ok" } },
        handler: async () => {
          reached();
          return [];
        },
      }),
    ],
  );
  router.post("/api-gateway/", (ctx) => {
    reached();
    ctx.body = { data: null };
  });
  app.use(v1FallbackMiddleware());
  app.use(router.routes());
  app.use(router.allowedMethods());
  server = http.createServer(app.callback());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
beforeEach(() => reached.mockClear());

const send = (
  method: string,
  path: string,
  body?: string | Blob,
  headers: Record<string, string> = { "content-type": "application/json" },
) => fetch(`${base}${path}`, { method, headers, body });

/** The status and the v1 envelope, asserting the body is JSON. */
async function envelope(response: Response) {
  expect(response.headers.get("content-type")).toMatch(/application\/json/);
  return { status: response.status, body: await response.json() };
}

it("answers an unknown path with a JSON 404", async () => {
  for (const path of [
    "/api-gateway/v1/qa-no-such-route",
    "/api-gateway/v1/qa/report/x",
  ]) {
    expect(await envelope(await send("GET", path))).toEqual({
      status: 404,
      body: {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: expect.stringContaining("No such endpoint"),
        },
      },
    });
  }
});

it("answers a wrong method with a JSON 405 and keeps Allow", async () => {
  const response = await send("DELETE", "/api-gateway/v1/qa/report");
  expect(response.headers.get("allow")).toBe("HEAD, GET");
  expect(await envelope(response)).toEqual({
    status: 405,
    body: {
      ok: false,
      error: {
        code: "BAD_USER_INPUT",
        message:
          "DELETE is not allowed on /api-gateway/v1/qa/report; it accepts HEAD, GET",
      },
    },
  });
});

it.each([
  ["truncated JSON", '{"text":'],
  ["null", "null"],
  ["a string", '"str"'],
])("refuses %s as a body with a JSON 400", async (_name, body) => {
  expect(
    await envelope(await send("POST", "/api-gateway/v1/qa/text", body)),
  ).toEqual({
    status: 400,
    body: {
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: expect.stringContaining(
          "The request body is not a JSON object",
        ),
      },
    },
  });
  expect(reached).not.toHaveBeenCalled();
});

it("refuses an oversized body with a JSON 413", async () => {
  const response = await new Promise<{
    status?: number;
    body: string;
    type?: string;
  }>((resolve, reject) => {
    const request = http.request(
      `${base}/api-gateway/v1/qa/text`,
      {
        method: "POST",
        agent: false,
        headers: {
          "content-type": "application/json",
          "transfer-encoding": "chunked",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("error", reject);
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            type: res.headers["content-type"],
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    request.on("error", reject);
    request.end(JSON.stringify({ text: "x".repeat(2 * 1024 * 1024 + 1) }));
  });
  expect(response.status).toBe(413);
  expect(response.type).toMatch(/application\/json/);
  expect(JSON.parse(response.body)).toEqual({
    ok: false,
    error: {
      code: "BAD_USER_INPUT",
      message: "The request body exceeds the 2 MiB limit",
    },
  });
});

it("refuses a Brotli body with a JSON 415", async () => {
  const response = await send(
    "POST",
    "/api-gateway/v1/qa/text",
    new Blob([brotliCompressSync(Buffer.from('{"text":"x"}'))]),
    { "content-type": "application/json", "content-encoding": "br" },
  );
  expect(await envelope(response)).toMatchObject({
    status: 415,
    body: { ok: false, error: { code: "BAD_USER_INPUT" } },
  });
});

it.each(["text/plain", "application/x-www-form-urlencoded"])(
  "refuses a %s body with a JSON 415 naming application/json",
  async (type) => {
    const response = await send(
      "POST",
      "/api-gateway/v1/qa/text",
      '{"text":"x"}',
      {
        "content-type": type,
      },
    );
    expect(await envelope(response)).toEqual({
      status: 415,
      body: {
        ok: false,
        error: {
          code: "BAD_USER_INPUT",
          message: `This endpoint reads a JSON body: send it with Content-Type: application/json, not ${type}`,
        },
      },
    });
    expect(reached).not.toHaveBeenCalled();
  },
);

it("checks no content type on a request without a body", async () => {
  const response = await send("POST", "/api-gateway/v1/qa/text", undefined, {
    "content-type": "text/plain",
  });
  const { status, body } = await envelope(response);
  expect(status).toBe(400);
  expect(body.error.code).toBe("VALIDATION_FAILED");
});

it("names a missing required query rather than zod's type", async () => {
  const missing = await envelope(
    await send("GET", "/api-gateway/v1/qa/report"),
  );
  expect(missing.status).toBe(400);
  expect(missing.body.error.message).toBe(
    "Validation failed for query.account: account, limit are required",
  );
  const one = await envelope(
    await send("GET", "/api-gateway/v1/qa/report?account=Assets:Cash"),
  );
  expect(one.body.error.message).toBe(
    "Validation failed for query.limit: limit is required",
  );
  // A name that is there but malformed keeps zod's own message.
  const malformed = await envelope(
    await send("GET", "/api-gateway/v1/qa/report?account=Assets:Cash&limit=x"),
  );
  expect(malformed.body.error.message).not.toContain("required");
});

it("challenges an anonymous 401", async () => {
  const response = await send("GET", "/api-gateway/v1/qa/private");
  expect(response.status).toBe(401);
  expect(response.headers.get("www-authenticate")).toBe(
    'Bearer realm="beancount.io"',
  );
});

it("answers malformed GraphQL JSON as a JSON BAD_REQUEST", async () => {
  const response = await send("POST", "/api-gateway/", '{"query":');
  expect(response.status).toBe(400);
  expect(response.headers.get("content-type")).toMatch(/application\/json/);
  expect(await response.json()).toEqual({
    errors: [
      {
        message: expect.stringContaining(
          "The request body is not a JSON object",
        ),
        extensions: { code: "BAD_REQUEST" },
      },
    ],
  });
  expect(reached).not.toHaveBeenCalled();
});

it("leaves a path outside v1 to Koa", async () => {
  const response = await send("GET", "/api-gateway/elsewhere");
  expect(response.status).toBe(404);
  expect(response.headers.get("content-type")).not.toMatch(/json/);
});
