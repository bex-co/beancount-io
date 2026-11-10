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
const writer: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const NEW_ERROR = {
  message: "Account Assets:Chekcing was never opened",
  source: { filename: "main.bean", lineno: 3 },
};

async function fixture(opts: {
  current?: unknown[];
  projected: unknown[];
  readOnly?: boolean;
}) {
  const identity: Identity = opts.readOnly
    ? { ...writer, scopes: new Set(["ledger.read"]) }
    : writer;
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
    send,
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
  it("refuses a REST PUT and DELETE commit", () =>
    withFixture({ projected: [NEW_ERROR] }, async (f) => {
      for (const response of [await f.put({}), await f.del({})]) {
        expect(response.status).toBe(400);
        const body = (await response.json()) as any;
        expect(body.error.code).toBe("VALIDATION_FAILED");
        expect(JSON.stringify(body)).toContain("Assets:Chekcing");
      }
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    }));

  // w23/219: a preview reports the would-be errors instead of refusing.
  it("previews a REST PUT and DELETE dryRun as invalid, committing nothing", () =>
    withFixture({ projected: [NEW_ERROR] }, async (f) => {
      for (const response of [
        await f.put({ dryRun: true }),
        await f.del({ dryRun: true }),
      ]) {
        expect(response.status).toBe(200);
        const body = (await response.json()) as any;
        expect(body).toMatchObject({ dryRun: true, valid: false });
        expect(body.newErrors.length).toBeGreaterThan(0);
        expect(JSON.stringify(body.newErrors)).toContain("Assets:Chekcing");
      }
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    }));

  const mcpCalls = [
    ["createLedgerFiles", { files: [{ path: "n.bean", content: "x" }] }],
    [
      "updateLedgerFiles",
      { files: [{ path: "a.bean", content: "x", sha: "sha-a.bean" }] },
    ],
    ["deleteLedgerFiles", { files: [{ path: "a.bean", sha: "sha-a.bean" }] }],
  ] as const;

  it("refuses the MCP create, update and delete tools on commit", () =>
    withFixture({ projected: [NEW_ERROR] }, async (f) => {
      for (const [name, args] of mcpCalls) {
        const result = await f.mcp(name, { ...args, dry_run: false });
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({
          error: { code: "VALIDATION_FAILED" },
        });
      }
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    }));

  it("previews the MCP create, update and delete tools as invalid on dry_run", () =>
    withFixture({ projected: [NEW_ERROR] }, async (f) => {
      for (const [name, args] of mcpCalls) {
        const result = await f.mcp(name, { ...args, dry_run: true });
        expect(result.isError).toBeFalsy();
        const body = result.structuredContent as any;
        expect(body.ok).toBe(true);
        expect(body.result.dry_run).toBe(true);
        expect(body.result.validation.valid).toBe(false);
        expect(JSON.stringify(body.result.validation.newErrors)).toContain(
          "Assets:Chekcing",
        );
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

describe("a read-only credential is refused FORBIDDEN before any file lookup", () => {
  it("refuses a missing-file delete and update and a non-matching edit, REST and MCP", () =>
    withFixture({ projected: [], readOnly: true }, async (f) => {
      const calls = [
        ["deleteLedgerFiles", { files: [{ path: "nope.bean" }] }],
        [
          "updateLedgerFiles",
          { files: [{ path: "nope.bean", content: "x", sha: "s" }] },
        ],
        [
          "updateLedgerFiles",
          {
            files: [
              { path: "a.bean", old_string: "zzz-not-there", new_string: "b" },
            ],
          },
        ],
      ] as const;
      for (const [name, args] of calls) {
        for (const dry_run of [false, true]) {
          const result = await f.mcp(name, { ...args, dry_run });
          expect(result.isError).toBe(true);
          expect(result.structuredContent).toMatchObject({
            error: { code: "FORBIDDEN" },
          });
        }
      }
      const response = await f.del({ dryRun: true });
      expect(response.status).toBe(403);
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    }));
});

// w1/219: REST previewed an update or delete from a stale read as valid,
// and only the commit was refused; MCP refused the preview.
describe("a stale sha is refused as CONFLICT on preview and commit", () => {
  it.each([
    ["a stale", "sha-stale"],
    ["a malformed", "not-a-sha"],
  ])("refuses %s sha on a REST PUT and DELETE, dryRun or not", (_k, sha) =>
    withFixture({ projected: [] }, async (f) => {
      for (const dryRun of [true, false]) {
        for (const response of [
          await f.send("PUT", "a.bean", { content: "; x\n", sha, dryRun }),
          await f.send("DELETE", "a.bean", { sha, dryRun }),
        ]) {
          expect(response.status).toBe(409);
          const body = (await response.json()) as any;
          expect(body.error.code).toBe("CONFLICT");
          expect(body.error.message).toContain(
            "a.bean changed since you read it",
          );
        }
      }
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    }),
  );

  it("refuses the same on the MCP update and delete tools", () =>
    withFixture({ projected: [] }, async (f) => {
      for (const dry_run of [true, false]) {
        for (const [name, args] of [
          [
            "updateLedgerFiles",
            { files: [{ path: "a.bean", content: "x", sha: "sha-stale" }] },
          ],
          [
            "deleteLedgerFiles",
            { files: [{ path: "a.bean", sha: "sha-stale" }] },
          ],
        ] as const) {
          const result = await f.mcp(name, { ...args, dry_run });
          expect(result.isError).toBe(true);
          expect(result.structuredContent).toMatchObject({
            error: {
              code: "CONFLICT",
              message: expect.stringContaining(
                "a.bean changed since you read it",
              ),
            },
          });
        }
      }
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    }));

  it("still previews a current sha as valid", () =>
    withFixture({ projected: [] }, async (f) => {
      const response = await f.send("PUT", "a.bean", {
        content: "; x\n",
        sha: "sha-a.bean",
        dryRun: true,
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        dryRun: true,
        valid: true,
      });
    }));
});
