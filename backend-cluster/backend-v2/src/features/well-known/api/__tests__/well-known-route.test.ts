import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import Koa from "koa";
import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import { MCP_PROMPTS } from "@/features/ai-agent/api/mcp-prompts";
import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import { API_SCOPES } from "@/server/api/identity";
import {
  OPENAI_APPS_CHALLENGE_TOKEN,
  setWellKnownRoutes,
} from "../well-known-route";

// A syntactically valid record with a throwaway key — not Beancount.io's.
const MCP_REGISTRY_AUTH_PROOF =
  "v=MCPv1; k=ed25519; p=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

const config = {
  dashboard: { url: "https://beancount.io" },
  oauth: { issuer: "https://beancount.io" },
  mcpRegistry: { authProof: MCP_REGISTRY_AUTH_PROOF },
} as unknown as AppConfig;

/**
 * The official MCP Registry listing (`server.json` at the package root). It is
 * what a client that never reads our docs installs from, so it must name the
 * endpoint the manifest advertises and nothing else (ADR 019 D1).
 */
const REGISTRY_LISTING_PATH = path.resolve(
  __dirname,
  "../../../../../server.json",
);

// A self-hosted deployment: none of Beancount.io's own proofs apply to it.
const selfHostedConfig = {
  ...config,
  dashboard: { url: "https://books.example.com" },
  mcpRegistry: { authProof: null },
} as unknown as AppConfig;

/** Play App Signing key certificate of the official Android app. */
const ANDROID_FINGERPRINT =
  "3C:7A:97:CF:EA:DE:C4:36:2C:65:DC:A8:09:36:03:7C:CF:3D:63:1F:D7:E7:EA:87:6F:41:6E:98:96:66:71:51"; // gitleaks:allow
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
    expect(body).toContain("Contact: mailto:security@beancount.io");
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

  it("declares the prompt playbooks with their arguments", async () => {
    const response = await fetch(`${origin}/.well-known/mcp.json`);
    const body = (await response.json()) as {
      capabilities: { prompts?: unknown };
      prompts?: Array<{
        name: string;
        description: string;
        arguments: Array<{ name: string; required: boolean }>;
      }>;
    };

    // `initialize` advertises prompts; a manifest without them tells a client
    // reading it first that the playbooks do not exist.
    expect(body.capabilities.prompts).toBeDefined();
    expect(body.prompts?.map(({ name }) => name)).toEqual(
      MCP_PROMPTS.map(({ name }) => name),
    );
    for (const prompt of MCP_PROMPTS) {
      const listed = body.prompts?.find(({ name }) => name === prompt.name);
      expect(listed?.description).toBe(prompt.description);
      expect(listed?.arguments.map(({ name }) => name)).toEqual(
        Object.keys(prompt.argsSchema),
      );
      expect(listed?.arguments.every(({ required }) => !required)).toBe(true);
    }
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

  it("lists the manifest's endpoint in the MCP Registry listing", async () => {
    const listing = JSON.parse(
      fs.readFileSync(REGISTRY_LISTING_PATH, "utf8"),
    ) as {
      name: string;
      version: string;
      icons: Array<{ src: string }>;
      remotes: Array<{ type: string; url: string }>;
    };
    const response = await fetch(`${origin}/.well-known/mcp.json`);
    const manifest = (await response.json()) as {
      endpoint: string;
      version: string;
    };

    // Schema rules (description length, version format, $schema) are the
    // publish workflow's `mcp-publisher validate`; this test guards what the
    // schema cannot: the name that is the registry identity, and agreement
    // with the manifest.
    expect(listing.name).toBe("io.beancount/beancount");
    expect(listing.version).toBe(manifest.version);
    // Exactly one remote, exactly these keys: no `headers` (OAuth is discovered
    // from the 401) and the same URL every host is given.
    expect(listing.remotes).toEqual([
      { type: "streamable-http", url: manifest.endpoint },
    ]);
    expect(listing.icons.map(({ src }) => new URL(src).origin)).toEqual([
      new URL(manifest.endpoint).origin,
    ]);
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

  it("serves the MCP Registry domain proof as plain text", async () => {
    const response = await fetch(`${origin}/.well-known/mcp-registry-auth`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^text\/plain/);
    // Exactly the record plus a trailing newline, as `mcp-publisher` writes it.
    expect(body).toBe(`${MCP_REGISTRY_AUTH_PROOF}\n`);
  });

  it("serves the OpenAI apps challenge token verbatim as plain text", async () => {
    const response = await fetch(`${origin}/.well-known/openai-apps-challenge`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(response.headers.get("cache-control")).toBe("no-store");
    // The bare token: no newline, no wrapper.
    expect(await response.text()).toBe(OPENAI_APPS_CHALLENGE_TOKEN);
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
          sha256_cert_fingerprints: [ANDROID_FINGERPRINT],
        },
      },
    ]);
  });
});

describe("well-known routes on a self-hosted deployment", () => {
  let server: http.Server;
  let origin: string;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    setWellKnownRoutes(router, selfHostedConfig);
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

  // The official apps only claim beancount.io, so serving the same files on
  // another domain associates nothing; there is nothing to configure.
  it("serves the same app-link files without any configuration", async () => {
    const aasa = await fetch(
      `${origin}/.well-known/apple-app-site-association`,
    );
    expect(aasa.status).toBe(200);
    expect(JSON.stringify(await aasa.json())).toContain(
      "PTLM7BZQMM.io.beancount.ios",
    );
    const assetLinks = await fetch(`${origin}/.well-known/assetlinks.json`);
    expect(assetLinks.status).toBe(200);
    expect(JSON.stringify(await assetLinks.json())).toContain(
      ANDROID_FINGERPRINT,
    );
  });

  it("returns 404 for the MCP Registry proof when none is configured", async () => {
    const response = await fetch(`${origin}/.well-known/mcp-registry-auth`);
    expect(response.status).toBe(404);
  });

  it("returns 404 for the OpenAI apps challenge on a self-hosted deployment", async () => {
    const response = await fetch(`${origin}/.well-known/openai-apps-challenge`);
    expect(response.status).toBe(404);
  });
});
