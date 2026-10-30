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
 * w23/032. The ledger service now answers a stale sha and a create over an
 * existing file with 409, as it already did for a lost ref race; every
 * surface must carry that as CONFLICT rather than the caller's bad input.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const STALE =
  "the ledger changed under a concurrent write; re-read it and retry";
const TAKEN =
  "qa.bean already exists; update it with its sha, or choose another path";
const conflict = (message: string) =>
  new FavaApiError(message, 409, {
    success: false,
    error: message,
    code: null,
    details: null,
  } as never);

async function fixture(answer: string) {
  const changeLedgerFiles = jest.fn(async () => {
    throw conflict(answer);
  });
  const updateLedgerFile = jest.fn(async () => {
    throw conflict(answer);
  });
  const deleteLedgerFile = jest.fn(async () => {
    throw conflict(answer);
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
        deleteLedgerFile,
        getLedgerFilesContent: async () => ({
          data: { success: true, data: [] },
        }),
        getLedgerDirContent: async () => ({
          data: { success: true, data: [] },
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
  const client = new Client({ name: "write-conflict", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    changeLedgerFiles,
    workflow,
    put: (body: Record<string, string>) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/files/qa.bean`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    create: () =>
      client.callTool({
        name: "createLedgerFiles",
        arguments: {
          description: "add qa",
          files: [{ path: "qa.bean", content: "; qa\n" }],
        },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("a write the ledger answers with 409", () => {
  it("is 409 CONFLICT on a REST PUT with a stale sha", async () => {
    const f = await fixture(STALE);
    try {
      const response = await f.put({ content: "; qa\n", sha: "old" });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        error: { code: "CONFLICT", message: expect.stringContaining(STALE) },
      });
    } finally {
      await f.close();
    }
  });

  it("is CONFLICT naming the file on an MCP create over an existing path", async () => {
    const f = await fixture(TAKEN);
    try {
      const result = await f.create();
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({
        error: { code: "CONFLICT", message: expect.stringContaining(TAKEN) },
      });
    } finally {
      await f.close();
    }
  });

  it("is a ConflictError on GraphQL's updateLedgerFile", async () => {
    const f = await fixture(STALE);
    try {
      await expect(
        f.workflow.updateLedgerFile({
          identity,
          ledgerId: "alice/main",
          input: { path: "qa.bean", content: "OyBxYQo=", sha: "old" },
          platform: "web",
        }),
      ).rejects.toMatchObject({ category: "CONFLICT" });
    } finally {
      await f.close();
    }
  });

  // w21/550: the ledger service's single-file delete answered a stale sha with
  // 400 (Gitea 1.24), which GraphQL read as BAD_USER_INPUT while REST and MCP,
  // through /change-files, said CONFLICT. The service now answers 409 for it
  // (its own error-middleware test pins that); GraphQL carries it as CONFLICT.
  it("is a ConflictError on GraphQL's deleteLedgerFile", async () => {
    const f = await fixture(STALE);
    try {
      await expect(
        f.workflow.deleteLedgerFile({
          identity,
          ledgerId: "alice/main",
          input: { path: "qa.bean", sha: "old", message: "delete qa" },
        }),
      ).rejects.toMatchObject({ category: "CONFLICT" });
    } finally {
      await f.close();
    }
  });
});
