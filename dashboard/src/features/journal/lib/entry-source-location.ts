export type EntrySourceLocation = {
  filename: string;
  lineno: number;
};

/**
 * Read a navigable source location from entry-context metadata.
 * Returns null when filename is missing/blank or lineno is not a positive integer.
 */
export function readEntrySourceLocation(
  entry: unknown,
): EntrySourceLocation | null {
  if (!entry || typeof entry !== "object") return null;
  const meta = (entry as { meta?: unknown }).meta;
  if (!meta || typeof meta !== "object") return null;

  const filename = (meta as { filename?: unknown }).filename;
  const lineno = (meta as { lineno?: unknown }).lineno;
  if (typeof filename !== "string" || filename.trim() === "") return null;
  if (typeof lineno !== "number" || !Number.isInteger(lineno) || lineno < 1) {
    return null;
  }

  return { filename, lineno };
}

/**
 * The feed URL behind a managed price entry, or null for a repository file.
 *
 * A managed price include (`include "https://beancount.io/prices/BTC-USD"`)
 * reaches the journal with the virtual file key the ledger service overlays:
 * the URL resolved against the including file with POSIX normalization, which
 * collapses `//` — so `main.bean` yields `https:/beancount.io/prices/BTC-USD`
 * and `books/2026.bean` yields `books/https:/beancount.io/…` (ADR 015). The
 * ledger refuses writes to these paths, and they are not repository files to
 * open, so callers use this to offer neither.
 */
export function managedPriceSourceUrl(filename: string): string | null {
  const match = /(?:^|\/)([a-z][a-z0-9+.-]*):\/(?!\/)(.+)$/i.exec(filename);
  return match ? `${match[1]}://${match[2]}` : null;
}
