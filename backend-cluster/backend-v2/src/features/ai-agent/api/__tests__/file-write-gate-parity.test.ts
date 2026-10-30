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
 * w23/m15. A file write that adds bean-check errors the ledger did not have
 * is refused with VALIDATION_FAILED, identically on REST (PUT, DELETE) and
 * MCP (create, update, delete), on commit and on dry run; `allowInvalid` /
 * `allow_invalid` commits deliberately; errors the ledger already had never
 * block.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const NEW_ERROR = {
  message: "Account Assets:Chekcing was never opened",
  source: { filename: "main.bean", lineno: 3 },
};

async function fixture(opts: { current?: unknown[]; projected: unknown[] }) {
  const changeLedgerFiles = jest.fn(async () => ({
    data: { success: true, data: {} },
  }));
  const services = {
    ledgerData: { getErrors: jest.fn().mockResolvedValue(opts.current ?? []) },
    ledgerRepo: new LedgerRepoService(
      {
        getPublicApiClient: async () => ({
          reports: {
            checkProjectedErrors: async () => ({
              data: { success: true, data: opts.projected },
            }),
          },
          ledgers: {
            changeLedgerFiles,
            getLedgerFilesContent: async (
              _owner: string,
              _name: string,
              { files }: { files: string[] },
            ) => ({
              data: {
                success: true,
                data: files
                  .filter((path) => !path.startsWith("n"))
                  .map((path) => ({
                    path,
                    name: path,
                    type: "file",
                    sha: `sha-${path}`,
                    content: "; content\n",
                  })),
              },
            }),
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
  const client = new Client({ name: "file-write-gate", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  const url = (path: string) =>
    `${rest.url}/api-gateway/v1/ledgers/alice/main/files/${path}`;
  const send = (method: string, path: string, body: object) =>
    fetch(url(path), {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  return {
    changeLedgerFiles,
    put: (body: object) =>
      send("PUT", "new.bean", { content: "; x\n", message: "m", ...body }),
    del: (body: object) =>
      send("DELETE", "old.bean", {
        sha: "sha-old.bean",
        message: "m",
        ...body,
      }),
    mcp: (name: string, args: object) =>
      client.callTool({ name, arguments: { description: "tidy", ...args } }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

async function withFixture(
  opts: Parameters<typeof fixture>[0],
  run: (f: Awaited<ReturnType<typeof fixture>>) => Promise<void>,
) {
  const f = await fixture(opts);
  try {
    await run(f);
  } finally {
    await f.close();
  }
}

describe("file writes refuse new bean-check errors on every surface", () => {
  it("refuses a REST PUT and DELETE, commit and dryRun alike", () =>
    withFixture({ projected: [NEW_ERROR] }, async (f) => {
      for (const response of [
        await f.put({}),
        await f.put({ dryRun: true }),
        await f.del({}),
        await f.del({ dryRun: true }),
      ]) {
        expect(response.status).toBe(400);
        const body = (await response.json()) as any;
        expect(body.error.code).toBe("VALIDATION_FAILED");
        expect(JSON.stringify(body)).toContain("Assets:Chekcing");
      }
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    }));

  it("refuses the MCP create, update and delete tools, dry_run included", () =>
    withFixture({ projected: [NEW_ERROR] }, async (f) => {
      const calls = [
        ["createLedgerFiles", { files: [{ path: "n.bean", content: "x" }] }],
        [
          "updateLedgerFiles",
          { files: [{ path: "a.bean", content: "x", sha: "sha-a.bean" }] },
        ],
        [
          "deleteLedgerFiles",
          { files: [{ path: "a.bean", sha: "sha-a.bean" }] },
        ],
      ] as const;
      for (const [name, args] of calls) {
        for (const dry_run of [false, true]) {
          const result = await f.mcp(name, { ...args, dry_run });
          expect(result.isError).toBe(true);
          expect(result.structuredContent).toMatchObject({
            error: { code: "VALIDATION_FAILED" },
          });
        }
      }
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    }));

  it("commits deliberately with allowInvalid / allow_invalid", () =>
    withFixture({ projected: [NEW_ERROR] }, async (f) => {
      expect((await f.put({ allowInvalid: true })).status).toBe(200);
      expect((await f.del({ allow_invalid: true })).status).toBe(200);
      const result = await f.mcp("createLedgerFiles", {
        files: [{ path: "n.bean", content: "x" }],
        allow_invalid: true,
      });
      expect(result.isError).toBeFalsy();
      expect(f.changeLedgerFiles).toHaveBeenCalledTimes(3);
    }));

  it("lets a dryRun with allowInvalid preview without committing", () =>
    withFixture({ projected: [NEW_ERROR] }, async (f) => {
      const response = await f.put({ dryRun: true, allowInvalid: true });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ dryRun: true });
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    }));

  it("never blocks on errors the ledger already had", () =>
    withFixture({ current: [NEW_ERROR], projected: [NEW_ERROR] }, async (f) => {
      expect((await f.put({})).status).toBe(200);
      expect((await f.del({})).status).toBe(200);
      expect(f.changeLedgerFiles).toHaveBeenCalledTimes(2);
    }));
});
