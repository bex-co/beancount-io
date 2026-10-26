import { entriesBodySchema } from "@/features/ledger/api/rest/v1/entries-handler";
import { parseLedgerId } from "@/shared/str";
import {
  SOURCE_SLICE_OPERATION_OUTPUTS,
  SOURCE_SLICE_OPERATION_SCHEMAS,
  SOURCE_SLICE_EXECUTORS,
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
import { receiptInsertInput } from "@/features/ledger/api/rest/v1/receipt-insert-handler";
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
  executeRefreshManagedPrices,
  refreshManagedPricesInput,
  refreshManagedPricesOutput,
} from "./mcp-managed-prices";
import {
  PULL_REQUEST_OPERATION_SCHEMAS,
  pullRequestToolOutput,
  PULL_REQUEST_EXECUTORS,
} from "./mcp-pull-requests";
import {
  LIFECYCLE_OPERATION_SCHEMAS,
  lifecycleToolOutput,
  previewToolOutput,
  LIFECYCLE_EXECUTORS,
} from "./mcp-lifecycle";
import {
  COLLABORATOR_OPERATION_SCHEMAS,
  collaboratorToolOutput,
  COLLABORATOR_EXECUTORS,
} from "./mcp-collaborators";
import {
  listBankConnectionsDescription,
  listBankConnectionsInput,
  listBankConnectionsOutput,
  executeListBankConnections,
  listStagedBankTransactionsDescription,
  listStagedBankTransactionsInput,
  listStagedBankTransactionsOutput,
  executeListStagedBankTransactions,
  listLedgerEntriesDescription,
  listLedgerEntriesInput,
  listLedgerEntriesOutput,
  executeListLedgerEntries,
} from "./mcp-list-tools";
import { z, type ZodObject, type ZodTypeAny } from "zod";
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
import { LEDGER_FILE_OPERATIONS } from "../tools/edit-ledger-files-tool";
import {
  appendLedgerTextDescription,
  appendLedgerTextInputSchema,
  appendLedgerTextOutputSchema,
  executeAppendLedgerText,
} from "../tools/append-ledger-text-tool";
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
import { BANK_OPERATIONS } from "../tools/bank-import-tool";
import { normalizeAgentRepoPath } from "../tools/agent-repo-path";
import { LEDGER_ENTRY_POINT } from "@/features/ledger/utils/ledger-entry-point";
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
   * destructive, least idempotent operation the tool can perform. Each tool
   * performs one operation (ADR 019, 2026-10-18), so the hints describe
   * exactly what it does. The guard test refuses a tool without hints
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
 * One entry of a feature's per-operation table as its own tool (ADR 019,
 * 2026-10-18; w1/m38): the entry supplies the schema, description, output, and
 * handler; the tool adds its name, title, hints, and the ledger target.
 */
function operationTool(
  name: string,
  title: string,
  operation: {
    readonly schema: ZodObject;
    readonly description: string;
    readonly outputSchema: ReturnType<typeof toolOutputSchema>;
    readonly execute: (
      context: ToolContext,
      input: unknown,
    ) => Promise<unknown>;
  },
  annotations: ToolAnnotations,
): McpToolDescriptor {
  return {
    name,
    title,
    annotations,
    description: operation.description,
    inputSchema: operation.schema.extend({ ledger: ledgerSelection }),
    outputSchema: mcpOutputSchema(operation.outputSchema),
    execute: withLedger(operation.execute),
  };
}

