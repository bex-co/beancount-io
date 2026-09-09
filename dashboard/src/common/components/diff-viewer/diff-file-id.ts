export function getDiffFileId(filename: string): string {
  return `diff-file-${encodeURIComponent(filename)}`;
}

/** Strip a leading `#` and decode a `diff-file-…` id into the filename. */
export function parseDiffFileId(fileIdOrHash: string): string | null {
  const raw = fileIdOrHash.startsWith("#")
    ? fileIdOrHash.slice(1)
    : fileIdOrHash;
  if (!raw.startsWith("diff-file-")) return null;
  try {
    return decodeURIComponent(raw.slice("diff-file-".length));
  } catch {
    return null;
  }
}
