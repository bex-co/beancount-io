/**
 * Fava's file-content responses carry an optional base64 `encoding` for
 * non-UTF-8-safe bytes; anything else is sent as plain text. This is the one
 * place that distinction is resolved into a plain string.
 */
export function decodeFileContent(file: {
  content?: string | null;
  encoding?: string | null;
}): string {
  if (!file.content) return "";
  if (file.encoding === "base64") {
    return Buffer.from(file.content.replace(/\s/g, ""), "base64").toString(
      "utf-8",
    );
  }
  return file.content;
}
