import type { ZodTypeAny } from "zod";
import {
  bqlQueryInputSchema,
  executeBqlQuery,
  description as bqlDescription,
} from "../tools/bql-query-tool";
import {
  listLedgerFilesInputSchema,
  executeListLedgerFiles,
  description as listDescription,
} from "../tools/list-ledger-files-tool";
import {
  readLedgerFilesInputSchema,
  executeReadLedgerFiles,
  description as readDescription,
} from "../tools/read-ledger-files-tool";
import {
  editLedgerFilesInputSchema,
  executeEditLedgerFiles,
  description as editDescription,
} from "../tools/edit-ledger-files-tool";
import {
  createApiKeyDescription,
  createApiKeyInputSchema,
  executeCreateApiKey,
  executeListApiKeys,
  executeRevokeApiKey,
  listApiKeysDescription,
  listApiKeysInputSchema,
  revokeApiKeyDescription,
  revokeApiKeyInputSchema,
} from "../tools/api-key-tools";
import type { ToolContext } from "../tools/types";

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
  readonly execute: (toolCtx: ToolContext, input: never) => Promise<unknown>;
}

/** The MCP fragment: every tool this feature contributes to the registry. */
export const MCP_TOOLS: readonly McpToolDescriptor[] = [
  {
    name: "runBqlQuery",
    title: "Run Beancount Query (BQL)",
    description: bqlDescription,
    inputSchema: bqlQueryInputSchema,
    execute: executeBqlQuery,
  },
  {
    name: "listLedgerFiles",
    title: "List Ledger Files & Directories",
    description: listDescription,
    inputSchema: listLedgerFilesInputSchema,
    execute: executeListLedgerFiles,
  },
  {
    name: "readLedgerFiles",
    title: "Read Ledger File Contents",
    description: readDescription,
    inputSchema: readLedgerFilesInputSchema,
    execute: executeReadLedgerFiles,
  },
  {
    name: "editLedgerFiles",
    title: "Edit Ledger Files (Create / Update / Delete)",
    description: editDescription,
    inputSchema: editLedgerFilesInputSchema,
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
    execute: executeListApiKeys,
  },
  {
    name: "createApiKey",
    title: "Mint an API Key",
    description: createApiKeyDescription,
    inputSchema: createApiKeyInputSchema,
    execute: executeCreateApiKey,
  },
  {
    name: "revokeApiKey",
    title: "Revoke an API Key",
    description: revokeApiKeyDescription,
    inputSchema: revokeApiKeyInputSchema,
    execute: executeRevokeApiKey,
  },
];
