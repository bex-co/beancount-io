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
