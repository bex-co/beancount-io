import { entriesBodySchema } from "@/features/ledger/api/rest/v1/entries-handler";
import { UnbalancedTransactionError } from "@/shared/errors";
import { parseLedgerId } from "@/shared/str";
import {
  sourceSliceInput,
  sourceSliceOutput,
  executeSourceSlice,
} from "./mcp-source-slices";
import {
  renameFileInput,
  renameFileResult,
} from "@/features/ledger/api/rest/v1/rename-handler";
import {
  parseReceiptInputSchema,
  parseReceiptOutputSchema,
  executeParseReceipt,
} from "../tools/parse-receipt-tool";
import {
  receiptInsertInput,
  receiptInsertResult,
} from "@/features/ledger/api/rest/v1/receipt-insert-handler";
import {
  fileParseInput,
  fileParseResult,
} from "@/features/llm/api/file-parse-route";
import {
  tempAssetUploadInput,
  tempAssetUploadResult,
} from "@/features/s3/api/temp-asset-routes";
import {
  ledgerStarInput,
  ledgerStarOutput,
  executeLedgerStar,
} from "./mcp-ledger-star";
import {
  pullRequestToolInput,
  pullRequestToolOutput,
  executePullRequestTool,
} from "./mcp-pull-requests";
import {
  lifecycleToolInput,
  lifecycleToolOutput,
  executeLifecycleTool,
} from "./mcp-lifecycle";
import {
  publicKeyToolInput,
  publicKeyToolOutput,
  executePublicKeyTool,
} from "./mcp-public-keys";
import {
  collaboratorToolInput,
  collaboratorToolOutput,
  executeCollaboratorTool,
} from "./mcp-collaborators";
import { z, type ZodTypeAny } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import {
  type McpRequestContext,
  resolveMcpLedger,
  ledgerSelection,
} from "./mcp-context";
import {
  bqlQueryInputSchema,
  bqlQueryOutputSchema,
  executeBqlQuery,
  executeStructuredBqlQuery,
  structuredBqlOutputSchema,
  description as bqlDescription,
} from "../tools/bql-query-tool";
import {
  listLedgerFilesInputSchema,
  listLedgerFilesOutputSchema,
  executeListLedgerFiles,
  description as listDescription,
} from "../tools/list-ledger-files-tool";
import {
  readLedgerFilesInputSchema,
  readLedgerFilesOutputSchema,
  executeReadLedgerFiles,
  description as readDescription,
} from "../tools/read-ledger-files-tool";
import {
  editLedgerFilesInputSchema,
  editLedgerFilesOutputSchema,
  executeEditLedgerFiles,
  description as editDescription,
} from "../tools/edit-ledger-files-tool";
import {
  executeManageApiKeys,
  manageApiKeysDescription,
  manageApiKeysInputSchema,
  manageApiKeysOutputSchema,
} from "../tools/api-key-tools";
import type { ToolContext } from "../tools/types";
import {
  mcpOutputSchema,
  toolOutputSchema,
  withWriteOutcome,
} from "../tools/types";
import {
  summarizeWrite,
  withPostWriteValidation,
} from "../tools/write-validation";
import {
  bankConnectionInputSchema,
  bankConnectionOutputSchema,
  bankImportInputSchema,
  bankImportOutputSchema,
  connectionDescription,
  executeBankConnection,
  executeBankImport,
  importDescription,
} from "../tools/bank-import-tool";
import {
  checkLedgerDescription,
  checkLedgerInputSchema,
  checkLedgerOutputSchema,
  executeCheckLedger,
  executeGetEntryContext,
  executeGetLedgerContext,
  executeListLedgers,
  getEntryContextDescription,
  getEntryContextInputSchema,
  getEntryContextOutputSchema,
  getLedgerContextDescription,
  getLedgerContextInputSchema,
  getLedgerContextOutputSchema,
  listLedgersDescription,
  listLedgersInputSchema,
  listLedgersOutputSchema,
} from "../tools/ledger-context-tools";

