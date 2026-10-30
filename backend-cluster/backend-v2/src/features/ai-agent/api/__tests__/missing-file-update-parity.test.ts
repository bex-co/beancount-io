import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { FavaApiError } from "@/foundation/fava";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";
import type { McpRequestContext } from "../mcp-context";

/**
 * w21/468. The ledger service answers an update of a path that no longer exists
 * with 404 (Gitea answered 500, which read as SERVICE_UNAVAILABLE and told the
 * caller to retry a save that can never succeed); every surface must carry it as
 * NOT_FOUND.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const GONE = "File qa.bean does not exist";
const missing = () =>
  new FavaApiError(GONE, 404, {
    success: false,
    error: GONE,
    code: null,
    details: null,
  } as never);

async function fixture() {
  const changeLedgerFiles = jest.fn(async () => {
    throw missing();
  });
  const updateLedgerFile = jest.fn(async () => {
    throw missing();
  });
  const factory = {
    getPublicApiClient: async () => ({
      // The file-write gate projects bean-check over the new contents.
      reports: {
        checkProjectedErrors: async () => ({
          data: { success: true, data: [] },
        }),
      },
      ledgers: {
        changeLedgerFiles,
        updateLedgerFile,
        getLedgerFilesContent: async () => ({
          data: {
            success: true,
            data: [
              {
                path: "qa.bean",
                name: "qa.bean",
                type: "file",
                sha: "old",
                content: "; qa\n",
              },
            ],
          },
        }),
      },
    }),
  };
  const authorization = new AuthorizationService(
    { check: jest.fn().mockResolvedValue(true) },
    jest.fn(),
  );
  const services = {
    ledgerRepo: new LedgerRepoService(factory as never, authorization),
  };
  const workflow = new LedgerWorkflow(
    factory as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    config,
    authorization,
  );
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
  const client = new Client({ name: "missing-file", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    workflow,
    put: (body: Record<string, string>) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/files/qa.bean`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    update: () =>
      client.callTool({
        name: "updateLedgerFiles",
        arguments: {
          ledger: "alice/main",
          description: "edit qa",
          files: [
            { path: "qa.bean", old_string: "; qa", new_string: "; edited" },
          ],
        },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("an update of a file the ledger no longer has", () => {
  it("is 404 NOT_FOUND on a REST PUT", async () => {
    const f = await fixture();
    try {
      const response = await f.put({ content: "; qa\n", sha: "old" });
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({
        error: { code: "NOT_FOUND" },
      });
    } finally {
      await f.close();
    }
  });

  it("is NOT_FOUND on the MCP updateLedgerFiles tool", async () => {
    const f = await fixture();
    try {
      const result = await f.update();
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({
        error: { code: "NOT_FOUND" },
      });
    } finally {
      await f.close();
    }
  });

  it("is a NotFoundError on GraphQL's updateLedgerFile", async () => {
    const f = await fixture();
    try {
      await expect(
        f.workflow.updateLedgerFile({
          identity,
          ledgerId: "alice/main",
          input: { path: "qa.bean", content: "OyBxYQo=", sha: "old" },
          platform: "web",
        }),
      ).rejects.toMatchObject({ category: "NOT_FOUND" });
    } finally {
      await f.close();
    }
  });
});
