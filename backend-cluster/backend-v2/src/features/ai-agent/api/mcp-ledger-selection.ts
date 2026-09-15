import { z } from "zod";

/**
 * How a ledger is named on the MCP surface: `owner/name`, with none of the
 * characters a URL or resource URI would reinterpret. Tools enforce it when they
 * resolve a ledger, and prompt arguments validate against the same pattern.
 *
 * Kept free of other imports so the prompt fragment — and the eval harness that
 * renders it — can use it without loading the rate limiter.
 */
export const LEDGER_ID_PATTERN = /^[^/\s?#%]+\/[^/\s?#%]+$/;

/**
 * The one spelling of the optional per-call ledger selector, shared by every
 * ledger-targeted tool module so clients see the same documented contract on
 * each tool.
 */
export const ledgerSelection = z
  .string()
  .optional()
  .describe(
    "Target ledger as owner/name. Required for an unpinned credential; defaults to the credential's ledger restriction.",
  );
