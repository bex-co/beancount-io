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
import { createFakeLedger, type Snapshot } from "./fake-ledger";

/**
 * w31/102. A file delete with `removeIncludes` rewrites each includer without
 * its include line, so every later line of that file sits one higher in the
 * text bean-check reads. A preview and a refusal commit nothing, so both must
 * name each new error at its line in the file the caller has: MCP
 * `deleteLedgerFiles` and REST `DELETE …/files/{path}` alike. A committed
 * `allowInvalid` delete reports the line after the commit, where the error
 * then lives. GraphQL `deleteLedgerFile` has no file-write gate (w1/210).
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};

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
  const client = new Client({ name: "include-removal-lines", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    snapshot: ledger.snapshot,
    /** Delete `paths` with `removeIncludes`; what the caller reads back. */
    remove: async (
      surface: string,
      paths: string[],
      flags: { dryRun?: boolean; allowInvalid?: boolean },
    ): Promise<
      | { refused: { code?: string; message?: string } }
      | { newErrors: unknown[] }
    > => {
      if (surface === "rest") {
        const [path] = paths;
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/files/${path}`,
          {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ removeIncludes: true, ...flags }),
          },
        );
        const body = (await response.json()) as {
          newErrors?: unknown[];
          error?: { code?: string; message?: string };
        };
        return response.status === 200
          ? { newErrors: body.newErrors ?? [] }
          : { refused: body.error ?? {} };
      }
      const result = await client.callTool({
        name: "deleteLedgerFiles",
        arguments: {
          description: "prune",
          files: paths.map((path) => ({ path })),
          remove_includes: true,
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
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

const NEVER = "Account Assets:Incl was never opened";
const INCL = "2026-01-01 open Assets:Incl USD\n";

/** One include at line 4, a stranded `balance` above it (3) and below it (6). */
const MAIN = [
  "; main",
  "2026-01-01 open Assets:Kept USD",
  "2026-07-31 balance Assets:Incl 0.00 USD",
  'include "incl.bean"',
  "",
  "2026-08-31 balance Assets:Incl 0.00 USD",
  "",
].join("\n");

/** Two include lines reaching the one file (1 and 3), a stranded `balance` at 5. */
const MAIN_TWICE = [
  'include "incl.bean"',
  "2026-01-01 open Assets:Kept USD",
  'include "./incl.bean"',
  "",
  "2026-08-31 balance Assets:Incl 0.00 USD",
  "",
].join("\n");

const at = (...lines: number[]) =>
  lines.map((line) => ({ message: NEVER, source: `main.bean:${line}` }));

const CASES = [
  {
    name: "an error below the dropped include moves to its line; one above keeps its",
    snapshot: { "main.bean": MAIN, "incl.bean": INCL },
    expected: at(3, 6),
  },
  {
    name: "an includer that loses two include lines maps both",
    snapshot: { "main.bean": MAIN_TWICE, "incl.bean": INCL },
    expected: at(5),
  },
];

describe.each(["rest", "mcp"])(
  "a removeIncludes delete names new errors at the current line via %s (w31/102)",
  (surface) => {
    describe.each(CASES)("$name", ({ snapshot, expected }) => {
      it("previews them there, committing nothing", async () => {
        const f = await fixture(snapshot);
        try {
          expect(
            await f.remove(surface, ["incl.bean"], { dryRun: true }),
          ).toEqual({ newErrors: expected });
          expect(f.snapshot()).toEqual(snapshot);
        } finally {
          await f.close();
        }
      });

      it("refuses the commit naming the same lines", async () => {
        const f = await fixture(snapshot);
        try {
          const outcome = await f.remove(surface, ["incl.bean"], {});
          expect(outcome).toEqual({
            refused: expect.objectContaining({ code: "VALIDATION_FAILED" }),
          });
          const { message } = (outcome as { refused: { message: string } })
            .refused;
          for (const { message: error, source } of expected)
            expect(message).toContain(`${error} (${source})`);
          expect(message.match(/main\.bean:\d+/g)).toEqual(
            expected.map(({ source }) => source),
          );
          expect(f.snapshot()).toEqual(snapshot);
        } finally {
          await f.close();
        }
      });
    });

    it("keeps the post-delete line on a commit allowInvalid lets through", async () => {
      const f = await fixture({ "main.bean": MAIN, "incl.bean": INCL });
      try {
        expect(
          await f.remove(surface, ["incl.bean"], { allowInvalid: true }),
        ).toEqual({ newErrors: at(3, 5) });
        // That is where the stranded entry now is.
        expect(f.snapshot()["main.bean"].split("\n")[4]).toBe(
          "2026-08-31 balance Assets:Incl 0.00 USD",
        );
      } finally {
        await f.close();
      }
    });
  },
);

// MCP batches deletes: one call can drop an include line per deleted file.
it("maps the lines of two deleted files' includes in one MCP call (w31/102)", async () => {
  const snapshot = {
    "main.bean": [
      'include "a.bean"',
      'include "b.bean"',
      "",
      "2026-08-31 balance Assets:A 0.00 USD",
      "2026-08-31 balance Assets:B 0.00 USD",
      "",
    ].join("\n"),
    "a.bean": "2026-01-01 open Assets:A USD\n",
    "b.bean": "2026-01-01 open Assets:B USD\n",
  };
  const expected = [
    { message: "Account Assets:A was never opened", source: "main.bean:4" },
    { message: "Account Assets:B was never opened", source: "main.bean:5" },
  ];
  const f = await fixture(snapshot);
  try {
    expect(
      await f.remove("mcp", ["a.bean", "b.bean"], { dryRun: true }),
    ).toEqual({ newErrors: expected });
    const outcome = await f.remove("mcp", ["a.bean", "b.bean"], {});
    expect(
      (outcome as { refused: { message: string } }).refused.message.match(
        /main\.bean:\d+/g,
      ),
    ).toEqual(["main.bean:4", "main.bean:5"]);
  } finally {
    await f.close();
  }
});
