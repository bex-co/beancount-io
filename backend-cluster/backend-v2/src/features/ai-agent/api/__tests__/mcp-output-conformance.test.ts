import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import type { AppConfig } from "@/config/config";
import type { z } from "zod";
import type { McpRequestContext } from "../mcp-context";
import type {
  ledgerResultSchema,
  ledgerPreviewResultSchema,
} from "@/features/ledger/api/rest/v1/lifecycle-handler";
import type { fileParseResult } from "@/features/llm/api/file-parse-route";
import type { tempAssetUploadResult } from "@/features/s3/api/temp-asset-routes";

/**
 * w23/m31 — a write result must validate against the schema its tool
 * published, including the one a write preview exists to deliver: the new
 * bean-check errors it would introduce.
 *
 * The SDK client validates `structuredContent` against `outputSchema` on every
 * successful call and throws on a mismatch. The published item is
 * `additionalProperties: false`, so an error carrying a key the schema omits
 * (`code`, w23/230) made the whole result unreadable to a schema-validating
 * client, while REST and GraphQL were fine. Nothing else sees this: the
 * schema-only tests never hold a populated `newErrors`, and a handler's
 * TypeScript type accepts the extra key because the real error type is wider
 * than the schema's.
 */
/**
 * The other way a key leaks past `additionalProperties: false` is a handler
 * returning a service's result untouched: TypeScript accepts a value with
 * more keys than the schema's type when it is not an object literal. The four
 * MCP tools that pass a service result straight through are pinned here at
 * compile time: a service that grows a key the published schema lacks fails
 * `yarn typecheck` and this suite, naming the key in the error.
 */
type Returned<F extends (...args: never[]) => Promise<unknown>> = Awaited<
  ReturnType<F>
>;
type ExtraKeys<Actual, Published> = Exclude<keyof Actual, keyof Published>;
type MustBeNone<T extends never> = T;
export type PassthroughKeysMatchTheirSchemas = [
  MustBeNone<
    ExtraKeys<
      Returned<McpRequestContext["ledgerWorkflow"]["createLedger"]>,
      z.infer<typeof ledgerResultSchema> & { ledgerId: string }
    >
  >,
  MustBeNone<
    ExtraKeys<
      Returned<McpRequestContext["ledgerWorkflow"]["previewLedgerSetup"]>,
      z.infer<typeof ledgerPreviewResultSchema>
    >
  >,
  MustBeNone<
    ExtraKeys<
      Returned<McpRequestContext["llmService"]["parseFile"]>,
      z.infer<typeof fileParseResult>
    >
  >,
  MustBeNone<
    ExtraKeys<
      Returned<McpRequestContext["assetStorage"]["generateUploadUrl"]>,
      z.infer<typeof tempAssetUploadResult>
    >
  >,
];

const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;

/** What bean-check reports: message and source, plus the engine's stable code. */
const NEW_ERROR = {
  message: "Account Expenses:Nope was never opened",
  source: "main.bean:93",
  code: "E1001",
};

const VALIDATION = {
  errorsBefore: 0,
  errorsAfter: 1,
  newErrors: [NEW_ERROR],
  valid: false,
};

function ctxFor(services: Record<string, unknown>): McpRequestContext {
  return {
    services: {
      ledgerData: { getErrors: async () => [] },
      ledgerRepo: {
        changeFiles: async () => undefined,
        getFilesContent: async () => [],
        // The engine's own shape; `toBeanCheckErrors` turns it into NEW_ERROR.
        checkProjectedFiles: async () => [
          {
            message: NEW_ERROR.message,
            source: { filename: "main.bean", lineno: 93 },
            code: NEW_ERROR.code,
          },
        ],
      },
      ...services,
    },
    ledgerEntryService: services.ledgerEntryService,
    identity: {
      userId: "usr_1",
      method: "oauth",
      scopes: new Set(["ledger.read", "ledger.write"]),
      tokenId: "tok_1",
      ledgerScope: "alice/main",
    },
    ledgerId: "alice/main",
    llmService: {},
    ledgerReceiptWorkflow: {},
  } as unknown as McpRequestContext;
}

