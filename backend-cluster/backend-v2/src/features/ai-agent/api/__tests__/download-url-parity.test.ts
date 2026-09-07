import { LedgerArchiveService } from "@/features/ledger/service/ledger-archive-service";
import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerAssetService } from "@/features/ledger/service/ledger-asset-service";
import { LedgerAssetQueryResolver } from "@/features/ledger/api/resolvers/ledger-asset-resolver";
import { AuthorizationService } from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  readOnlyToken,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";
const asset = Buffer.from("Café receipt\nAmount: 42.50 USD\n");
const archive = Buffer.from(
  "UEsDBBQAAAAAAHCtJl2NhVHnIAAAACAAAAAJAAAAbWFpbi5iZWFuMjAyNi0wOS0wMSBvcGVuIEFzc2V0czpCYW5rIFVTRApQSwECFAMUAAAAAABwrSZdjYVR5yAAAAAgAAAACQAAAAAAAAAAAAAAgAEAAAAAbWFpbi5iZWFuUEsFBgAAAAABAAEANwAAAEcAAAAAAA==",
  "base64",
);
const filename = "receipts/2026/café.txt";
let resolver: LedgerAssetQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;
async function fixture(identity: Identity = readOnlyToken) {
  let now = 1000;
  const grants = new Map<string, { expires: number; key: string }>();
  const upstreamRequests: string[] = [];
  const origin = http.createServer((req, res) => {
    const url = new URL(req.url!, "http://fixture");
    upstreamRequests.push(url.pathname);
    if (url.pathname.startsWith("/assets/")) {
      const grant = grants.get(url.searchParams.get("grant") ?? "");
      if (
        !grant ||
        grant.expires <= now ||
        decodeURIComponent(url.pathname.slice(1)) !== grant.key
      ) {
        res.statusCode = 403;
        res.end();
        return;
      }
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(asset);
      return;
    }
    if (
      url.pathname === "/ledgers/alice/main/archive/main.zip" &&
      req.headers.authorization ===
        `Basic ${Buffer.from("alice:fixture-only").toString("base64")}`
    ) {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="main.zip"');
      res.end(archive);
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((resolve) => origin.listen(0, "127.0.0.1", resolve));
  const address = origin.address() as { port: number };
  const originUrl = `http://127.0.0.1:${address.port}`;
  const config = {
    api: { scopeEnforcement: "enforce" },
    server: { url: "" },
    favaApi: { baseUrl: originUrl },
  } as AppConfig;
  const check = jest.fn().mockResolvedValue(true);
  const authorization = new AuthorizationService({ check }, jest.fn());
  const lookup = jest.fn(async () => ({
    data: { success: true, data: { id: 42, full_name: "alice/main" } },
  }));
  const factory = {
    getAdminClient: () => ({
      admin: { getLedgerByRepoId: lookup },
      ledgers: { getLedger: lookup },
    }),
  };
  const generateDownloadUrl = jest.fn(async (key: string) => {
    const grant = String(grants.size + 1);
    grants.set(grant, { expires: now + 60, key });
    return {
      downloadUrl: `${originUrl}/${key.split("/").map(encodeURIComponent).join("/")}?grant=${grant}`,
      expiresIn: 60,
    };
  });
  const service = new LedgerAssetService(
    factory as never,
    { generateDownloadUrl } as never,
    config,
    authorization,
  );
  const rest = await startV1TestServer(
    {
      services: {
        ledgerAsset: service,
        authorization,
        ledgerArchive: new LedgerArchiveService(
          {
            user: {
              getById: async () => ({
                ledger_username: "alice",
                ledger_password: "fixture-only",
              }),
            },
          } as never,
          {} as never,
          config,
          authorization,
        ),
      },
      database: {
        db: {},
        models: {
          user: {
            getById: async () => ({
              ledger_username: "alice",
              ledger_password: "fixture-only",
            }),
          },
        },
      },
    } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(identity);
  config.server.url = rest.url;
  resolver = new LedgerAssetQueryResolver(service);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerAssetQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const server = assembleMcpRegistry(
    { identity, ledgerAssetService: service } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "download-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  const read = async (uri: string) => {
    const result = await client.readResource({ uri });
    const c = result.contents[0];
    if (!("text" in c)) throw new Error("Expected JSON");
    return JSON.parse(c.text) as { downloadUrl: string };
  };
  const gql = async (field: string, args: string) => {
    const r = await graphql({
      schema,
      source: `{${field}(${args}){downloadUrl}}`,
      contextValue: { identity },
    });
    if (r.errors) throw r.errors[0];
    return r.data?.[field] as { downloadUrl: string };
  };
  return {
    check,
    lookup,
    generateDownloadUrl,
    upstreamRequests,
    expire: () => {
      now += 61;
    },
    rest: () =>
      fetch(
        `${rest.url}/api-gateway/v1/asset-download-url?ledgerRepoId=42&filename=${encodeURIComponent(filename)}`,
      ),
    assetUrls: async () => [
      (await (
        await fetch(
          `${rest.url}/api-gateway/v1/asset-download-url?ledgerRepoId=42&filename=${encodeURIComponent(filename)}`,
        )
      ).json()) as { downloadUrl: string },
      await read(
        `beancount://assets/download-url?ledgerRepoId=42&filename=${encodeURIComponent(filename)}`,
      ),
      await gql(
        "getLedgerAssetDownloadUrl",
        `ledgerRepoId:42,filename:${JSON.stringify(filename)}`,
      ),
    ],
    read,
    gql,
    setIdentity: rest.setIdentity,
    restBase: rest.url,
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
      await new Promise<void>((resolve, reject) =>
        origin.close((e) => (e ? reject(e) : resolve())),
      );
    },
  };
}
describe("download URL discovery and authorized HTTP consumption", () => {
  it.each([readOnlyToken, pinnedReadToken])(
    "delivers matching asset bytes through URLs from all adapters",
    async (identity) => {
      const f = await fixture(identity);
      try {
        const urls = await f.assetUrls();
        for (const { downloadUrl } of urls) {
          const response = await fetch(downloadUrl);
          expect(response.status).toBe(200);
          expect(response.headers.get("content-type")).toContain("text/plain");
          expect(Buffer.from(await response.arrayBuffer())).toEqual(asset);
        }
        expect(f.generateDownloadUrl.mock.calls).toEqual(
          Array(3).fill(["assets/repo_42/receipts/2026/café.txt"]),
        );
        f.expire();
        for (const { downloadUrl } of urls)
          expect((await fetch(downloadUrl)).status).toBe(403);
      } finally {
        await f.close();
      }
    },
  );
  it("returns the same authenticated archive URL and streams the actual archive", async () => {
    const f = await fixture();
    try {
      const mcp = await f.read("beancount://alice/main/archive-download-url");
      const gql = await f.gql(
        "getLedgerArchiveDownloadUrl",
        'ledgerId:"alice/main"',
      );
      const restDiscovery = await fetch(
        `${f.restBase}/api-gateway/v1/ledgers/alice/main/archive-download-url`,
      );
      expect(restDiscovery.status).toBe(200);
      expect(await restDiscovery.json()).toEqual(gql);
      expect(mcp).toEqual(gql);
      expect(mcp.downloadUrl).toBe(
        `${f.restBase}/api-gateway/v1/ledgers/alice/main/archive/main.zip`,
      );
      const response = await fetch(mcp.downloadUrl);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/zip");
      expect(response.headers.get("content-disposition")).toContain("main.zip");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(Buffer.from(await response.arrayBuffer())).toEqual(archive);
      f.check.mockResolvedValue(false);
      expect(
        (
          await fetch(
            `${f.restBase}/api-gateway/v1/ledgers/alice/main/archive-download-url`,
          )
        ).status,
      ).toBe(403);
      expect((await fetch(mcp.downloadUrl)).status).toBe(403);
      expect(
        f.upstreamRequests.filter((p) => p.includes("archive")),
      ).toHaveLength(1);
      await expect(
        f.read("beancount://alice/main/archive-download-url"),
      ).rejects.toThrow();
      await expect(
        f.gql("getLedgerArchiveDownloadUrl", 'ledgerId:"alice/main"'),
      ).rejects.toThrow();
    } finally {
      await f.close();
    }
  });
  it("permits anonymous public-ledger discovery only when the service authorizes it", async () => {
    const f = await fixture();
    try {
      f.setIdentity(undefined);
      const url = `${f.restBase}/api-gateway/v1/ledgers/alice/main/archive-download-url`;
      const response = await fetch(url);
      expect(response.status).toBe(200);
      expect(await response.json()).toHaveProperty("downloadUrl");
      f.check.mockResolvedValue(false);
      // A denied anonymous principal gets 401 (authenticate for access),
      // not 403 — authorizeOrThrow's deliberate anonymous mapping.
      expect((await fetch(url)).status).toBe(401);
      f.check.mockRejectedValue(new Error("relationship fixture unavailable"));
      expect((await fetch(url)).status).toBe(503);
      expect(f.upstreamRequests).toHaveLength(0);
    } finally {
      await f.close();
    }
  });
  it.each([
    { ...readOnlyToken, ledgerScope: "other/books" },
    { ...readOnlyToken, scopes: new Set<string>() },
  ])("refuses assets outside the credential ceiling", async (identity) => {
    const f = await fixture(identity);
    try {
      expect((await f.rest()).status).toBe(403);
      await expect(
        f.read(
          `beancount://assets/download-url?ledgerRepoId=42&filename=${encodeURIComponent(filename)}`,
        ),
      ).rejects.toThrow();
      await expect(
        f.gql(
          "getLedgerAssetDownloadUrl",
          `ledgerRepoId:42,filename:${JSON.stringify(filename)}`,
        ),
      ).rejects.toThrow();
      expect(f.generateDownloadUrl).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it("refuses revoked relationships and outages before signing new URLs", async () => {
    const f = await fixture();
    try {
      for (const failure of [
        false,
        new Error("relationship source unavailable"),
      ]) {
        if (failure === false) f.check.mockResolvedValue(false);
        else f.check.mockRejectedValue(failure);
        expect((await f.rest()).status).toBe(failure === false ? 403 : 503);
        await expect(
          f.read(
            `beancount://assets/download-url?ledgerRepoId=42&filename=${encodeURIComponent(filename)}`,
          ),
        ).rejects.toThrow();
        await expect(
          f.gql(
            "getLedgerAssetDownloadUrl",
            `ledgerRepoId:42,filename:${JSON.stringify(filename)}`,
          ),
        ).rejects.toThrow();
      }
      expect(f.generateDownloadUrl).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it("rejects invalid repository IDs and paths before ledger lookup or signing", async () => {
    const f = await fixture();
    try {
      for (const [id, path] of [
        [0, filename],
        [-1, filename],
        [42, "../repo_43/private.txt"],
        [42, "receipts/../../private.txt"],
        [42, ""],
        [42, "/private.txt"],
      ] as const) {
        expect(
          (
            await fetch(
              `${f.restBase}/api-gateway/v1/asset-download-url?ledgerRepoId=${id}&filename=${encodeURIComponent(path)}`,
            )
          ).status,
        ).toBe(400);
        await expect(
          f.read(
            `beancount://assets/download-url?ledgerRepoId=${id}&filename=${encodeURIComponent(path)}`,
          ),
        ).rejects.toThrow();
        await expect(
          f.gql(
            "getLedgerAssetDownloadUrl",
            `ledgerRepoId:${id},filename:${JSON.stringify(path)}`,
          ),
        ).rejects.toThrow();
      }
      expect(f.lookup).not.toHaveBeenCalled();
      expect(f.generateDownloadUrl).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
