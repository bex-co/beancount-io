import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import { API_SCOPES } from "@/server/api/identity";
import { setWellKnownRoutes } from "../well-known-route";

const config = {
  // Deliberately different origins. This pins `mcpManifest`'s own contract —
  // client URLs follow the issuer, human links follow the dashboard. Note the
  // config module only produces this shape outside production, where
  // `oauthIssuer` is `SERVER_URL`; in production it forces the two equal, so
  // this fixture exercises the function, not a production state (w2/015).
  dashboard: { url: "https://app.example.test" },
  oauth: { issuer: "https://api.example.test" },
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
      tools: string[];
      auth: { authorizationUrl: string; tokenUrl: string; scopes: string[] };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect(body.endpoint).toBe("https://api.example.test/api-gateway/mcp");
    expect(body.auth.authorizationUrl).toBe(
      "https://api.example.test/api-gateway/oauth/auth",
    );
    expect(body.auth.tokenUrl).toBe(
      "https://api.example.test/api-gateway/oauth/token",
    );
    expect(body.auth.scopes).toEqual(API_SCOPES);
    expect(body.tools).toEqual(MCP_TOOLS.map(({ name }) => name));
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

  it("advertises resource query parameters in their URI templates", async () => {
    const response = await fetch(`${origin}/.well-known/mcp.json`);
    const body = (await response.json()) as {
      resources: Array<{ name: string; uriTemplate: string }>;
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
  });

  /**
   * w2/m29:t002. `endpoint` and `openapi` came from the dashboard URL while
   * `auth` came from the issuer, so a deployment whose dashboard and API are
   * different hosts advertised an MCP address that serves HTML.
   */
  it("derives every machine-reachable URL from the API origin", async () => {
    const response = await fetch(`${origin}/.well-known/mcp.json`);
    const body = (await response.json()) as {
      endpoint: string;
      openapi: string;
      auth: { authorizationUrl: string; tokenUrl: string };
      links: { dashboard: string; apiKeys: string };
    };

    expect(body.endpoint).toBe("https://api.example.test/api-gateway/mcp");
    expect(body.openapi).toBe(
      "https://api.example.test/api-gateway/v1/openapi.json",
    );
    expect(body.auth.authorizationUrl).toBe(
      "https://api.example.test/api-gateway/oauth/auth",
    );
    expect(body.auth.tokenUrl).toBe(
      "https://api.example.test/api-gateway/oauth/token",
    );
    // The dashboard origin survives only where a person, not a client, goes.
    expect(body.links.dashboard).toBe("https://app.example.test");
    expect(body.links.apiKeys).toBe(
      "https://app.example.test/settings/api-keys",
    );
  });

  /**
   * The manifest is a directory entry, not a contract. Full input and output
   * schemas made this ~20 KB on an anonymous cached GET; `tools/list`
   * publishes them authoritatively.
   */
  it("stays small by naming tools rather than publishing their schemas", async () => {
    const response = await fetch(`${origin}/.well-known/mcp.json`);
    const text = await response.text();
    expect(Buffer.byteLength(text, "utf8")).toBeLessThan(8 * 1024);

    const body = JSON.parse(text) as {
      tools: string[];
      resources: Array<Record<string, unknown>>;
    };
    // Tools are names; resources are names and the URI grammar a client needs
    // to build a read. Descriptions and schemas live in `tools/list`.
    expect(body.tools.length).toBeGreaterThan(0);
    expect(body.tools.every((tool) => typeof tool === "string")).toBe(true);
    expect(body.tools).toContain("runBqlQuery");
    for (const resource of body.resources) {
      expect(Object.keys(resource).sort()).toEqual(["name", "uriTemplate"]);
    }
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
