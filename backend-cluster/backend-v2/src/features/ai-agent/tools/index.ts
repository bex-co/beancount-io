import { createBqlQueryTool } from "./bql-query-tool";
import { createReadLedgerFilesTool } from "./read-ledger-files-tool";
import { createListLedgerFilesTool } from "./list-ledger-files-tool";
import { createEditLedgerFilesTool } from "./edit-ledger-files-tool";
import { createParseReceiptTool } from "./parse-receipt-tool";
import { createInsertReceiptTransactionTool } from "./insert-receipt-transaction-tool";
import type { ToolContext } from "./types";

export type { ToolContext };

export function createAgentTools(ctx: ToolContext) {
  return {
    runBqlQuery: createBqlQueryTool(ctx),
    readLedgerFiles: createReadLedgerFilesTool(ctx),
    listLedgerFiles: createListLedgerFilesTool(ctx),
    editLedgerFiles: createEditLedgerFilesTool(ctx),
    parseReceipt: createParseReceiptTool(ctx),
    insertReceiptTransaction: createInsertReceiptTransactionTool(ctx),
  };
}

export type AgentTools = ReturnType<typeof createAgentTools>;
