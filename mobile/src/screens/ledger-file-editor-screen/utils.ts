import { Buffer } from "buffer";

export function decodeLedgerFileContent(
  content: string,
  encoding?: string | null,
): string {
  if (encoding !== "base64") return content;
  return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8");
}

export function isConflictError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("sha") || m.includes("conflict") || m.includes("409");
}

type FileError = {
  message: string;
  lineno?: number | null;
  filename?: string | null;
};

export function filterFileErrors(
  allErrors: FileError[],
  filePath: string,
): FileError[] {
  const fileName = filePath.split("/").pop() ?? filePath;
  return allErrors.filter(
    (e) =>
      e.filename === filePath ||
      e.filename === fileName ||
      (e.filename != null && e.filename.endsWith("/" + fileName)),
  );
}

/**
 * Pure regex-based beancount token classifier (no CM6 dependency).
 * Returns the token category for the START of the given string chunk,
 * or null if no token matches (plain text / whitespace).
 */
export function classifyBeancountChunk(chunk: string): string | null {
  if (/^;/.test(chunk)) return "comment";
  if (/^"/.test(chunk)) return "string";
  if (/^\d{4}-\d{2}-\d{2}(?!\d)/.test(chunk)) return "date";
  if (
    /^(txn|balance|open|close|pad|note|price|document|custom|option|include|plugin|pushmeta|popmeta|event|query|commodity)\b/.test(
      chunk,
    )
  )
    return "keyword";
  if (/^[*!]/.test(chunk)) return "flag";
  if (/^[A-Z][a-zA-Z0-9-]*(?::[A-Z][a-zA-Z0-9-]*)+/.test(chunk))
    return "account";
  if (/^#[A-Za-z0-9_/-]+/.test(chunk)) return "tag";
  if (/^\^[A-Za-z0-9_/-]+/.test(chunk)) return "link";
  if (/^[A-Z][A-Z0-9.']{1,23}(?![a-z])/.test(chunk)) return "currency";
  if (/^-?[0-9,]+(?:\.[0-9]+)?/.test(chunk)) return "number";
  return null;
}