/**
 * One MCP tool, described rather than registered.
 *
 * The feature says what its tools are; the composition root turns that into the
 * one MCP registry and wraps each handler with the scope gate (ADR 0006 D1: a
 * feature contributes fragments and never stands up a server of its own). Kept
 * as data for the same reason the REST fragments are: the guard tests need to
 * enumerate the tools without constructing an `McpServer`, a `ToolContext`, or
 * anything that would drag the service layer into a unit test.
 */
export interface McpToolDescriptor {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: ZodTypeAny;
  /**
   * What the tool's `structuredContent` looks like, published in `tools/list`
   * so a client can validate what it receives instead of trusting it (ADR 0007
   * D8). Derived from the tool's own `toolOutputSchema` union by
   * `mcpOutputSchema`, which is the only shape MCP can actually publish — see
   * its comment for why the union itself cannot be registered.
   */
  readonly outputSchema: ZodTypeAny;
  /**
   * Selection hints published in `tools/list` (w2/m27), so clients can decide
   * what to auto-approve. Worst-case rule: the hints describe the most
   * destructive, least idempotent operation the tool can perform — a grouped
   * dispatcher carrying one deleting operation is destructive, even when its
   * other operations only read. The guard test refuses a tool without hints
   * and a `readOnlyHint: true` tool whose op-class is not `read`.
   */
  readonly annotations: ToolAnnotations;
  readonly execute: (
    toolCtx: McpRequestContext,
    input: never,
  ) => Promise<unknown>;
}

function withLedger(
  execute: (context: ToolContext, input: never) => Promise<unknown>,
): McpToolDescriptor["execute"] {
  return (context, input) => {
    const { ledger, ...argumentsWithoutTarget } = input as { ledger?: string };
    const ledgerId = resolveMcpLedger(context, ledger);
    return execute({ ...context, ledgerId }, argumentsWithoutTarget as never);
  };
}

/**
 * Shared `tools/list` annotation presets (w2/m27). The op-class decides
 * authority; these hints only describe it. `READ_ONLY` is paired exclusively
 * with `read` op-class verbs — the guard test enforces that — while every
 * other preset pairs with `write`/`admin` verbs, including the
 * quota-consuming AI parsers (write class).
 */
const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
/** A write that only adds state and never deletes it. */
const APPEND: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};
/** A write that converges: repeating it leaves the same state. */
const IDEMPOTENT_WRITE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
/** Worst case deletes or merges: the grouped-dispatcher default. */
const DESTRUCTIVE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};
/** A write that reaches an external service (AI quota, bank link). */
const EXTERNAL_WRITE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};
/** A destructive admin write that reaches an external service. */
const EXTERNAL_ADMIN: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};

// One schema object per ledger-targeted tool, shared by `inputSchema` and the
// handler's parse so the advertised and executed contracts cannot drift.
const addLedgerEntriesInput = entriesBodySchema
  .extend({ ledger: ledgerSelection })
  .strict();
const renameLedgerFileInput = renameFileInput.extend({
  ledger: ledgerSelection,
});
const insertReceiptTransactionInput = receiptInsertInput
  .extend({ ledger: ledgerSelection })
  .strict();

