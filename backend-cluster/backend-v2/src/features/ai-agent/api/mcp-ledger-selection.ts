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
 * Whether a requested ledger id names the credential's pinned ledger.
 *
 * Host usernames are case-insensitive while ledger names are lowercase-only,
 * so the owner compares case-insensitively and the name exactly: `PUNCSKY/x`
 * is the pin `puncsky/x`, but `puncsky/y` is a different ledger (w23/078).
 * `canonicalLedgerId` (`@/shared/str`) folds a ledger id by the same rule; this
 * one tolerates a malformed id (it is simply no match), that one refuses it.
 */
export function ledgerIdMatchesPin(requested: string, pin: string): boolean {
  const slash = requested.indexOf("/");
  const pinSlash = pin.indexOf("/");
  if (slash === -1 || pinSlash === -1) {
    return false;
  }
  return (
    requested.slice(0, slash).toLowerCase() ===
      pin.slice(0, pinSlash).toLowerCase() &&
    requested.slice(slash + 1) === pin.slice(pinSlash + 1)
  );
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
