import "reflect-metadata";
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
import { blobSha, createFakeLedger, type Snapshot } from "./fake-ledger";

/**
 * w31/118. An `updateLedgerFiles` exact-text edit (`old_string` /
 * `new_string`) that adds or removes lines moves every line below it in the
 * text bean-check reads. A preview and a refusal commit nothing, so both name
 * each new error at its line in the file as it stands, as the entry writes do
 * (w31/116). An error in the text the edit writes keeps its line there, as
 * the diff shows it, and a committed `allow_invalid` edit reports the line the
 * error has once written.
 *
 * Only MCP takes an exact-text edit: REST `PUT …/files/{path}` and GraphQL
 * `updateLedgerFile` take the whole content. A whole-file write is all
 * written text, so it keeps its lines on MCP (`content`) and REST alike.
 * GraphQL file writes have no gate (w1/210).
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};

type Outcome =
  | { refused: { code?: string; message?: string } }
  | { newErrors: unknown[] };

async function fixture(snapshot: Snapshot) {
  const ledger = createFakeLedger([snapshot]);
  const services = {
    ledgerData: { getErrors: jest.fn(async () => ledger.errors()) },
    ledgerRepo: new LedgerRepoService(
      ledger.fava as never,
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
  const client = new Client({ name: "file-edit-lines", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    snapshot: ledger.snapshot,
    /** MCP `updateLedgerFiles` over `main.bean`; what the caller reads back. */
    update: async (
      files: object[],
      flags: { dryRun?: boolean; allowInvalid?: boolean },
    ): Promise<Outcome> => {
      const result = await client.callTool({
        name: "updateLedgerFiles",
        arguments: {
          description: "edit",
          files: files.map((file) => ({ path: "main.bean", ...file })),
          dry_run: flags.dryRun ?? false,
          ...(flags.allowInvalid && { allow_invalid: true }),
        },
      });
      const content = result.structuredContent as {
        result?: { validation?: { newErrors?: unknown[] } };
        error?: { code?: string; message?: string };
      };
      return result.isError
        ? { refused: content.error ?? {} }
        : { newErrors: content.result?.validation?.newErrors ?? [] };
    },
    /** REST `PUT …/files/main.bean` with the whole new content. */
    put: async (
      content: string,
      flags: { dryRun?: boolean },
    ): Promise<Outcome> => {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/files/main.bean`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            content,
            sha: blobSha(snapshot["main.bean"]),
            ...flags,
          }),
        },
      );
      const body = (await response.json()) as {
        newErrors?: unknown[];
        error?: { code?: string; message?: string };
      };
      return response.status === 200
        ? { newErrors: body.newErrors ?? [] }
        : { refused: body.error ?? {} };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

const NEVER = (account: string) => `Account ${account} was never opened`;
const at = (account: string, line: number) => ({
  message: NEVER(account),
  source: `main.bean:${line}`,
});
const lines = (...text: string[]) => text.join("\n");

const OPEN_PROBE = "2026-01-01 open Assets:Probe USD";
const PROBE_BALANCE = "2026-08-31 balance Assets:Probe 0.00 USD";

/**
 * `Assets:Probe` is opened on line 2 and asserted on line 6. An edit to the
 * `open` line that stops opening it strands the assertion.
 */
const MAIN = lines(
  "2026-01-01 open Assets:Kept USD",
  OPEN_PROBE,
  "",
  "2026-07-31 balance Assets:Kept 0.00 USD",
  "",
  PROBE_BALANCE,
  "",
);

/** The same assertion on line 6, below a three-line `open` block. */
const MAIN_LONG_OPEN = lines(
  "2026-01-01 open Assets:Kept USD",
  "; Probe: a scratch account",
  "; opened for the QA run",
  OPEN_PROBE,
  "",
  PROBE_BALANCE,
  "",
);

const RETIRED = "2026-01-01 open Assets:Retired USD";

const CASES = [
  {
    name: "an edit that grows a line into three",
    snapshot: { "main.bean": MAIN },
    files: [
      {
        old_string: OPEN_PROBE,
        new_string: lines("; Probe retired", "; see notes", RETIRED),
      },
    ],
    current: [at("Assets:Probe", 6)],
    written: [at("Assets:Probe", 8)],
  },
  {
    name: "an edit that shrinks three lines into one",
    snapshot: { "main.bean": MAIN_LONG_OPEN },
    files: [
      {
        old_string: lines(
          "; Probe: a scratch account",
          "; opened for the QA run",
          OPEN_PROBE,
        ),
        new_string: RETIRED,
      },
    ],
    current: [at("Assets:Probe", 6)],
    written: [at("Assets:Probe", 4)],
  },
  {
    name: "an edit that keeps the line count",
    snapshot: { "main.bean": MAIN },
    files: [{ old_string: OPEN_PROBE, new_string: RETIRED }],
    current: [at("Assets:Probe", 6)],
    written: [at("Assets:Probe", 6)],
  },
  {
    name: "two chained edits, one adding two lines and one removing a line",
    snapshot: { "main.bean": MAIN },
    files: [
      {
        old_string: "2026-01-01 open Assets:Kept USD",
        new_string: lines("2026-01-01 open Assets:Kept USD", "; one", "; two"),
      },
      { old_string: `${OPEN_PROBE}\n`, new_string: "" },
    ],
    current: [at("Assets:Probe", 6)],
    written: [at("Assets:Probe", 7)],
  },
  {
    name: "an error in the written text, above one the edit moves",
    snapshot: { "main.bean": MAIN },
    files: [
      {
        old_string: OPEN_PROBE,
        new_string: lines(
          RETIRED,
          "2026-08-01 balance Assets:Nope 0.00 USD",
          "; end",
        ),
      },
    ],
    // The assertion in the new text has no line in the file as it stands:
    // it keeps line 3, where the diff shows it.
    current: [at("Assets:Nope", 3), at("Assets:Probe", 6)],
    written: [at("Assets:Nope", 3), at("Assets:Probe", 8)],
  },
];

describe("an updateLedgerFiles exact-text edit names new errors at the current line (w31/118)", () => {
  describe.each(CASES)("$name", ({ snapshot, files, current }) => {
    it("previews them there, committing nothing", async () => {
      const f = await fixture(snapshot);
      try {
        expect(await f.update(files, { dryRun: true })).toEqual({
          newErrors: current,
        });
        expect(f.snapshot()).toEqual(snapshot);
      } finally {
        await f.close();
      }
    });

    it("refuses the commit naming the same lines", async () => {
      const f = await fixture(snapshot);
      try {
        const outcome = await f.update(files, {});
        expect(outcome).toEqual({
          refused: expect.objectContaining({ code: "VALIDATION_FAILED" }),
        });
        const { message } = (outcome as { refused: { message: string } })
          .refused;
        expect(message.match(/main\.bean:\d+/g)).toEqual(
          current.map(({ source }) => source),
        );
        expect(f.snapshot()).toEqual(snapshot);
      } finally {
        await f.close();
      }
    });
  });

  it.each(CASES)(
    "keeps the written line on a commit allow_invalid lets through: $name",
    async ({ snapshot, files, written }) => {
      const f = await fixture(snapshot);
      try {
        expect(await f.update(files, { allowInvalid: true })).toEqual({
          newErrors: written,
        });
        // That is where the stranded assertion now is.
        const [{ source }] = written.slice(-1);
        const line = Number(source.split(":")[1]);
        expect(f.snapshot()["main.bean"].split("\n")[line - 1]).toBe(
          PROBE_BALANCE,
        );
      } finally {
        await f.close();
      }
    },
  );
});

describe("a whole-file update keeps the written line, on MCP and REST alike (w31/118)", () => {
  const content = lines(
    "2026-01-01 open Assets:Kept USD",
    "; Probe retired",
    "; see notes",
    RETIRED,
    "",
    "2026-07-31 balance Assets:Kept 0.00 USD",
    "",
    PROBE_BALANCE,
    "",
  );

  it.each([
    ["mcp", { dryRun: true }],
    ["mcp", {}],
    ["rest", { dryRun: true }],
    ["rest", {}],
  ] as const)("via %s %o", async (surface, flags) => {
    const f = await fixture({ "main.bean": MAIN });
    try {
      const outcome =
        surface === "mcp"
          ? await f.update(
              [{ content, sha: blobSha(MAIN) }],
              flags as { dryRun?: boolean },
            )
          : await f.put(content, flags as { dryRun?: boolean });
      if ("dryRun" in flags) {
        expect(outcome).toEqual({ newErrors: [at("Assets:Probe", 8)] });
      } else {
        expect(
          (outcome as { refused: { message: string } }).refused.message.match(
            /main\.bean:\d+/g,
          ),
        ).toEqual(["main.bean:8"]);
      }
      expect(f.snapshot()).toEqual({ "main.bean": MAIN });
    } finally {
      await f.close();
    }
  });
});
