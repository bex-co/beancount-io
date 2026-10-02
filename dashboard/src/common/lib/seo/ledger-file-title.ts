/**
 * Prefix a ledger Files title with the blob path for document and social metadata.
 */
export function withLedgerFileTitlePrefix(
  filePath: string,
  baseTitle: string,
): string {
  return filePath ? `${filePath} · ${baseTitle}` : baseTitle;
}
