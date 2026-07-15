export type LedgerError = {
  filename?: string | null;
  lineno?: number | null;
  message: string;
};

export function formatErrorLocation(error: LedgerError): string {
  if (!error.filename) return error.message;
  const line = error.lineno != null ? `:${error.lineno}` : "";
  return `${error.filename}${line}`;
}

export function formatShortSha(sha: string, shortSha?: string | null): string {
  return shortSha ?? sha.slice(0, 7);
}
