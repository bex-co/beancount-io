import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import { API_SCOPES } from "@/server/api/identity";
import { setWellKnownRoutes } from "../well-known-route";

const config = {
  dashboard: { url: "https://beancount.io" },
  oauth: { issuer: "https://beancount.io" },
  appLinks: {
    appleTeamId: "PTLM7BZQMM",
    androidSha256Fingerprints: [
      "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99",
    ],
  },
} as unknown as AppConfig;

const unsetAppLinksConfig = {
  ...config,
  appLinks: {
    appleTeamId: null,
    androidSha256Fingerprints: [],
  },
} as unknown as AppConfig;
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
      auth: { authorizationUrl: string; tokenUrl: string; scopes: string[] };
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
    expect(body.auth.scopes).toEqual(API_SCOPES);
    expect(body.tools.map(({ name }) => name)).toEqual(
      MCP_TOOLS.map(({ name }) => name),
    );
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

  it("advertises query parameters and structured tool results", async () => {
    const response = await fetch(`${origin}/.well-known/mcp.json`);
    const body = (await response.json()) as {
      resources: Array<{ name: string; uriTemplate: string }>;
      tools: Array<{ name: string; inputSchema: object; outputSchema: object }>;
    };
    const archive = body.resources.find(({ name }) => name === "ledgerArchive");
    expect(archive?.uriTemplate).toBe(
      "beancount://{owner}/{name}/archive/{archive}",
    );
    const asset = body.resources.find(
      ({ name }) => name === "ledgerAssetDownloadUrl",
    );
    expect(asset?.uriTemplate).toBe(
      "beancount://assets/download-url{?ledgerRepoId,filename}",
    );
    const structuredBql = body.tools.find(
      ({ name }) => name === "runBqlQueryStructured",
    );
    expect(structuredBql?.inputSchema).toMatchObject({
      type: "object",
      properties: { ledger: { type: "string" }, query: { type: "string" } },
    });
    expect(structuredBql?.outputSchema).toHaveProperty("properties");
  });

  it("serves the Apple app-site association as JSON", async () => {
    const response = await fetch(
      `${origin}/.well-known/apple-app-site-association`,
    );
    const body = (await response.json()) as {
      applinks: {
        apps: string[];
        details: Array<{ appID: string; paths: string[] }>;
      };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect(body.applinks.apps).toEqual([]);
    expect(body.applinks.details).toEqual([
      {
        appID: "PTLM7BZQMM.io.beancount.ios",
        paths: ["/ledger/*"],
      },
    ]);
  });

  it("serves Android assetlinks as JSON", async () => {
    const response = await fetch(`${origin}/.well-known/assetlinks.json`);
    const body = (await response.json()) as Array<{
      relation: string[];
      target: {
        namespace: string;
        package_name: string;
        sha256_cert_fingerprints: string[];
      };
    }>;

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect(body).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "io.beancount.android",
          sha256_cert_fingerprints: [
            "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99",
          ],
        },
      },
    ]);
  });
});

describe("well-known app-link routes without config", () => {
  let server: http.Server;
  let origin: string;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    setWellKnownRoutes(router, unsetAppLinksConfig);
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

  it("returns 404 for AASA when the Apple team id is unset", async () => {
    const response = await fetch(
      `${origin}/.well-known/apple-app-site-association`,
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 for assetlinks when no fingerprints are configured", async () => {
    const response = await fetch(`${origin}/.well-known/assetlinks.json`);
    expect(response.status).toBe(404);
  });
});