/**
 * Shared `tools/list` annotation presets (w2/m27). The op-class decides
 * authority; these hints only describe it. `READ_ONLY` marks exactly the
 * tools that change nothing: `read` verbs and admin-authority lookups such as
 * bank connections. Both directories require the hint to match the behavior
 * (ADR 019, 2026-10-09 amendment), and the guard test enforces it. The
 * quota-consuming AI parsers are write class and never read-only.
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
/** Deletes, overwrites, or revokes access. */
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
/** Replaces state with what the call names: repeating it changes nothing. */
const IDEMPOTENT_DESTRUCTIVE: ToolAnnotations = {
  ...DESTRUCTIVE,
  idempotentHint: true,
};
/** A converging write that reaches an external service (a feed, a bank). */
const EXTERNAL_IDEMPOTENT_WRITE: ToolAnnotations = {
  ...IDEMPOTENT_WRITE,
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
    name: "listLedgerEntries",
    title: "List Journal Entries",
    description: listLedgerEntriesDescription,
    inputSchema: listLedgerEntriesInput.extend({ ledger: ledgerSelection }),
    outputSchema: mcpOutputSchema(listLedgerEntriesOutput),
    annotations: READ_ONLY,
    execute: withLedger(executeListLedgerEntries),
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
      "Append entries [{type,entry}]. Supports transaction, commodity, price, note, balance, open, close, budget, document, event. Budget interval uses lowercase daily/weekly/monthly/quarterly/yearly. One posting per transaction may omit its amount and is written elided. An unbalanced transaction is refused with UNBALANCED, and entries that would add bean-check errors (a second open for an open account, a balance against an unopened account), or a budget for an account the ledger lacks, with VALIDATION_FAILED naming each error, unless allowInvalid records them deliberately. ledger is required unless pinned.",
    inputSchema: addLedgerEntriesInput,
    outputSchema: mcpOutputSchema(
      toolOutputSchema(
        withWriteOutcome({
          success: z.boolean(),
          message: z.string().optional(),
          files: z.array(z.string()).optional(),
        }),
      ),
    ),
    execute: async (context, input) => {
      const { ledger, entries, allowInvalid } =
        addLedgerEntriesInput.parse(input);
      const ledgerId = resolveMcpLedger(context, ledger);
      const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
      // No hand-built refusal here: an `UnbalancedTransactionError` carries
      // its own UNBALANCED category and hint, and the MCP boundary turns any
      // throw into exactly that envelope (w2/m28:t003). Catching it to
      // rebuild the same object by hand was the last tool speaking its own
      // error dialect.
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
      const { includedFiles = [], ...written } = outcome.written;
      const files = written.files ?? [];
      const noun = entries.length === 1 ? "entry" : "entries";
      // The entry point gained an include for a routed file (w23/062).
      const included =
        includedFiles.length > 0
          ? `; ${LEDGER_ENTRY_POINT} now includes ${includedFiles.join(", ")}`
          : "";
      const touched = [
        ...new Set([...files, ...(included ? [LEDGER_ENTRY_POINT] : [])]),
      ];
      return {
        ok: true,
        result: {
          summary: summarizeWrite(
            `Added ${entries.length} ${noun}${files.length > 0 ? ` to ${files.join(", ")}` : ""}${included}`,
            outcome.validation,
          ),
          ...written,
          wrote: touched.map((path) => ({ path })),
          entryHashes: written.entryHashes ?? [],
          validation: outcome.validation,
        },
      };
    },
  },
  {
    name: "appendLedgerText",
    title: "Append Beancount Directive Text",
    annotations: APPEND,
    description: appendLedgerTextDescription,
    inputSchema: appendLedgerTextInputSchema,
    outputSchema: mcpOutputSchema(appendLedgerTextOutputSchema),
    execute: executeAppendLedgerText,
  },
  {
    name: "insertReceiptTransaction",
    title: "Insert Receipt Transaction",
    annotations: APPEND,
    description:
      "Promote the caller-owned temporary receipt named by receiptObjectKey into receipt storage and append the confirmed transaction. input carries date, payee, description, postings [{account,amountNumber,amountCurrency}], and documentAccount. ledger is required unless pinned. Applies immediately.",
    inputSchema: insertReceiptTransactionInput,
    // Shaped inline, not from `receiptInsertResult`: that schema grew an
    // `entryHashes` of its own (w23/083), which would collide with the
    // outcome's key.
    outputSchema: mcpOutputSchema(
      toolOutputSchema(withWriteOutcome({ success: z.boolean() })),
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
      // The files and hashes the commit reports, so an agent need not query
      // to find the entry it just added (w23/083) — the bulk route reports
      // files, not lines, as for bank imports (w5/942).
      const { files, entryHashes, ...rest } = written;
      return {
        ok: true,
        result: {
          summary: summarizeWrite(
            `Inserted receipt transaction for ${args.input.payee} on ${args.input.date}`,
            validation,
          ),
          ...rest,
          wrote: (files ?? []).map((path) => ({ path })),
          entryHashes: entryHashes ?? [],
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
          context.platform,
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
  operationTool(
    "createLedgerFiles",
    "Create Ledger Files",
    LEDGER_FILE_OPERATIONS.create,
    APPEND,
  ),
  operationTool(
    "updateLedgerFiles",
    "Update Ledger Files",
    LEDGER_FILE_OPERATIONS.update,
    IDEMPOTENT_DESTRUCTIVE,
  ),
  operationTool(
    "deleteLedgerFiles",
    "Delete Ledger Files",
    LEDGER_FILE_OPERATIONS.delete,
    IDEMPOTENT_DESTRUCTIVE,
  ),
  {
    name: "updateEntrySource",
    title: "Update Entry Source",
    annotations: DESTRUCTIVE,
    description:
      "Replace one entry's source text with newContent, addressed by entryHash (listLedgerEntries' entry_hash) and sha256sum from getEntryContext. Returns the entry's new hash as newEntryHash; the request's entryHash is stale after the commit. A replacement that would take a free ledger past its directive limit is RESOURCE_LIMIT_REACHED. A write that would add a bean-check error the ledger did not have is refused with VALIDATION_FAILED naming each new error — lone imbalance refuses as UNBALANCED with the residual; pass allowInvalid: true to commit it anyway.",
    inputSchema: SOURCE_SLICE_OPERATION_SCHEMAS.update,
    outputSchema: SOURCE_SLICE_OPERATION_OUTPUTS.update,
    execute: SOURCE_SLICE_EXECUTORS.update,
  },
  {
    name: "deleteEntrySource",
    title: "Delete Entry Source",
    annotations: DESTRUCTIVE,
    description:
      "Delete one entry's source text, addressed by entryHash (listLedgerEntries' entry_hash) and sha256sum from getEntryContext. A write that would add a bean-check error the ledger did not have — deleting an entry a balance assertion depends on, re-dating it past one — is refused with VALIDATION_FAILED naming each new error; pass allowInvalid: true to commit it anyway.",
    inputSchema: SOURCE_SLICE_OPERATION_SCHEMAS.delete,
    outputSchema: SOURCE_SLICE_OPERATION_OUTPUTS.delete,
    execute: SOURCE_SLICE_EXECUTORS.delete,
  },
  {
    name: "deleteEntrySources",
    title: "Delete Several Entry Sources",
    annotations: DESTRUCTIVE,
    description:
      "Delete several entries' source text in one commit; entries is a list of {entryHash, sha256sum}. Returns the deleted count. A write that would add a bean-check error the ledger did not have — deleting an entry a balance assertion depends on, re-dating it past one — is refused with VALIDATION_FAILED naming each new error; pass allowInvalid: true to commit it anyway.",
    inputSchema: SOURCE_SLICE_OPERATION_SCHEMAS.delete_many,
    outputSchema: SOURCE_SLICE_OPERATION_OUTPUTS.delete_many,
    execute: SOURCE_SLICE_EXECUTORS.delete_many,
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
              // Models spell shell-style `./old.bean`; every other file
              // tool normalizes that here, before the strict validator.
              oldPath: normalizeAgentRepoPath(args.oldPath),
              newPath: normalizeAgentRepoPath(args.newPath),
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
  {
    name: "refreshManagedPrices",
    title: "Refresh Managed Price Feeds",
    // Re-fetches public market data: idempotent in effect, and open-world
    // because it reaches the feed's origin.
    annotations: EXTERNAL_IDEMPOTENT_WRITE,
    description:
      "Re-fetch the ledger's managed price feeds now and return each source's status (the ledgerManagedPrices records). Never edits the ledger. ledger is required unless pinned.",
    inputSchema: refreshManagedPricesInput,
    outputSchema: refreshManagedPricesOutput,
    execute: executeRefreshManagedPrices,
  },
  // One tool per bank operation (ADR 019, 2026-10-18; w1/m38), each
  // publishing only its own fields.
  operationTool(
    "syncBankTransactions",
    "Sync Bank Transactions",
    BANK_OPERATIONS.sync,
    EXTERNAL_WRITE,
  ),
  operationTool(
    "importStagedBankTransactions",
    "Import Staged Bank Transactions",
    BANK_OPERATIONS.submit,
    APPEND,
  ),
  operationTool(
    "discardStagedBankTransactions",
    "Discard Staged Bank Transactions",
    BANK_OPERATIONS.discard,
    DESTRUCTIVE,
  ),
  operationTool(
    "reconcileBankAccounts",
    "Reconcile Linked Bank Accounts",
    BANK_OPERATIONS.reconcile,
    EXTERNAL_ADMIN,
  ),
  operationTool(
    "mapBankAccount",
    "Map Bank Account To Ledger Account",
    BANK_OPERATIONS.map_account,
    IDEMPOTENT_DESTRUCTIVE,
  ),
  operationTool(
    "setBankAccountCurrency",
    "Set Bank Account Currency",
    BANK_OPERATIONS.set_currency,
    IDEMPOTENT_DESTRUCTIVE,
  ),
  operationTool(
    "refreshBankConnection",
    "Refresh Bank Connection Status",
    BANK_OPERATIONS.refresh,
    EXTERNAL_IDEMPOTENT_WRITE,
  ),
  operationTool(
    "unlinkBankConnection",
    "Unlink Bank Connection",
    BANK_OPERATIONS.unlink,
    EXTERNAL_ADMIN,
  ),
  // The ids the bank tools above need, for hosts that only call tools (ADR 019
  // D7). The `banks` and `bank-accounts` resources carry the same data.
  {
    name: "listBankConnections",
    title: "List Linked Banks And Their Accounts",
    annotations: READ_ONLY,
    description: listBankConnectionsDescription,
    inputSchema: listBankConnectionsInput.extend({ ledger: ledgerSelection }),
    outputSchema: mcpOutputSchema(listBankConnectionsOutput),
    execute: withLedger(executeListBankConnections),
  },
  {
    name: "listStagedBankTransactions",
    title: "List Bank Transactions Staged For Import",
    annotations: READ_ONLY,
    description: listStagedBankTransactionsDescription,
    inputSchema: listStagedBankTransactionsInput.extend({
      ledger: ledgerSelection,
    }),
    outputSchema: mcpOutputSchema(listStagedBankTransactionsOutput),
    execute: withLedger(executeListStagedBankTransactions),
  },
  {
    name: "createPullRequest",
    title: "Create Pull Request",
    annotations: APPEND,
    description:
      "Propose a set of file changes as a pull request. Requires title, description, clearCommitMessage, and changes [{path,content}]; an omitted baseBranch targets main. A repository server failure is SERVICE_UNAVAILABLE naming the failed step.",
    inputSchema: PULL_REQUEST_OPERATION_SCHEMAS.create,
    outputSchema: pullRequestToolOutput,
    execute: PULL_REQUEST_EXECUTORS.create,
  },
  {
    // Named for what it does: OpenAI flagged "approve" as inconsistent with
    // a merge (w1/172). GraphQL and REST keep `approvePullRequest`.
    name: "mergePullRequest",
    title: "Merge Pull Request",
    annotations: DESTRUCTIVE,
    description:
      "Merge a pull request into its base branch; the merge applies immediately. A merge that would take a free ledger past its directive limit is RESOURCE_LIMIT_REACHED. A repository server failure is SERVICE_UNAVAILABLE naming the failed step.",
    inputSchema: PULL_REQUEST_OPERATION_SCHEMAS.approve,
    outputSchema: pullRequestToolOutput,
    execute: PULL_REQUEST_EXECUTORS.approve,
  },
  {
    name: "rejectPullRequest",
    title: "Reject Pull Request",
    annotations: DESTRUCTIVE,
    description:
      "Reject a pull request by closing it without merging; applies immediately.",
    inputSchema: PULL_REQUEST_OPERATION_SCHEMAS.reject,
    outputSchema: pullRequestToolOutput,
    execute: PULL_REQUEST_EXECUTORS.reject,
  },
  {
    name: "createLedger",
    title: "Create Ledger",
    // Open world: `private: false` publishes the ledger to anyone (w1/174).
    annotations: { ...APPEND, openWorldHint: true },
    description:
      "Create a ledger owned by the authenticated user. Requires name; accepts description, private, template (STARTER default, including null: options and accounts without transactions; SAMPLE: demonstration transactions), a setup specification (mutually exclusive with template), and a requestId for idempotent retries. Refused for ledger-pinned credentials.",
    inputSchema: LIFECYCLE_OPERATION_SCHEMAS.create,
    outputSchema: lifecycleToolOutput,
    execute: LIFECYCLE_EXECUTORS.create,
  },
  {
    name: "previewLedgerSetup",
    title: "Preview Ledger Setup",
    annotations: READ_ONLY,
    description:
      "Preview a ledger setup (ADR021) without creating anything: returns the files, account list, and validation result the specification would produce. Accepts the same setup object as createLedger.",
    inputSchema: LIFECYCLE_OPERATION_SCHEMAS.preview,
    outputSchema: previewToolOutput,
    execute: LIFECYCLE_EXECUTORS.preview,
  },
  {
    name: "updateLedger",
    title: "Update Ledger Settings",
    // Open world: `private: false` publishes the ledger to anyone (w1/174).
    annotations: { ...IDEMPOTENT_DESTRUCTIVE, openWorldHint: true },
    description:
      "Change a ledger's name, description, or privacy; omitted fields stay as they are.",
    inputSchema: LIFECYCLE_OPERATION_SCHEMAS.update,
    outputSchema: lifecycleToolOutput,
    execute: LIFECYCLE_EXECUTORS.update,
  },
  {
    name: "deleteLedger",
    title: "Delete Ledger",
    annotations: DESTRUCTIVE,
    description: "Permanently delete a ledger, including its history.",
    inputSchema: LIFECYCLE_OPERATION_SCHEMAS.delete,
    outputSchema: lifecycleToolOutput,
    execute: LIFECYCLE_EXECUTORS.delete,
  },
  {
    name: "setLedgerCollaborator",
    title: "Add or Update Ledger Collaborator",
    annotations: IDEMPOTENT_DESTRUCTIVE,
    description:
      "Add a collaborator to a ledger, or change an existing collaborator's permission (read, write, or admin).",
    inputSchema: COLLABORATOR_OPERATION_SCHEMAS.update,
    outputSchema: collaboratorToolOutput,
    execute: COLLABORATOR_EXECUTORS.update,
  },
  {
    name: "removeLedgerCollaborator",
    title: "Remove Ledger Collaborator",
    annotations: DESTRUCTIVE,
    description: "Remove a collaborator's access to a ledger.",
    inputSchema: COLLABORATOR_OPERATION_SCHEMAS.delete,
    outputSchema: collaboratorToolOutput,
    execute: COLLABORATOR_EXECUTORS.delete,
  },
  {
    name: "leaveLedger",
    title: "Leave Ledger",
    annotations: DESTRUCTIVE,
    description:
      "Remove the authenticated user's own access to a ledger they collaborate on.",
    inputSchema: COLLABORATOR_OPERATION_SCHEMAS.leave,
    outputSchema: collaboratorToolOutput,
    execute: COLLABORATOR_EXECUTORS.leave,
  },
];
