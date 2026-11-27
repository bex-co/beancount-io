import "reflect-metadata";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { FavaApiError } from "@/foundation/fava/api-client";
import type { AppConfig } from "@/config/config";
import type { Identity } from "@/server/api/identity";
import type { McpRequestContext } from "../mcp-context";
import { blobSha, createFakeLedger } from "./fake-ledger";

/**
 * w31/132. An `updateLedgerFiles` exact-text edit, or a `createLedgerFiles`
 * create, that loses the commit to a concurrent write is re-applied to what
 * landed (w23/017). The re-applied commit used to skip the gate, so an edit
 * that was valid on the file it read, but breaks the file it lands on,
 * committed without `allow_invalid` and answered `ok: true`. Each attempt is
 * now checked against the content it commits.
 *
 * The fake ledger versions files by content; a rival write lands as the
 * first commit starts, so the branch moves under it and Gitea refuses it.
 * Only MCP takes an exact-text edit: REST `PUT …/files/{path}` and GraphQL
 * `updateLedgerFile` take whole content and surface the conflict instead.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const LOST_RACE =
  "Ledger file conflict: the ledger changed under a concurrent write; re-read it and retry";

const lines = (...text: string[]) => text.join("\n");
const OPEN_PROBE = "2026-01-01 open Assets:Probe USD";
const PROBE_BALANCE = "2026-08-31 balance Assets:Probe 0.00 USD";
const NEVER_OPENED = "Account Assets:Probe was never opened";
const MAIN = lines('include "accounts/*.bean"', OPEN_PROBE, "; end", "");

/** Valid alone: nothing asserts `Assets:Probe` yet. */
const dropOpen = (main: string) => main.replace(`${OPEN_PROBE}\n`, "");
/** Harmless to any write here. */
const addNote = (main: string) => `${main}; rival\n`;
/** An error of the rival's own, committed without a gate. */
const addError = (main: string) => `${main}BAD\n`;

/** Each valid on `MAIN`; with `dropOpen` landed, each asserts an unopened account. */
const WRITES = {
  updateLedgerFiles: {
    path: "main.bean",
    old_string: "; end",
    new_string: `${PROBE_BALANCE}\n; end`,
  },
  createLedgerFiles: {
    path: "accounts/probe.bean",
    content: `${PROBE_BALANCE}\n`,
  },
} as const;
type Tool = keyof typeof WRITES;
const TOOLS = Object.keys(WRITES) as Tool[];

type Body = {
  files: {
    operation: string;
    path: string;
    content?: string | null;
    sha?: string | null;
  }[];
  message?: string;
};

