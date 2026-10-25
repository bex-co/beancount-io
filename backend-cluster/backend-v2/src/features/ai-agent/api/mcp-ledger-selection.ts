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
 * Whether a requested ledger id names the credential's pinned ledger.
 *
 * Host usernames are case-insensitive while ledger names are lowercase-only,
 * so the owner compares case-insensitively and the name exactly: `PUNCSKY/x`
 * is the pin `puncsky/x`, but `puncsky/y` is a different ledger (w23/078).
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
  .describe(
    "Target ledger as owner/name. Required for an unpinned credential; defaults to the credential's ledger restriction.",
  );