async function connect(ctx: McpRequestContext) {
  const server = assembleMcpRegistry(ctx, config);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1.0.0" });
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

const PREVIEWS: {
  tool: string;
  services: Record<string, unknown>;
  args: Record<string, unknown>;
}[] = [
  {
    tool: "appendLedgerText",
    services: {
      ledgerEntryService: {
        appendDirectiveText: async () => ({
          message: "Would append 1 directive",
          dryRun: true,
          count: 1,
          diff: [],
          appendedUnsorted: [],
          wrote: [],
          entryHashes: [],
          ...VALIDATION,
        }),
      },
    },
    args: { text: "2026-01-01 open Assets:Cash\n", dry_run: true },
  },
  {
    tool: "addLedgerEntries",
    services: {
      ledgerEntryService: {
        addBulkEntries: async () => ({
          success: true,
          dryRun: true,
          files: ["main.bean"],
          preview: [{ path: "main.bean", text: "2026-01-01 open Assets:Cash" }],
          entryHashes: [],
          validation: VALIDATION,
        }),
      },
    },
    args: {
      entries: [
        { type: "open", entry: { date: "2026-01-01", account: "Assets:Cash" } },
      ],
      dry_run: true,
    },
  },
  {
    tool: "createLedgerFiles",
    services: {},
    args: {
      files: [{ path: "new.bean", content: "2026-01-01 open Assets:Cash\n" }],
      message: "add file",
      dry_run: true,
    },
  },
];

/**
 * Tools whose `validation` rides the same `writeValidationSchema` but whose
 * handler path is not stubbed here: the published-schema check below covers
 * the item they share, and the handler-level audit is w23/m31/t003.
 */
const SHARED_SCHEMA_ONLY: Record<string, string> = {
  updateLedgerFiles: "same executor as createLedgerFiles",
  deleteLedgerFiles: "same executor as createLedgerFiles",
  updateEntrySource: "source-slice executor; needs entry-hash fixtures (t003)",
  deleteEntrySource: "source-slice executor; needs entry-hash fixtures (t003)",
  deleteEntrySources: "source-slice executor; needs entry-hash fixtures (t003)",
  renameLedgerFile: "move workflow; needs a ledgerWorkflow stub (t003)",
  insertReceiptTransaction: "receipt workflow; needs a workflow stub (t003)",
  syncBankTransactions: "bank workflow; needs a bank stub (t003)",
  importStagedBankTransactions: "bank workflow; needs a bank stub (t003)",
  discardStagedBankTransactions: "bank workflow; needs a bank stub (t003)",
};

describe("a write preview's new bean-check errors validate against the published schema (w23/230)", () => {
  it.each(PREVIEWS)(
    "$tool returns newErrors[].code to a schema-validating client",
    async ({ tool, services, args }) => {
      const { client, close } = await connect(ctxFor(services));
      try {
        // The SDK client compiles each tool's published `outputSchema` when
        // it lists tools and throws when `structuredContent` breaks it, so
        // list first: without it nothing is validated. Reaching the
        // assertions is the first proof.
        await client.listTools();
        const result = await client.callTool({ name: tool, arguments: args });

        expect(result.isError).toBeUndefined();
        const structured = result.structuredContent as {
          ok: boolean;
          result: { validation: { valid: boolean; newErrors: unknown[] } };
        };
        expect(structured.ok).toBe(true);
        expect(structured.result.validation.valid).toBe(false);
        expect(structured.result.validation.newErrors).toEqual([NEW_ERROR]);
      } finally {
        await close();
      }
    },
  );

  it("publishes `code` on the error item every write tool shares", async () => {
    const { client, close } = await connect(ctxFor({}));
    try {
      const { tools } = await client.listTools();
      const at = (node: unknown, ...path: string[]): unknown =>
        path.reduce<unknown>(
          (value, key) => (value as Record<string, unknown> | undefined)?.[key],
          node,
        );
      const items = tools
        .map((t) => ({
          name: t.name,
          item: at(
            t.outputSchema,
            "properties",
            "result",
            "properties",
            "validation",
            "properties",
            "newErrors",
            "items",
            "properties",
          ),
        }))
        .filter((t) => t.item !== undefined);

      // Every tool that publishes the shared item is either driven through
      // its real handler above or named here with its reason, so a new write
      // tool cannot join the contract unexamined.
      expect(items.map((t) => t.name).sort()).toEqual(
        [
          ...PREVIEWS.map((p) => p.tool),
          ...Object.keys(SHARED_SCHEMA_ONLY),
        ].sort(),
      );
      const missing = items
        .filter((t) => !Object.keys(t.item as object).includes("code"))
        .map((t) => t.name);
      expect(missing).toEqual([]);
    } finally {
      await close();
    }
  });
});
