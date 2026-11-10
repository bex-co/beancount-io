import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { unloadedLedgerFiles } from "@/features/ledger/utils/file-write-gate";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";
import type { McpRequestContext } from "../mcp-context";

/**
 * w1/227. A `.bean` file nothing includes was reported "No new bean-check
 * errors": its entries count nowhere and bean-check never read them, so the
 * green verdict said nothing about it. Each surface now names it, and
 * neither refuses the write nor includes the file (w21/588).
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const ORPHAN = "qa-x/orphan.bean";
const INCLUDED = "accounts.bean";
const CONTENT =
  '2026-09-10 * "x" "y"\n  Expenses:Nope  5.00 USD\n  Assets:Cash\n';

async function fixture() {
  const changeLedgerFiles = jest.fn(async () => ({
    data: { success: true, data: {} },
  }));
  const getProjectedSourceFiles = jest.fn(async () => ({
    data: { success: true, data: ["main.bean", INCLUDED] },
  }));
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const factory = {
    getPublicApiClient: async () => ({
      reports: {
        checkProjectedErrors: async () => envelope([]),
        getProjectedSourceFiles,
      },
      ledgers: {
        changeLedgerFiles,
        getLedgerFilesContent: async () => envelope([]),
        getLedgerDirContent: async () => envelope([]),
        createLedgerFile: async (
          _o: string,
          _n: string,
          file: { path: string },
        ) =>
          envelope({
            name: file.path.split("/").at(-1),
            path: file.path,
            type: "file",
            sha: "sha-new",
            size: CONTENT.length,
          }),
      },
    }),
  };
  const authorization = new AuthorizationService(
    { check: jest.fn().mockResolvedValue(true) },
    jest.fn(),
  );
  const services = {
    ledgerData: { getErrors: jest.fn().mockResolvedValue([]) },
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
  const client = new Client({ name: "unloaded-file", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    getProjectedSourceFiles,
    mcp: async (path: string, dry_run: boolean) => {
      const result = await client.callTool({
        name: "createLedgerFiles",
        arguments: {
          description: "split August",
          files: [{ path, content: CONTENT }],
          dry_run,
        },
      });
      return (result.structuredContent as { result: Record<string, unknown> })
        .result;
    },
    rest: async (path: string, dryRun: boolean) => {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/files/${path}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: CONTENT, message: "m", dryRun }),
        },
      );
      return (await response.json()) as Record<string, unknown>;
    },
    gql: (path: string) =>
      workflow.createLedgerFile({
        identity,
        ledgerId: "alice/main",
        input: {
          path,
          content: Buffer.from(CONTENT).toString("base64"),
          message: "m",
        },
        platform: "web",
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

const NOTICE = `${ORPHAN} is not included by any loaded file: its entries don't count and were not checked.`;

describe("a ledger file nothing includes", () => {
  it.each([true, false])(
    "is named by the MCP create tool (dry_run %p)",
    async (dryRun) => {
      const f = await fixture();
      try {
        const result = await f.mcp(ORPHAN, dryRun);
        expect(result.notLoaded).toEqual([ORPHAN]);
        expect(result.summary).toContain(NOTICE);
      } finally {
        await f.close();
      }
    },
  );

  it.each([true, false])("is named by REST PUT (dryRun %p)", async (dryRun) => {
    const f = await fixture();
    try {
      expect(await f.rest(ORPHAN, dryRun)).toMatchObject({
        ok: true,
        notLoaded: [ORPHAN],
      });
    } finally {
      await f.close();
    }
  });

  it("is named by GraphQL createLedgerFile", async () => {
    const f = await fixture();
    try {
      expect(await f.gql(ORPHAN)).toMatchObject({ notLoaded: [ORPHAN] });
    } finally {
      await f.close();
    }
  });
});

describe("a ledger file an include reaches", () => {
  it("is named by no surface", async () => {
    const f = await fixture();
    try {
      const mcp = await f.mcp(INCLUDED, true);
      expect(mcp.notLoaded).toBeUndefined();
      expect(mcp.summary).not.toContain("not included");
      expect((await f.rest(INCLUDED, true)).notLoaded).toBeUndefined();
      expect((await f.gql(INCLUDED)).notLoaded).toBeUndefined();
    } finally {
      await f.close();
    }
  });
});

describe("unloadedLedgerFiles", () => {
  const ask = (
    overlays: { path: string; content: string | null }[],
    projectedSourceFiles?: () => Promise<string[]>,
  ) =>
    unloadedLedgerFiles(
      { ledgerRepo: { projectedSourceFiles } },
      identity,
      "alice/main",
      overlays,
    );

  it("asks nothing for a write with no ledger file", async () => {
    const projectedSourceFiles = jest.fn(async () => ["main.bean"]);
    expect(
      await ask(
        [
          { path: "receipts/a.pdf", content: "x" },
          { path: "old.bean", content: null },
        ],
        projectedSourceFiles,
      ),
    ).toEqual([]);
    expect(projectedSourceFiles).not.toHaveBeenCalled();
  });

  it("names nothing when the ledger service cannot answer", async () => {
    expect(
      await ask([{ path: ORPHAN, content: "x" }], async () => {
        throw new Error("unavailable");
      }),
    ).toEqual([]);
  });
});
