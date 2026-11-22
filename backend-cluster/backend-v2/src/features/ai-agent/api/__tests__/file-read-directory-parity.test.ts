import "reflect-metadata";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

/**
 * w5/030. The ledger service answers a directory path with an entry of type
 * `dir` and no content, which every reader decoded to "" — a directory
 * masquerading as an empty file. Each adapter that reads file content through
 * `LedgerRepoService` must refuse it instead, and still read real files.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
// A Windows-1252 export: `E9` is "é" there and invalid UTF-8 (w23/030).
const LATIN1 = Buffer.concat([
  Buffer.from("; qa Caf"),
  Buffer.from([0xe9]),
  Buffer.from(" latin-1 comment\nqa-tail\n"),
]);

async function fixture() {
  const getLedgerFilesContent = jest.fn(
    async (_owner: string, _name: string, { files }: { files: string[] }) => ({
      data: {
        success: true,
        data: files.map((path) =>
          path === "FY2026"
            ? { path, name: path, type: "dir", sha: "d1", size: 0 }
            : path === "latin1.txt" || path === "utf8.bean"
              ? {
                  path,
                  name: path,
                  type: "file",
                  sha: "b1",
                  size: 0,
                  encoding: "base64",
                  content: (path === "latin1.txt"
                    ? LATIN1
                    : Buffer.from("; Café\n")
                  ).toString("base64"),
                }
              : {
                  path,
                  name: path,
                  type: "file",
                  sha: "f1",
                  size: 4,
                  content: "2026-01-01 open Assets:Cash\n",
                },
        ),
      },
    }),
  );
  const authorization = new AuthorizationService(
    { check: jest.fn().mockResolvedValue(true) },
    jest.fn(),
  );
  const services = {
    ledgerRepo: new LedgerRepoService(
      {
        getPublicApiClient: async () => ({
          ledgers: { getLedgerFilesContent },
        }),
      } as never,
      authorization,
    ),
  };
  const rest = await startV1TestServer(
    { services } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(pinnedReadToken);
  const server = assembleMcpRegistry(
    { identity: pinnedReadToken, services } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "file-read-directory", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    rest: (path: string) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/files/${path}`),
    resource: (path: string) =>
      client.readResource({ uri: `beancount://alice/main/files/${path}` }),
    tool: (path: string) =>
      client.callTool({
        name: "readLedgerFiles",
        arguments: { ledger: "alice/main", files: [{ path }] },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("reading a directory path as a file", () => {
  it("is refused as bad input on REST, the MCP resource, and the MCP tool", async () => {
    const f = await fixture();
    try {
      const response = await f.rest("FY2026");
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: {
          code: "BAD_USER_INPUT",
          message: "FY2026 is a directory, not a file",
        },
      });
      await expect(f.resource("FY2026")).rejects.toMatchObject({
        code: -32602,
        data: {
          code: "BAD_USER_INPUT",
          message: "FY2026 is a directory, not a file",
          hint: expect.stringContaining("listLedgerFiles"),
        },
      });
      const result = await f.tool("FY2026");
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({
        error: {
          code: "BAD_USER_INPUT",
          hint: expect.stringContaining("listLedgerFiles"),
        },
      });
    } finally {
      await f.close();
    }
  });

  it("still reads a real file on all three", async () => {
    const f = await fixture();
    try {
      const response = await f.rest("main.bean");
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        path: "main.bean",
        content: "2026-01-01 open Assets:Cash\n",
      });
      const resource = await f.resource("main.bean");
      expect(resource.contents[0]).toMatchObject({
        text: "2026-01-01 open Assets:Cash\n",
      });
      const result = await f.tool("main.bean");
      expect(result.isError).not.toBe(true);
    } finally {
      await f.close();
    }
  });
});

describe("reading a file that is not valid UTF-8", () => {
  it("marks the text lossy on REST and the MCP tool", async () => {
    const f = await fixture();
    try {
      const text = "; qa Caf\uFFFD latin-1 comment\nqa-tail\n";
      const response = await f.rest("latin1.txt");
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        path: "latin1.txt",
        content: text,
        sha: "b1",
        lossy: true,
      });
      const result = await f.tool("latin1.txt");
      expect(
        (result.structuredContent as { result: unknown[] }).result,
      ).toEqual([expect.objectContaining({ content: text, lossy: true })]);
    } finally {
      await f.close();
    }
  });

  it("leaves a valid UTF-8 file unmarked", async () => {
    const f = await fixture();
    try {
      expect(await (await f.rest("utf8.bean")).json()).toEqual({
        path: "utf8.bean",
        content: "; Café\n",
        sha: "b1",
      });
      const result = await f.tool("utf8.bean");
      expect(
        (result.structuredContent as { result: unknown[] }).result,
      ).toEqual([expect.not.objectContaining({ lossy: expect.anything() })]);
    } finally {
      await f.close();
    }
  });
});
