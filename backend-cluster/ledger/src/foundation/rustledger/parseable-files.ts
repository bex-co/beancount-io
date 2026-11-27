import type { FileMap } from "@rustledger/wasm";
import {
  collectSourceFiles,
  isHiddenRepoPath,
  UNDECODABLE_SOURCE,
} from "./file-map-loader";

/**
 * Beancount skips a whole line that starts with `*`, `#`, `:`, `!`, `&`, `?`
 * or `%` (org-mode headings and other non-directives). rustledger 0.24 reads a
 * `"` on a `*` or `#` line as the start of a string, which swallows every
 * entry after it with no error, and fails to parse a `:`, `!`, `&` or `?` line
 * (w21/654). As `;` comments they read the same to both engines. Strings and
 * `;` comments are matched first so a line inside a multi-line string is left
 * as it is, and a `"` in a comment opens nothing.
 */
export const SKIPPED_LINE_OR_TOKEN_RE =
  /^[*#:!&?%][^\n]*|"(?:[^"\\]|\\.)*"|;[^\n]*/gmu;
const SKIPPED_LINE_START_RE = /^[*#:!&?%]/mu;
const SKIPPED_LINE_RE = /^[*#:!&?%]/u;

/**
 * Whether Beancount skips `line` whole, so a `"` on it opens no string. The
 * one rule every line scanner here applies (w31/099). Only meaningful for a
 * line that starts outside a string: inside one, the first character is the
 * string's content.
 */
export function isSkippedLine(line: string): boolean {
  return SKIPPED_LINE_RE.test(line);
}

/** `source` with every line Beancount skips turned into a `;` comment. */
export function commentSkippedLines(source: string): string {
  if (!SKIPPED_LINE_START_RE.test(source)) return source;
  return source.replace(SKIPPED_LINE_OR_TOKEN_RE, (token) =>
    token.startsWith('"') || token.startsWith(";")
      ? token
      : `;${token.slice(1)}`,
  );
}

const LEADING_DOT_NUMBER_RE = /(?<![\w.:#^])\.\d/u;
const LEADING_DOT_OR_TOKEN_RE =
  /"(?:[^"\\]|\\.)*"|;[^\n]*|(?<![\w.:#^])\.(?=\d)/gu;

/**
 * `source` with a number written without its leading zero (`.5`, `-.5`,
 * `+.5`) given one. Beancount's lexer refuses `.5`: its number rule needs a
 * leading digit, so it answers `Invalid token: '.5'` and drops the directive,
 * and `stockSyntaxErrors` reports that error at each dot found here (w31/121).
 * rustledger 0.24 rejects the dot too, then keeps the posting with the number
 * 5 and drops the sign, so Home, Accounts and Reports totalled ten times the
 * amount written (w21/969); with the zero, the figure is the one the writer
 * meant while the error says the text is wrong. Strings and `;` comments are
 * matched first and left as they are, and a dot after a letter, digit, `:`,
 * `#` or `^` is part of something else.
 */
export function withLeadingZeros(source: string): string {
  if (!LEADING_DOT_NUMBER_RE.test(source)) return source;
  return source.replace(LEADING_DOT_OR_TOKEN_RE, (token) =>
    token === "." ? "0." : token,
  );
}

/** The offset of each dot {@link withLeadingZeros} gives a zero, in order. */
export function leadingDotOffsets(source: string): number[] {
  if (!LEADING_DOT_NUMBER_RE.test(source)) return [];
  const offsets: number[] = [];
  for (const match of source.matchAll(LEADING_DOT_OR_TOKEN_RE)) {
    if (match[0] === ".") offsets.push(match.index);
  }
  return offsets;
}

const TOLERANCE_FROM_COST_RE =
  /^[ \t]*option[ \t]*"infer_tolerance_from_cost"/mu;
const TOLERANCE_FROM_COST_OR_TOKEN_RE =
  /^([ \t]*option[ \t]*"infer_tolerance_from_cost"[ \t]*)"([^"\\\n]*)"|"(?:[^"\\]|\\.)*"|;[^\n]*/gmu;

/**
 * `source` with each `option "infer_tolerance_from_cost"` value the engine
 * refuses written as the `TRUE` or `FALSE` Beancount reads it as. Beancount
 * has no converter for this option: its `option()` reads `true` or `on` in
 * any case, or `1`, as true and every other value as false, with no error.
 * rustledger 0.24 takes `true` or `false` in any case, `1` or `0`, and
 * leaves the flag off for anything else, so `on` lost the cost tolerance a
 * buy needs to balance (w31/139). Strings and `;` comments are matched whole,
 * so an option line inside a multi-line string is left as it is; a value with
 * an escape or a line break is not rewritten, so no line moves.
 */
export function withStockToleranceFromCost(source: string): string {
  if (!TOLERANCE_FROM_COST_RE.test(source)) return source;
  return source.replace(
    TOLERANCE_FROM_COST_OR_TOKEN_RE,
    (token, head: string | undefined, value: string | undefined) => {
      if (head === undefined || value === undefined) return token;
      const lower = value.toLowerCase();
      if (["true", "false", "1", "0"].includes(lower)) return token;
      return `${head}"${lower === "on" ? "TRUE" : "FALSE"}"`;
    },
  );
}

/**
 * The files the engine parses: undecodable sources read as empty files, lines
 * Beancount skips read as comments, a number without its leading zero given
 * one, `infer_tolerance_from_cost` spelled as Beancount reads it, and a hidden
 * file no include reaches is left out, since the engine's glob matches
 * `y/.draft.bean` for `include "y/*.bean"` where Beancount's skips it
 * (w21/657).
 */
export function parseableFiles(files: FileMap, entryPoint: string): FileMap {
  const hidden = Object.keys(files).some(isHiddenRepoPath);
  const reached = hidden
    ? new Set(collectSourceFiles(files, entryPoint))
    : undefined;
  let changed = false;
  const parseable = Object.create(null) as FileMap;
  for (const [path, content] of Object.entries(files)) {
    if (reached && !reached.has(path) && isHiddenRepoPath(path)) {
      changed = true;
      continue;
    }
    const text =
      content === UNDECODABLE_SOURCE
        ? ""
        : withStockToleranceFromCost(
            withLeadingZeros(commentSkippedLines(content)),
          );
    if (text !== content) changed = true;
    parseable[path] = text;
  }
  return changed ? parseable : files;
}
