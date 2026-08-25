import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import { setWellKnownRoutes } from "../well-known-route";

const config = {
  dashboard: { url: "https://beancount.io" },
  oauth: { issuer: "https://beancount.io" },
} as Parameters<typeof setWellKnownRoutes>[1];

describe("well-known routes", () => {
  let server: http.Server;
  let origin: string;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    setWellKnownRoutes(router, config);
    app.use(router.routes());
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not expose a TCP address");
    }
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("serves RFC 9116 security contact metadata", async () => {
    const response = await fetch(`${origin}/.well-known/security.txt`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(body).toContain("Contact: mailto:hello@beancount.io");
    expect(body).toContain(
      "Canonical: https://beancount.io/.well-known/security.txt",
    );
  });

  it("serves the current MCP discovery manifest", async () => {
    const response = await fetch(`${origin}/.well-known/mcp.json`);
    const body = (await response.json()) as {
      endpoint: string;
      tools: Array<{ name: string }>;
      auth: { authorizationUrl: string; tokenUrl: string };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect(body.endpoint).toBe("https://beancount.io/api-gateway/mcp");
    expect(body.auth.authorizationUrl).toBe(
      "https://beancount.io/api-gateway/oauth/auth",
    );
    expect(body.auth.tokenUrl).toBe(
      "https://beancount.io/api-gateway/oauth/token",
    );
    expect(body.tools.map(({ name }) => name)).toEqual([
      "runBqlQuery",
      "listLedgerFiles",
      "readLedgerFiles",
      "editLedgerFiles",
      "listApiKeys",
      "createApiKey",
      "manageBankImport",
      "manageBankConnection",
      "revokeApiKey",
    ]);
  });

  it("declares the resource surface too, not only tools", async () => {
    const response = await fetch(`${origin}/.well-known/mcp.json`);
    const body = (await response.json()) as {
      capabilities: { resources?: unknown };
      resources: Array<{ name: string; uriTemplate: string }>;
    };

    // A client reading a tools-only manifest would conclude the read surface
    // does not exist — and it is most of the server (ADR 0008 D2).
    expect(body.capabilities.resources).toBeDefined();
    expect(body.resources.length).toBeGreaterThan(0);
    expect(body.resources[0]).toMatchObject({
      name: expect.any(String),
      uriTemplate: expect.stringContaining("beancount://"),
    });
  });
});
