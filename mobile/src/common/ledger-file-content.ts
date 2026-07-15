import { Buffer } from "buffer";

export function decodeLedgerFileContent(
  content: string,
  encoding?: string | null,
): string {
  if (encoding !== "base64") return content;
  return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8");
}

export function encodeLedgerFileContent(content: string): string {
  return Buffer.from(content, "utf8").toString("base64");
}
