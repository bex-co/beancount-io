import { z } from "zod";
import { bankAccountQuery } from "@/features/ledger/api/rest/v1/banks-handler";
import { publicKeyListQuery } from "@/features/ledger/api/rest/v1/public-keys-handler";
import type { McpRequestContext } from "./mcp-context";
import { logger } from "@/shared/logger";
import type { ToolContext } from "../tools/types";
import { toolOutputSchema } from "../tools/types";
import { runToolSafely } from "../utils/run-tool";

/**
 * Read-only list tools for hosts that consume tools and not resources
 * (ADR 019 D7). Each wraps exactly the service call of a resource twin and is
 * authorized the same way; the rule they answer is that an identifier a tool
 * needs must be obtainable from some tool's output. Without them, ChatGPT and
 * Copilot's cloud agent cannot reach the ids `manageBankConnection`,
 * `manageBankImport`, and `managePublicKeys` require.
 */

const toolLogger = logger.child({ module: "tool:list" });

// --- listBankConnections ----------------------------------------------------

export const listBankConnectionsDescription =
  "List linked bank connections (item_id) and their accounts (account_id) for manageBankConnection and manageBankImport.";

export const listBankConnectionsInput = z.object({}).strict();

export const listBankConnectionsOutput = toolOutputSchema(
  z.object({
    connections: z.array(z.unknown()),
    accounts: z.array(z.unknown()),
  }),
);

export async function executeListBankConnections(
  ctx: ToolContext,
  _input: z.infer<typeof listBankConnectionsInput>,
) {
  const { services, identity, ledgerId } = ctx;
  return runToolSafely({
    logger: toolLogger,
    message: "Listing bank connections failed",
    context: { tool: "listBankConnections" },
    execute: async () => {
      // The two resource twins' calls (`bankList`, `bankAccounts`), each
      // authorized by its own service exactly as the resource is.
      const [connections, accounts] = await Promise.all([
        services.plaidItem.getItems(identity, ledgerId),
        services.plaidItem.getAccountsForLedger(identity, ledgerId),
      ]);
      return { connections, accounts };
    },
  });
}

// --- listStagedBankTransactions ---------------------------------------------

export const listStagedBankTransactionsDescription =
  "List bank transactions staged for import (ids for manageBankImport submit/discard); optional accountId filter.";

export const listStagedBankTransactionsInput = bankAccountQuery.strict();

export const listStagedBankTransactionsOutput = toolOutputSchema(
  z.array(z.unknown()),
);

export async function executeListStagedBankTransactions(
  ctx: ToolContext,
  input: z.infer<typeof listStagedBankTransactionsInput>,
) {
  const { services, identity, ledgerId } = ctx;
  return runToolSafely({
    logger: toolLogger,
    message: "Listing staged bank transactions failed",
    context: { tool: "listStagedBankTransactions" },
    // The `bankUnsyncedTransactions` resource's call, with its account filter.
    execute: () =>
      services.plaidItem.getUnsyncedTransactions(
        identity,
        listStagedBankTransactionsInput.parse(input).accountId,
        ledgerId,
      ),
  });
}

// --- listPublicKeys -----------------------------------------------------------

export const listPublicKeysDescription =
  "List your SSH public keys (keyId for managePublicKeys delete); optional page and limit.";

export const listPublicKeysInput = publicKeyListQuery;

export const listPublicKeysOutput = toolOutputSchema(z.array(z.unknown()));

export async function executeListPublicKeys(
  ctx: McpRequestContext,
  input: z.infer<typeof listPublicKeysInput>,
) {
  return runToolSafely({
    logger: toolLogger,
    message: "Listing SSH public keys failed",
    context: { tool: "listPublicKeys" },
    // The `publicKeys` resource's call; no ledger target.
    execute: () =>
      ctx.publicKeyService.listPublicKeys(
        ctx.identity,
        listPublicKeysInput.parse(input),
      ),
  });
}
