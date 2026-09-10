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
async function listen(server: http.Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
async function fixture(identity = readOnlyToken) {
  const calls: string[] = [];
  let status = 200;
  const origin = http.createServer((req, res) => {
    calls.push(req.url!);
    if (status !== 200) {
      res.statusCode = status;
      res.end("upstream failure");
      return;
    }
    const name = req.url!.split("/").at(-1)!;
    const zipped = name.endsWith(".zip");
    res.setHeader(
      "Content-Type",
      zipped ? "application/zip" : "application/gzip",
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
    favaApi: { baseUrl },
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
    rest: (archive: string) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/archive/${archive}`),
    legacy: (archive: string) =>
      fetch(`${legacyUrl}/api-gateway/ledgers/alice%2Fmain/archive/${archive}`),
    read: (uri: string) => client.readResource({ uri }),
    close: async () => {
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
      expect((await f.rest("main.zip")).status).toBe(403);
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
