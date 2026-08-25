import type { ZodTypeAny } from "zod";
import {
  bqlQueryInputSchema,
  bqlQueryOutputSchema,
  executeBqlQuery,
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
  createApiKeyDescription,
  createApiKeyInputSchema,
  createApiKeyOutputSchema,
  executeCreateApiKey,
  executeListApiKeys,
  executeRevokeApiKey,
  listApiKeysDescription,
  listApiKeysInputSchema,
  listApiKeysOutputSchema,
  revokeApiKeyDescription,
  revokeApiKeyInputSchema,
  revokeApiKeyOutputSchema,
} from "../tools/api-key-tools";
import type { ToolContext } from "../tools/types";
import { mcpOutputSchema } from "../tools/types";

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
  readonly execute: (toolCtx: ToolContext, input: never) => Promise<unknown>;
}

/** The MCP fragment: every tool this feature contributes to the registry. */
export const MCP_TOOLS: readonly McpToolDescriptor[] = [
  {
    name: "runBqlQuery",
    title: "Run Beancount Query (BQL)",
    description: bqlDescription,
    inputSchema: bqlQueryInputSchema,
    outputSchema: mcpOutputSchema(bqlQueryOutputSchema),
    execute: executeBqlQuery,
  },
  {
    name: "listLedgerFiles",
    title: "List Ledger Files & Directories",
    description: listDescription,
    inputSchema: listLedgerFilesInputSchema,
    outputSchema: mcpOutputSchema(listLedgerFilesOutputSchema),
    execute: executeListLedgerFiles,
  },
  {
    name: "readLedgerFiles",
    title: "Read Ledger File Contents",
    description: readDescription,
    inputSchema: readLedgerFilesInputSchema,
    outputSchema: mcpOutputSchema(readLedgerFilesOutputSchema),
    execute: executeReadLedgerFiles,
  },
  {
    name: "editLedgerFiles",
    title: "Edit Ledger Files (Create / Update / Delete)",
    description: editDescription,
    inputSchema: editLedgerFilesInputSchema,
    outputSchema: mcpOutputSchema(editLedgerFilesOutputSchema),
    execute: executeEditLedgerFiles,
  },
  // Key management (ADR 0006 D6). Not ledger verbs, but the same credential
  // reaches them, and leaving them off MCP would mean an agent could use a key
  // and never revoke one.
  {
    name: "listApiKeys",
    title: "List API Keys",
    description: listApiKeysDescription,
    inputSchema: listApiKeysInputSchema,
    outputSchema: mcpOutputSchema(listApiKeysOutputSchema),
    execute: executeListApiKeys,
  },
  {
    name: "createApiKey",
    title: "Mint an API Key",
    description: createApiKeyDescription,
    inputSchema: createApiKeyInputSchema,
    outputSchema: mcpOutputSchema(createApiKeyOutputSchema),
    execute: executeCreateApiKey,
  },
  {
    name: "revokeApiKey",
    title: "Revoke an API Key",
    description: revokeApiKeyDescription,
    inputSchema: revokeApiKeyInputSchema,
    outputSchema: mcpOutputSchema(revokeApiKeyOutputSchema),
    execute: executeRevokeApiKey,
  },
];