/** The MCP fragment: every tool this feature contributes to the registry. */
export const MCP_TOOLS: readonly McpToolDescriptor[] = [
  {
    name: "runBqlQuery",
    title: "Run Beancount Query (BQL)",
    annotations: READ_ONLY,
    description: bqlDescription,
    inputSchema: bqlQueryInputSchema.extend({ ledger: ledgerSelection }),
    outputSchema: mcpOutputSchema(bqlQueryOutputSchema),
    execute: withLedger(executeBqlQuery),
  },
  {
    name: "runBqlQueryStructured",
    title: "Run BQL with Typed Results",
    annotations: READ_ONLY,
    description:
      "Execute BQL and return the typed table (column names, types, and rows) or structured text result. Uses the same query contract as REST JSON and GraphQL queryShell.",
    inputSchema: bqlQueryInputSchema.extend({ ledger: ledgerSelection }),
    outputSchema: mcpOutputSchema(structuredBqlOutputSchema),
    execute: withLedger(executeStructuredBqlQuery),
  },
  {
    name: "listLedgers",
    title: "List Accessible Ledgers",
    description: listLedgersDescription,
    inputSchema: listLedgersInputSchema,
    outputSchema: mcpOutputSchema(listLedgersOutputSchema),
    annotations: READ_ONLY,
    execute: async (context, input) =>
      executeListLedgers(context, listLedgersInputSchema.parse(input)),
  },
  {
    name: "checkLedger",
    title: "Check Ledger Validity",
    description: checkLedgerDescription,
    inputSchema: checkLedgerInputSchema.extend({ ledger: ledgerSelection }),
    outputSchema: mcpOutputSchema(checkLedgerOutputSchema),
    annotations: READ_ONLY,
    execute: withLedger(executeCheckLedger),
  },
  {
    name: "getLedgerContext",
    title: "Read Ledger Vocabulary",
    description: getLedgerContextDescription,
    inputSchema: getLedgerContextInputSchema.extend({
      ledger: ledgerSelection,
    }),
    outputSchema: mcpOutputSchema(getLedgerContextOutputSchema),
    annotations: READ_ONLY,
    execute: withLedger(executeGetLedgerContext),
  },
  {
    name: "getEntryContext",
    title: "Read Entry Source Context",
    description: getEntryContextDescription,
    inputSchema: getEntryContextInputSchema.extend({
      ledger: ledgerSelection,
    }),
    outputSchema: mcpOutputSchema(getEntryContextOutputSchema),
    annotations: READ_ONLY,
    execute: withLedger(executeGetEntryContext),
  },
  {
    name: "listLedgerFiles",
    title: "List Ledger Files & Directories",
    annotations: READ_ONLY,
    description: listDescription,
    inputSchema: listLedgerFilesInputSchema.extend({ ledger: ledgerSelection }),
    outputSchema: mcpOutputSchema(listLedgerFilesOutputSchema),
    execute: withLedger(executeListLedgerFiles),
  },
  {
    name: "readLedgerFiles",
    title: "Read Ledger File Contents",
    annotations: READ_ONLY,
    description: readDescription,
    inputSchema: readLedgerFilesInputSchema.extend({ ledger: ledgerSelection }),
    outputSchema: mcpOutputSchema(readLedgerFilesOutputSchema),
    execute: withLedger(executeReadLedgerFiles),
  },
  {
    name: "addLedgerEntries",
    title: "Add Structured Ledger Entries",
    annotations: APPEND,
    description:
      "Append entries [{type,entry}] to the ledger. Supports transaction, commodity, price, note, balance, open, close, budget, document, event. Budget interval uses lowercase daily/weekly/monthly/quarterly/yearly. One posting per transaction may omit its amount and is written elided. An unbalanced transaction is refused with UNBALANCED unless allowInvalid records it deliberately. ledger is required unless pinned.",
    inputSchema: addLedgerEntriesInput,
    outputSchema: z.object({
      ok: z
        .boolean()
        .describe(
          "True when the tool succeeded; false when it refused or failed.",
        ),
      result: withWriteOutcome({
        success: z.boolean(),
        message: z.string().optional(),
        files: z.array(z.string()).optional(),
      })
        .optional()
        .describe("The tool's payload. Present when `ok` is true."),
      error: z
        .object({
          code: z.string(),
          message: z.string(),
          hint: z.string(),
        })
        .optional()
        .describe(
          "Why the tool refused or failed. Present when `ok` is false, alongside `isError` on the result.",
        ),
    }),
    execute: async (context, input) => {
      const { ledger, entries, allowInvalid } =
        addLedgerEntriesInput.parse(input);
      const ledgerId = resolveMcpLedger(context, ledger);
      const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
      let written: Awaited<
        ReturnType<typeof context.ledgerEntryService.addBulkEntries>
      >;
      try {
        const outcome = await withPostWriteValidation(
          context.services,
          context.identity,
          ledgerId,
          () =>
            context.ledgerEntryService.addBulkEntries(
              context.identity,
              ledgerOwner,
              ledgerName,
              entries,
              "web",
              allowInvalid ?? false,
            ),
        );
        written = outcome.written;
        const files = written.files ?? [];
        const noun = entries.length === 1 ? "entry" : "entries";
        return {
          ok: true,
          result: {
            summary: summarizeWrite(
              `Added ${entries.length} ${noun}${files.length > 0 ? ` to ${files.join(", ")}` : ""}`,
              outcome.validation,
            ),
            ...written,
            wrote: files.map((path) => ({ path })),
            entryHashes: [],
            validation: outcome.validation,
          },
        };
      } catch (error) {
        if (error instanceof UnbalancedTransactionError) {
          const metadata = error.metadata as
            | { residual?: unknown; hint?: unknown }
            | undefined;
          const hint =
            typeof metadata?.hint === "string"
              ? metadata.hint
              : "add a posting or pass allowInvalid: true";
          return {
            ok: false,
            error: { code: "UNBALANCED", message: error.message, hint },
          };
        }
        throw error;
      }
    },
  },
  {
    name: "insertReceiptTransaction",
    title: "Insert Receipt Transaction",
    annotations: APPEND,
    description:
      "Promote the caller-owned temporary receipt named by receiptObjectKey into receipt storage and append the confirmed transaction. input carries date, payee, description, postings [{account,amountNumber,amountCurrency}], and documentAccount. ledger is required unless pinned. Applies immediately.",
    inputSchema: insertReceiptTransactionInput,
    outputSchema: mcpOutputSchema(
      toolOutputSchema(withWriteOutcome(receiptInsertResult.shape)),
    ),
    execute: async (context, input) => {
      const { ledger, ...args } = insertReceiptTransactionInput.parse(input);
      const ledgerId = resolveMcpLedger(context, ledger);
      const { written, validation } = await withPostWriteValidation(
        context.services,
        context.identity,
        ledgerId,
        () =>
          context.ledgerReceiptWorkflow.insertReceiptTransaction({
            identity: context.identity,
            ledgerId,
            receiptObjectKey: args.receiptObjectKey,
            input: args.input,
          }),
      );
      return {
        ok: true,
        result: {
          summary: summarizeWrite(
            `Inserted receipt transaction for ${args.input.payee} on ${args.input.date}`,
            validation,
          ),
          ...written,
          wrote: [],
          entryHashes: [],
          validation,
        },
      };
    },
  },
  {
    name: "parseReceipt",
    title: "Parse Receipt and Recommend Accounts",
    annotations: EXTERNAL_WRITE,
    description:
      "Parse the caller-owned temporary image/PDF named by objectKey and recommend accounts. Pinned credentials may omit ledger; others must select it. Consumes extraction and recommendation tokens, without inserting entries.",
    inputSchema: parseReceiptInputSchema.extend({ ledger: ledgerSelection }),
    outputSchema: mcpOutputSchema(parseReceiptOutputSchema),
    execute: withLedger(executeParseReceipt),
  },
  {
    name: "parseFile",
    title: "Parse Uploaded File",
    annotations: EXTERNAL_WRITE,
    description:
      "Parse a caller-owned temporary upload into transaction rows. s3ObjectKey comes from the upload operation; fileFormat names the format (csv, pdf, xlsx, json, etc.). Consumes AI quota. Does not write ledger entries.",
    inputSchema: fileParseInput,
    outputSchema: mcpOutputSchema(toolOutputSchema(fileParseResult)),
    execute: async (context, input) => {
      const args = fileParseInput.parse(input);
      return {
        ok: true,
        result: await context.llmService.parseFile(
          context.identity,
          args.s3ObjectKey,
          args.fileFormat,
        ),
      };
    },
  },
  {
    name: "generateTempAssetUploadUrl",
    title: "Create Temporary Asset Upload URL",
    annotations: APPEND,
    description:
      "Create a presigned PUT URL bound to the current user. Optional filename and mimeType preserve the upload metadata. Upload the bytes to uploadUrl before using objectKey in an ingestion workflow.",
    inputSchema: tempAssetUploadInput,
    outputSchema: mcpOutputSchema(toolOutputSchema(tempAssetUploadResult)),
    execute: async (context, input) => {
      const values = tempAssetUploadInput.parse(input);
      return {
        ok: true,
        result: await context.assetStorage.generateUploadUrl(context.identity, {
          filename: values.filename ?? undefined,
          mimeType: values.mimeType ?? undefined,
        }),
      };
    },
  },
  {
    name: "editLedgerFiles",
    title: "Edit Ledger Files (Create / Update / Delete)",
    annotations: DESTRUCTIVE,
    description: editDescription,
    inputSchema: editLedgerFilesInputSchema.extend({ ledger: ledgerSelection }),
    outputSchema: mcpOutputSchema(editLedgerFilesOutputSchema),
    execute: withLedger(executeEditLedgerFiles),
  },
  {
    name: "editEntrySource",
    title: "Update or Delete Entry Source",
    annotations: DESTRUCTIVE,
    description:
      "Use operation update or delete with entryHash and sha256sum from entry context; update also requires newContent. delete_many accepts only entries [{entryHash,sha256sum}]. An update returns the entry's new hash — the request's entryHash is stale after the commit, so use newEntryHash for the next edit; delete_many returns the deleted count.",
    inputSchema: sourceSliceInput,
    outputSchema: sourceSliceOutput,
    execute: executeSourceSlice,
  },
  {
    name: "renameLedgerFile",
    title: "Rename Ledger File",
    annotations: IDEMPOTENT_WRITE,
    description:
      "Move oldPath to newPath preserving content in one atomic commit. Refuses when oldPath is still `include`d unless updateIncludes rewrites those lines in the same commit. Pinned credentials can omit ledger.",
    inputSchema: renameLedgerFileInput,
    outputSchema: mcpOutputSchema(
      toolOutputSchema(withWriteOutcome(renameFileResult.shape)),
    ),
    execute: async (context, input) => {
      const { ledger, ...args } = renameLedgerFileInput.parse(input);
      const ledgerId = resolveMcpLedger(context, ledger);
      const { written, validation } = await withPostWriteValidation(
        context.services,
        context.identity,
        ledgerId,
        () =>
          context.ledgerWorkflow.renameLedgerFile({
            identity: context.identity,
            ledgerId,
            input: {
              ...args,
              message: args.message ?? undefined,
              updateIncludes: args.updateIncludes ?? undefined,
            },
          }),
      );
      const moved =
        written.updatedIncludes.length > 0
          ? ` (updated includes: ${written.updatedIncludes.join(", ")})`
          : "";
      return {
        ok: true,
        result: {
          summary: summarizeWrite(
            `Renamed ${written.oldPath} → ${written.newPath}${moved}`,
            validation,
          ),
          ...written,
          wrote: [{ path: written.newPath }],
          entryHashes: [],
          validation,
        },
      };
    },
  },
  {
    name: "setLedgerStar",
    title: "Star or Unstar a Ledger",
    annotations: IDEMPOTENT_WRITE,
    description:
      "Set starred:true to star a ledger or false to unstar it for the authenticated user. ledger selects owner/name and defaults to the credential pin.",
    inputSchema: ledgerStarInput,
    outputSchema: ledgerStarOutput,
    execute: executeLedgerStar,
  },
  // Eight bank-import verbs behind one `operation` discriminator (ADR 0008 D3).
  // A family, not a bag: same subject, same authorization class, and an agent
  // picking one is choosing among them rather than between them and something
  // unrelated.
  {
    name: "manageBankImport",
    title: "Move Bank Transactions Into The Ledger",
    annotations: EXTERNAL_WRITE,
    description: importDescription,
    inputSchema: bankImportInputSchema.extend({ ledger: ledgerSelection }),
    outputSchema: mcpOutputSchema(bankImportOutputSchema),
    execute: withLedger(executeBankImport),
  },
  {
    name: "manageBankConnection",
    title: "Manage A Linked Bank Connection",
    annotations: EXTERNAL_ADMIN,
    description: connectionDescription,
    inputSchema: bankConnectionInputSchema.extend({ ledger: ledgerSelection }),
    outputSchema: mcpOutputSchema(bankConnectionOutputSchema),
    execute: withLedger(executeBankConnection),
  },
  {
    name: "managePullRequests",
    title: "Create and Review Pull Requests",
    annotations: DESTRUCTIVE,
    description:
      "Create a proposed set of file changes, approve it by merging, or reject it by closing. create requires title, description, clearCommitMessage, and changes [{path,content}]; an omitted baseBranch targets main. approve/reject require prNumber only. Reviews apply immediately.",
    inputSchema: pullRequestToolInput,
    outputSchema: pullRequestToolOutput,
    execute: executePullRequestTool,
  },

  // Key management (ADR 0006 D6). One grouped tool for the list/create/revoke
  // family: same subject, same authorization class (ADR 0008 D3). Not ledger
  // verbs, but the same credential reaches them, and leaving them off MCP
  // would mean an agent could use a key and never revoke one.
  {
    name: "manageApiKeys",
    title: "Manage API Keys",
    description: manageApiKeysDescription,
    inputSchema: manageApiKeysInputSchema,
    outputSchema: mcpOutputSchema(manageApiKeysOutputSchema),
    annotations: DESTRUCTIVE,
    execute: executeManageApiKeys,
  },
  {
    name: "manageLedgers",
    title: "Manage Ledger Lifecycle",
    annotations: DESTRUCTIVE,
    description:
      "Create, update, or delete a ledger with administrative authority. create requires name and accepts description, private, template (STARTER or SAMPLE); update takes ledger and optional name, description, private; delete takes only ledger. Pinned credentials may omit ledger on update/delete.",
    inputSchema: lifecycleToolInput,
    outputSchema: lifecycleToolOutput,
    execute: executeLifecycleTool,
  },
  {
    name: "managePublicKeys",
    title: "Manage SSH Public Keys",
    annotations: DESTRUCTIVE,
    description:
      "Create or delete the authenticated user's SSH public keys. create requires key and title, and accepts readOnly (default false); delete requires keyId. No ledger or user selector is accepted.",
    inputSchema: publicKeyToolInput,
    outputSchema: publicKeyToolOutput,
    execute: executePublicKeyTool,
  },
  {
    name: "manageLedgerCollaborators",
    title: "Manage Ledger Collaborators",
    annotations: DESTRUCTIVE,
    description:
      "Update or delete a ledger collaborator, or leave the ledger as the authenticated caller. update requires collaborator and accepts permission; delete requires only collaborator; leave accepts neither.",
    inputSchema: collaboratorToolInput,
    outputSchema: collaboratorToolOutput,
    execute: executeCollaboratorTool,
  },
  {
    name: "deleteAccount",
    title: "Delete Your Account",
    annotations: DESTRUCTIVE,
    description:
      "Permanently delete the authenticated account, including subscription cancellation and cleanup. OAuth credentials may call this; API keys cannot.",
    inputSchema: z.object({}).strict(),
    outputSchema: mcpOutputSchema(toolOutputSchema(z.boolean())),
    execute: async (context) => ({
      ok: true,
      result: await context.accountService.deleteAccount(context.identity),
    }),
  },
];