async function fixture(rival: (main: string) => string, landsFirst = false) {
  const ledger = createFakeLedger([{ "main.bean": MAIN }]);
  const main = () => ledger.snapshot()["main.bean"]!;
  const publicClient = ledger.fava.getPublicApiClient;
  let racing = !landsFirst;
  const landRival = (
    commit: (o: string, n: string, body: Body) => Promise<unknown>,
  ) =>
    commit("alice", "main", {
      files: [
        {
          operation: "update",
          path: "main.bean",
          content: Buffer.from(rival(main())).toString("base64"),
        },
      ],
      message: "rival",
    });
  const fava = {
    ...ledger.fava,
    getPublicApiClient: async () => {
      const client = await publicClient();
      const commit = client.ledgers.changeLedgerFiles as (
        o: string,
        n: string,
        body: Body,
      ) => Promise<unknown>;
      return {
        ...client,
        ledgers: {
          ...client.ledgers,
          // Gitea's compare-and-swap: a stale blob sha, or a branch that
          // moved under the commit, refuses it.
          changeLedgerFiles: async (o: string, n: string, body: Body) => {
            const moved = racing;
            if (racing) {
              racing = false;
              await landRival(commit);
            }
            const stale = body.files.some(({ operation, path, sha }) => {
              const current = ledger.snapshot()[path];
              return (
                operation === "update" &&
                (current === undefined || blobSha(current) !== sha)
              );
            });
            if (moved || stale)
              throw new FavaApiError(LOST_RACE, 409, {
                error: LOST_RACE,
              } as never);
            return commit(o, n, body);
          },
        },
      };
    },
  };
  // The sequential control: the rival is already in the ledger.
  if (landsFirst) {
    const client = await publicClient();
    await landRival(client.ledgers.changeLedgerFiles as never);
  }
  const services = {
    ledgerData: { getErrors: jest.fn(async () => ledger.errors()) },
    ledgerRepo: new LedgerRepoService(
      fava as never,
      new AuthorizationService(
        { check: jest.fn().mockResolvedValue(true) },
        jest.fn(),
      ),
    ),
  };
  const server = assembleMcpRegistry(
    { identity, services } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "file-edit-write-race", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    ledger,
    main,
    call: async (tool: Tool, flags: { allowInvalid?: boolean } = {}) => {
      const result = await client.callTool({
        name: tool,
        arguments: {
          description: "qa race edit",
          files: [WRITES[tool]],
          dry_run: false,
          ...(flags.allowInvalid && { allow_invalid: true }),
        },
      });
      return {
        isError: result.isError === true,
        ...(result.structuredContent as {
          ok: boolean;
          result?: {
            commit?: string;
            count: number;
            validation: {
              errorsBefore: number;
              errorsAfter: number;
              newErrors: { message: string }[];
              valid: boolean;
            };
          };
          error?: { code?: string; message?: string };
        }),
      };
    },
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

async function withFixture(
  args: Parameters<typeof fixture>,
  run: (f: Awaited<ReturnType<typeof fixture>>) => Promise<void>,
) {
  const f = await fixture(...args);
  try {
    await run(f);
  } finally {
    await f.close();
  }
}

describe("a file edit re-applied after a lost race is checked again (w31/132)", () => {
  it.each(TOOLS)("%s is refused as when the rival had landed first", (tool) =>
    withFixture([dropOpen, true], async (f) => {
      const result = await f.call(tool);
      expect(result).toMatchObject({
        isError: true,
        error: {
          code: "VALIDATION_FAILED",
          message: expect.stringContaining(NEVER_OPENED),
        },
      });
      // The seed and the rival; this write committed nothing.
      expect(f.ledger.shas()).toHaveLength(2);
    }),
  );

  it.each(TOOLS)(
    "%s that would add an error on what landed is refused, the rival kept",
    (tool) =>
      withFixture([dropOpen], async (f) => {
        const result = await f.call(tool);
        expect(result).toMatchObject({
          isError: true,
          error: {
            code: "VALIDATION_FAILED",
            message: expect.stringContaining(NEVER_OPENED),
          },
        });
        expect(f.ledger.shas()).toHaveLength(2);
        expect(f.ledger.snapshot()).toEqual({ "main.bean": dropOpen(MAIN) });
        expect(f.ledger.errors()).toEqual([]);
      }),
  );

  it.each(TOOLS)(
    "%s with allow_invalid commits on top of the rival and reports the error",
    (tool) =>
      withFixture([dropOpen], async (f) => {
        const result = await f.call(tool, { allowInvalid: true });
        expect(result).toMatchObject({
          isError: false,
          ok: true,
          result: {
            commit: "c2",
            count: 1,
            validation: {
              errorsBefore: 0,
              errorsAfter: 1,
              newErrors: [{ message: NEVER_OPENED }],
              valid: false,
            },
          },
        });
        expect(f.ledger.shas()).toHaveLength(3);
        expect(f.main()).not.toContain(OPEN_PROBE);
        expect(Object.values(f.ledger.snapshot()).join("")).toContain(
          PROBE_BALANCE,
        );
      }),
  );

  it.each(TOOLS)("%s lands beside a rival it does not break", (tool) =>
    withFixture([addNote], async (f) => {
      const result = await f.call(tool);
      expect(result).toMatchObject({
        ok: true,
        result: { commit: "c2", validation: { newErrors: [], valid: true } },
      });
      expect(f.main()).toContain("; rival\n");
      expect(Object.values(f.ledger.snapshot()).join("")).toContain(
        PROBE_BALANCE,
      );
      expect(f.ledger.errors()).toEqual([]);
    }),
  );

  // The verdict is the committed attempt's: read around the first attempt,
  // it charged this write with the error the rival committed.
  it.each(TOOLS)(
    "%s does not report an error the rival added as its own",
    (tool) =>
      withFixture([addError], async (f) => {
        const result = await f.call(tool);
        expect(result).toMatchObject({
          ok: true,
          result: {
            commit: "c2",
            validation: {
              errorsBefore: 1,
              errorsAfter: 1,
              newErrors: [],
              valid: true,
            },
          },
        });
      }),
  );
});
