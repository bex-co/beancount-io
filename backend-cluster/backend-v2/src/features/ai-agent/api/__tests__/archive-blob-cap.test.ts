import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import type http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { readOnlyToken } from "@/server/rest/__tests__/v1-test-server";
import {
  archiveServiceFor,
  closed,
  startArchiveOrigin,
  type ArchiveOrigin,
} from "@/features/ledger/service/__tests__/archive-origin";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";
import { MCP_ARCHIVE_BLOB_MAX_BYTES } from "../mcp-resources";

/**
 * The MCP archive blob's size cap (w0/m8). A resource read is one JSON-RPC
 * message, so the archive is held whole where REST streams it; past the cap
 * the read is refused and points at the streaming download URL. "Stops
 * reading" is observed as the upstream socket closing.
 */
const URI = "beancount://alice/main/archive/main.zip";
const CHUNK = 256 * 1024;

let origin: ArchiveOrigin;
let client: Client;
let close: () => Promise<void>;

beforeEach(async () => {
  origin = await startArchiveOrigin();
  const authorization = new AuthorizationService(
    { check: jest.fn().mockResolvedValue(true) },
    jest.fn(),
  );
  const server = assembleMcpRegistry(
    {
      identity: readOnlyToken,
      ledgerArchiveService: archiveServiceFor(origin, authorization),
    } as unknown as McpRequestContext,
    { api: { scopeEnforcement: "enforce" } } as AppConfig,
  );
  client = new Client({ name: "archive-blob-cap", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  close = async () => {
    await client.close();
    await server.close();
  };
});

afterEach(async () => {
  await close();
  await origin.close();
});

/** Writes `total` bytes in chunks, honouring backpressure; `Infinity` never ends. */
function stream(res: http.ServerResponse, total: number) {
  let sent = 0;
  const pump = (): void => {
    while (sent < total && !res.destroyed) {
      const size = Math.min(CHUNK, total - sent);
      sent += size;
      if (!res.write(Buffer.alloc(size, 7))) {
        res.once("drain", pump);
        return;
      }
    }
    if (sent >= total) res.end();
  };
  pump();
}

async function refusedAndUpstreamClosed() {
  await expect(client.readResource({ uri: URI })).rejects.toMatchObject({
    code: -32003,
    data: {
      code: "OPERATION_NOT_ALLOWED",
      message: expect.stringContaining("8 MiB"),
      hint: expect.stringMatching(
        // w23/026: the fallback URL is served under the MCP endpoint, so the
        // hint says the same MCP credential works there.
        /beancount:\/\/alice\/main\/archive-download-url[\s\S]*same MCP credential/,
      ),
    },
  });
  expect(await closed(origin.requests[0])).toBe("closed");
}

describe("the MCP archive blob cap", () => {
  it.each([
    ["with", true],
    ["without", false],
  ])(
    "returns an archive of exactly the cap %s Content-Length",
    async (_label, declared) => {
      origin.serve((_req, res) => {
        res.setHeader("Content-Type", "application/zip");
        if (declared)
          res.setHeader("Content-Length", MCP_ARCHIVE_BLOB_MAX_BYTES);
        stream(res, MCP_ARCHIVE_BLOB_MAX_BYTES);
      });
      const content = (await client.readResource({ uri: URI })).contents[0];
      if (!("blob" in content)) throw new Error("Expected archive blob");
      const bytes = Buffer.from(content.blob, "base64");
      expect(bytes.length).toBe(MCP_ARCHIVE_BLOB_MAX_BYTES);
      expect(bytes.every((byte) => byte === 7)).toBe(true);
      expect(content.mimeType).toBe("application/zip");
    },
  );

  it("refuses by Content-Length before reading the body", async () => {
    // One chunk and then nothing: a reader that waited for the body would
    // never finish, so only the up-front check can answer.
    origin.serve((_req, res) => {
      res.setHeader("Content-Length", MCP_ARCHIVE_BLOB_MAX_BYTES + 1);
      res.write(Buffer.alloc(CHUNK, 7));
    });
    await refusedAndUpstreamClosed();
  });

  it("refuses an undeclared archive once it passes the cap and stops the upstream", async () => {
    // An endless body: the read can only end by giving up on it.
    origin.serve((_req, res) => stream(res, Infinity));
    await refusedAndUpstreamClosed();
  });
});
