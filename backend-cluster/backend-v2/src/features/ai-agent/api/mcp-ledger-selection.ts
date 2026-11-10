import { z } from "zod";
import { BadUserInputError } from "@/shared/errors";
import { parseLedgerId } from "@/shared/str";

/**
 * Refuse a ledger that is not spelled `owner/name`, naming the slug rule it
 * broke. The MCP tools and the prompt arguments share it, and it parses with
 * the same `parseLedgerId` the resource, REST and GraphQL use, so a malformed
 * value reads the same on every surface instead of as "no ledger given"
 * (w1/235).
 *
 * Kept free of the rate limiter and the transport, so the prompt fragment — and
 * the eval harness that renders it — can use it without loading them.
 */
export function assertLedgerSpelling(ledger: string): void {
  try {
    parseLedgerId(ledger);
  } catch (error) {
    if (!(error instanceof BadUserInputError)) throw error;
    throw new BadUserInputError(
      error.message,
      "ledger",
      "Pass `ledger` as exactly `owner/name`: one `/`, no spaces and no URL characters. `listLedgers` shows the names this credential can reach.",
    );
  }
}

/**
 * The one spelling of the optional per-call ledger selector, shared by every
 * ledger-targeted tool module so clients see the same documented contract on
 * each tool.
 */
export const ledgerSelection = z
  .string()
  .optional()
  .describe("Ledger as owner/name; see the server instructions.");

/**
 * MCP's `requestId` (w3/m61). It carries no description because every write
 * tool repeats it in tools/list, which has a byte budget; the server
 * instructions explain it once, and a mismatched or in-progress id explains
 * itself in its refusal. REST and GraphQL carry the full description; the
 * service enforces the 1-200 character bound on every surface.
 */
export const mcpRequestId = z.string().optional();
