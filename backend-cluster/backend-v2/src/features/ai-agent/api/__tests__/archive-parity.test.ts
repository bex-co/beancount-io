import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import http from "node:http";
import { gzipSync, gunzipSync } from "node:zlib";
import Koa from "koa";
import Router from "@koa/router";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LedgerArchiveService } from "@/features/ledger/service/ledger-archive-service";
import { registerDownloadArchiveRoute } from "@/features/ledger/api/rest/download-archive-handler";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { generateV1OpenAPIDocument } from "@/server/rest/openapi-registry";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  pinnedReadToken,
  readOnlyToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";
const zip = Buffer.from(
  "UEsDBBQAAAAAAHCtJl2NhVHnIAAAACAAAAAJAAAAbWFpbi5iZWFuMjAyNi0wOS0wMSBvcGVuIEFzc2V0czpCYW5rIFVTRApQSwECFAMUAAAAAABwrSZdjYVR5yAAAAAgAAAACQAAAAAAAAAAAAAAgAEAAAAAbWFpbi5iZWFuUEsFBgAAAAABAAEANwAAAEcAAAAAAA==",
  "base64",
);
const tar = Buffer.alloc(2048);
// A minimal valid tar with main.bean followed by the two zero end blocks.
const contents = Buffer.from("2026-09-01 open Assets:Bank USD\n");
tar.write("main.bean", 0);
tar.write("0000644\0", 100);
tar.write("0000000\0", 108);
tar.write("0000000\0", 116);
tar.write(contents.length.toString(8).padStart(11, "0") + "\0", 124);
tar.write("00000000000\0", 136);
tar.fill(32, 148, 156);
tar.write("0", 156);
tar.write("ustar\0", 257);
tar.write("00", 263);
tar.write(
  [...tar.subarray(0, 512)]
    .reduce((a, b) => a + b, 0)
    .toString(8)
    .padStart(6, "0") + "\0 ",
  148,
);
contents.copy(tar, 512);
const gzip = gzipSync(tar);
const KNOWN_SHA = "0123456789abcdef0123456789abcdef01234567";
const UNKNOWN_SHA = "deadbeef00000000000000000000000000000000";
async function listen(server: http.Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
async function fixture(identity = readOnlyToken) {
  const calls: string[] = [];
  let status = 200;
  // What the hosted repository answers today for both formats (w6/010).
  let contentType: string | undefined;
  // Commits the repository has. Like Gitea, the origin takes an archive of an
  // unknown full SHA on trust and never answers it (w23/003).
  const commits = new Set<string>([KNOWN_SHA]);
  const origin = http.createServer((req, res) => {
    calls.push(req.url!);
    const lookup = /\/git\/commits\/([^/?]+)/.exec(req.url!);
    if (lookup) {
      res.statusCode = commits.has(lookup[1]) ? 200 : 404;
      res.end(JSON.stringify({ sha: lookup[1] }));
      return;
    }
    const sha = /\/archive\/([0-9a-f]{40})\./.exec(req.url!);
    if (sha && !commits.has(sha[1])) return;
    if (status !== 200) {
      res.statusCode = status;
      res.end("upstream failure");
      return;
    }
    const name = req.url!.split("/").at(-1)!;
    const zipped = name.endsWith(".zip");
    res.setHeader(
      "Content-Type",
      contentType ?? (zipped ? "application/zip" : "application/gzip"),
    );
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.end(zipped ? zip : gzip);
  });
  const baseUrl = await listen(origin);
  const check = jest.fn().mockResolvedValue(true);
  const authorization = new AuthorizationService({ check }, jest.fn());
  const models = {
    user: {
      getById: jest.fn(async () => ({
        ledger_username: "alice",
        ledger_password: "fixture-only",
      })),
    },
  };
  const config = {
    api: { scopeEnforcement: "enforce" },
    gitea: { internalBaseUrl: baseUrl },
  } as AppConfig;
  const service = new LedgerArchiveService(
    models as never,
    {} as never,
    config,
    authorization,
  );
  const layers = {
    services: { authorization, ledgerArchive: service },
    database: { db: {}, models },
  } as unknown as AppLayers;
  const rest = await startV1TestServer(layers, config, { apiKeys: false });
  rest.setIdentity(identity);
  const router = new Router();
  router.use(restErrorMiddleware());
  registerDownloadArchiveRoute(router, layers, config);
  const app = new Koa();
  app.silent = true;
  app.use(router.routes()).use(router.allowedMethods());
  const legacy = http.createServer(app.callback());
  const legacyUrl = await listen(legacy);
  const server = assembleMcpRegistry(
    { identity, ledgerArchiveService: service } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "archive-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    calls,
    check,
    models,
    fail: (code: number) => {
      status = code;
    },
    serveAs: (type: string) => {
      contentType = type;
    },
    rest: (archive: string) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/archive/${archive}`),
    legacy: (archive: string) =>
      fetch(`${legacyUrl}/api-gateway/ledgers/alice%2Fmain/archive/${archive}`),
    read: (uri: string) => client.readResource({ uri }),
    close: async () => {
      origin.closeAllConnections();
      await client.close();
      await server.close();
      await rest.close();
      await Promise.all(
        [origin, legacy].map(
          (s) =>
            new Promise<void>((resolve, reject) =>
              s.close((e) => (e ? reject(e) : resolve())),
            ),
        ),
      );
    },
  };
}
const canonical = (name: string) => `beancount://alice/main/archive/${name}`;
describe("archive bytes through canonical adapters and the legacy REST twin", () => {
  it.each([readOnlyToken, pinnedReadToken])(
    "preserves archive bytes and MIME metadata for each spelling",
    async (identity) => {
      const f = await fixture(identity);
      try {
        for (const name of ["main.zip", "main.tar.gz"]) {
          const bytes = name.endsWith(".zip") ? zip : gzip;
          const mime = name.endsWith(".zip")
            ? "application/zip"
            : "application/gzip";
          for (const fetcher of [f.rest, f.legacy]) {
            const response = await fetcher(name);
            expect(response.status).toBe(200);
            expect(response.headers.get("content-type")).toBe(mime);
            expect(response.headers.get("content-disposition")).toBe(
              `attachment; filename="${name}"`,
            );
            expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
          }
          // The legacy MCP alias left the agent surface in w2/m27
          // (compat-only exemption); its REST twin is covered above.
          for (const uri of [canonical(name)]) {
            const response = await f.read(uri);
            const content = response.contents[0];
            expect(content.mimeType).toBe(mime);
            expect(content._meta).toEqual({
              "beancount/contentDisposition": `attachment; filename="${name}"`,
            });
            expect("blob" in content).toBe(true);
            if (!("blob" in content)) throw new Error("Expected archive blob");
            const downloaded = Buffer.from(content.blob, "base64");
            expect(downloaded).toEqual(bytes);
            if (name.endsWith(".gz"))
              expect(
                gunzipSync(downloaded).subarray(512, 512 + contents.length),
              ).toEqual(contents);
            else expect(downloaded.includes(contents)).toBe(true);
          }
        }
        expect(f.calls).toHaveLength(6);
      } finally {
        await f.close();
      }
    },
  );
  it("rechecks access after revocation before downloading the MCP resource", async () => {
    const f = await fixture();
    try {
      await f.read(canonical("main.zip"));
      f.check.mockResolvedValue(false);
      await expect(f.read(canonical("main.zip"))).rejects.toThrow();
      expect((await f.rest("main.zip")).status).toBe(404);
      expect(f.calls).toHaveLength(1);
    } finally {
      await f.close();
    }
  });
  it("enforces the credential pin and rejects unsafe archive names before upstream work", async () => {
    const f = await fixture(pinnedReadToken);
    try {
      for (const uri of [
        "beancount://other/books/archive/main.zip",
        canonical("..%2Fsecret.zip"),
      ])
        await expect(f.read(uri)).rejects.toThrow();
      expect((await f.rest("..%2Fsecret.zip")).status).toBe(400);
      expect(f.calls).toHaveLength(0);
    } finally {
      await f.close();
    }
  });
  it.each(["main", "main.rar", "main.tar"])(
    "refuses %p, which names no supported format, as bad input before upstream work",
    async (name) => {
      const f = await fixture();
      try {
        const response = await f.rest(name);
        expect(response.status).toBe(400);
        expect((await response.json()).error.code).toBe("BAD_USER_INPUT");
        await expect(f.read(canonical(name))).rejects.toMatchObject({
          data: { code: "BAD_USER_INPUT" },
        });
        expect(f.calls).toHaveLength(0);
      } finally {
        await f.close();
      }
    },
  );

  it("answers an unknown full commit SHA as not found without waiting on the archive", async () => {
    const f = await fixture();
    try {
      const name = `${UNKNOWN_SHA}.zip`;
      const started = Date.now();
      const response = await f.rest(name);
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
      await expect(f.read(canonical(name))).rejects.toMatchObject({
        data: { code: "NOT_FOUND" },
      });
      expect(Date.now() - started).toBeLessThan(5_000);
      // Only the commit lookups reached the origin; no archive was requested.
      expect(f.calls.every((url) => url.includes("/git/commits/"))).toBe(true);
      expect(f.calls).toHaveLength(2);
    } finally {
      await f.close();
    }
  });

  it("downloads a known full commit SHA after resolving it", async () => {
    const f = await fixture();
    try {
      const name = `${KNOWN_SHA}.zip`;
      const response = await f.rest(name);
      expect(response.status).toBe(200);
      expect(Buffer.from(await response.arrayBuffer())).toEqual(zip);
      const content = (await f.read(canonical(name))).contents[0];
      if (!("blob" in content)) throw new Error("Expected archive blob");
      expect(Buffer.from(content.blob, "base64")).toEqual(zip);
      expect(f.calls.map((url) => url.split("?")[0].split("/").at(-1))).toEqual(
        [KNOWN_SHA, name, KNOWN_SHA, name],
      );
    } finally {
      await f.close();
    }
  });

  it.each([400, 422])(
    "reports upstream %s for a reference as bad input, not an outage",
    async (status) => {
      const f = await fixture();
      f.fail(status);
      try {
        const response = await f.rest("main.zip");
        expect(response.status).toBe(400);
        expect((await response.json()).error.code).toBe("BAD_USER_INPUT");
        await expect(f.read(canonical("main.zip"))).rejects.toMatchObject({
          data: { code: "BAD_USER_INPUT" },
        });
      } finally {
        await f.close();
      }
    },
  );

  it.each([404, 503])(
    "refuses upstream %s without returning archive bytes",
    async (status) => {
      const f = await fixture();
      f.fail(status);
      try {
        expect((await f.rest("main.zip")).status).toBe(status);
        await expect(f.read(canonical("main.zip"))).rejects.toThrow();
      } finally {
        await f.close();
      }
    },
  );
});

/**
 * w6/010. The published v1 contract told callers to name `gitea-main.zip` and
 * promised only zip/gzip media types, while the repository serves native
 * reference names (`main.zip`, `main.tar.gz`) as `application/octet-stream`.
 */
describe("the published archive contract", () => {
  type ArchiveDocument = {
    paths: Record<
      string,
      {
        get: {
          parameters: { name: string; schema: { example?: string } }[];
          responses: { 200: { content: Record<string, unknown> } };
        };
      }
    >;
  };
  // Generating the whole v1 document costs about two seconds of CPU, which
  // the full suite's parallel load stretched past the test timeout (w1/198).
  // It is the fixture, not the behaviour under test, so it runs once, under a
  // budget of its own.
  let document: ArchiveDocument;
  beforeAll(() => {
    document = generateV1OpenAPIDocument() as unknown as ArchiveDocument;
  }, 60_000);
  const spec = () =>
    document.paths["/api-gateway/v1/ledgers/{owner}/{name}/archive/{archive}"]
      .get;

  it("publishes an example that reaches the archive on REST and MCP", async () => {
    const f = await fixture();
    try {
      const example = spec().parameters.find((p) => p.name === "archive")
        ?.schema.example as string;
      expect(example).toBe("main.zip");
      const response = await f.rest(example);
      expect(response.status).toBe(200);
      expect(Buffer.from(await response.arrayBuffer())).toEqual(zip);
      const content = (await f.read(canonical(example))).contents[0];
      if (!("blob" in content)) throw new Error("Expected archive blob");
      expect(Buffer.from(content.blob, "base64")).toEqual(zip);
    } finally {
      await f.close();
    }
  });

  it("documents the media type the repository actually sends", async () => {
    expect(Object.keys(spec().responses[200].content)).toContain(
      "application/octet-stream",
    );
    const f = await fixture();
    f.serveAs("application/octet-stream");
    try {
      for (const name of ["main.zip", "main.tar.gz"]) {
        const response = await f.rest(name);
        expect(response.headers.get("content-type")).toBe(
          "application/octet-stream",
        );
        const content = (await f.read(canonical(name))).contents[0];
        expect(content.mimeType).toBe("application/octet-stream");
      }
    } finally {
      await f.close();
    }
  });

  it("forwards every reference name unchanged, prefix included", async () => {
    // `gitea-main` can itself be a branch, so nothing strips the prefix.
    const f = await fixture();
    try {
      for (const name of ["main.zip", "main.tar.gz", "gitea-main.zip"]) {
        expect((await f.rest(name)).status).toBe(200);
        await f.read(canonical(name));
      }
      expect(f.calls.map((url) => url.split("/").at(-1))).toEqual([
        "main.zip",
        "main.zip",
        "main.tar.gz",
        "main.tar.gz",
        "gitea-main.zip",
        "gitea-main.zip",
      ]);
    } finally {
      await f.close();
    }
  });
});
