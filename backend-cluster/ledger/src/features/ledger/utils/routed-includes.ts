import { isGlob } from "@/foundation/rustledger/file-map-loader";
import { isSkippedLine } from "@/foundation/rustledger/parseable-files";
import { endsInsideString } from "@/foundation/rustledger/source-slice";
import { BadUserInputError } from "@/shared/errors";
import { lineEndingOf } from "./line-ending";

/** A real top-level double-quoted Beancount `include "..."` directive line. */
const INCLUDE_LINE_RE =
  /^[^\S\r\n]*include[^\S\r\n]+"(?:[^"\\]|\\.)*"[^\S\r\n]*(?:;.*)?$/;

/**
 * Refuse a file path containing a Beancount `include` glob metacharacter
 * (`*`, `?`, or `[`) when writing a literal `include` line for it (w31/093).
 * Both Python `glob.glob` and `rustledger` expand `[...]` as a character class,
 * so an unescaped literal include cannot load it.
 */
export function assertLiteralIncludePath(path: string, field = "path"): void {
  if (isGlob(path)) {
    throw new BadUserInputError(
      `${field} ${JSON.stringify(path)} contains a Beancount include glob metacharacter (*, ?, or [) and cannot be targeted literally in an include line`,
      field,
    );
  }
}

/**
 * `include` lines for files a write reaches outside the ledger's include
 * closure (w23/062). A `transaction_file "txns/{year}.bean"` rule routes the
 * first entry of a new year to a file per-year includes do not name yet;
 * without an include the entry commits and no report sees it.
 *
 * Each line goes after the entry point's last `include`, so a per-year list
 * stays together, or at its end when it has none.
 */
export function addIncludes(
  content: string,
  paths: readonly string[],
  field = "path",
): string {
  if (paths.length === 0) return content;
  for (const path of paths) assertLiteralIncludePath(path, field);
  const block = paths.map(
    (path) => `include "${path.replace(/[\\"]/g, "\\$&")}"`,
  );
  // In the file's own line ending, so a CRLF entry point does not gain a bare
  // LF line (w21/695).
  const eol = lineEndingOf(content);
  const lines = content
    .split("\n")
    .map((line) =>
      eol === "\r\n" && line.endsWith("\r") ? line.slice(0, -1) : line,
    );
  let last = -1;
  let inString = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // A line Beancount skips whole opens no string (w31/099).
    if (!inString && isSkippedLine(line)) continue;
    if (!inString && INCLUDE_LINE_RE.test(line)) {
      last = i;
    }
    inString = endsInsideString(line, inString);
  }
  if (last >= 0) {
    lines.splice(last + 1, 0, ...block);
    return lines.join(eol);
  }
  const body = content.replace(/(?:\r?\n)+$/, "");
  return `${body}${body ? eol : ""}${block.join(eol)}${eol}`;
}
