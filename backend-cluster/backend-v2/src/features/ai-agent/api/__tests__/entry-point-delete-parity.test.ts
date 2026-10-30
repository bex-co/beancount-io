import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";
import type { McpRequestContext } from "../mcp-context";

/**
 * w23/031. Deleting main.bean committed, and every read of the ledger failed
 * until it was recreated. REST and MCP delete through the repo service; the
 * GraphQL mutation's refusal is in `rename-parity.test.ts`.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};

async function fixture() {
  const getLedgerFilesContent = jest.fn(
    async (_owner: string, _name: string, { files }: { files: string[] }) => ({
      data: {
        success: true,
        data: files.map((path) => ({
          path,
          name: path,
          type: "file",
          sha: `sha-${path}`,
          content: "; content\n",
        })),
      },
    }),
  );
  const changeLedgerFiles = jest.fn(async () => ({
    data: { success: true, data: {} },
  }));
  const services = {
    ledgerRepo: new LedgerRepoService(
      {
        getPublicApiClient: async () => ({
          // The file-write gate projects bean-check over the new contents.
          reports: {
            checkProjectedErrors: async () => ({
              data: { success: true, data: [] },
            }),
          },
          ledgers: {
            getLedgerFilesContent,
            changeLedgerFiles,
            // The delete-include guard lists the tree (w23/m4/t001); this
            // repository holds no includers.
            getLedgerDirContent: async () => ({
              data: { success: true, data: [] },
            }),
          },
        }),
      } as never,
      new AuthorizationService(
        { check: jest.fn().mockResolvedValue(true) },
        jest.fn(),
      ),
    ),
  };
  const rest = await startV1TestServer(
    { services } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    { identity, services } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "entry-point-delete", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    changeLedgerFiles,
    rest: (path: string) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/files/${path}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sha: `sha-${path}` }),
      }),
    mcp: (path: string, dry_run: boolean) =>
      client.callTool({
        name: "deleteLedgerFiles",
        arguments: { description: "tidy", dry_run, files: [{ path }] },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("deleting the ledger's entry point", () => {
  it("is refused on REST and in MCP previews and commits", async () => {
    const f = await fixture();
    try {
      const response = await f.rest("main.bean");
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: {
          code: "BAD_USER_INPUT",
          message: "main.bean is the ledger's entry point and can't be deleted",
        },
      });
      for (const dryRun of [true, false]) {
        const result = await f.mcp("main.bean", dryRun);
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({
          error: {
            code: "BAD_USER_INPUT",
            message: expect.stringContaining(
              "main.bean is the ledger's entry point",
            ),
            hint: expect.stringContaining("content"),
          },
        });
      }
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("still deletes any other file", async () => {
    const f = await fixture();
    try {
      expect((await f.rest("old.bean")).status).toBe(200);
      expect((await f.mcp("sub/main.bean", false)).isError).toBeFalsy();
      expect(f.changeLedgerFiles).toHaveBeenCalledTimes(2);
    } finally {
      await f.close();
    }
  });
});
