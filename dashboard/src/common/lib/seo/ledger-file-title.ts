/**
 * Prefix a ledger Files SEO title with the blob path so route head and the
 * page SEO component stay aligned.
 */
export function withLedgerFileTitlePrefix(
  filePath: string,
  baseTitle: string,
): string {
  return filePath ? `${filePath} · ${baseTitle}` : baseTitle;
}
