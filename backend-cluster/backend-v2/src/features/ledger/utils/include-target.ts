import { posix } from "path";
import { BadUserInputError } from "@/shared/errors";

/**
 * `include` lines as the ledger service loads them: a target resolves against
 * the directory of the file that declares it, and may be a glob (w23/029).
 * The ledger service's `resolveIncludeTarget`/`globToRegExp` in
 * `backend-cluster/ledger/src/foundation/rustledger/file-map-loader.ts` are the
 * reference; packages share no code, so the rule is restated here.
 */

/** One `include` line split around its target. */
export interface IncludeLine {
  prefix: string;
  target: string;
  quote: '"' | "'" | "";
  suffix: string;
}

const INCLUDE_LINE =
  /^(\s*include\s+)(?:"((?:[^"\\]|\\.)*)"|'([^']+)'|(\S+))(\s*(?:;.*)?)$/;

export function parseIncludeLine(line: string): IncludeLine | null {
  const match = line.match(INCLUDE_LINE);
  if (!match) return null;
  const [, prefix, doubled, single, bare, suffix] = match;
  if (doubled !== undefined) {
    return {
      prefix: prefix!,
      target: doubled.replace(/\\(.)/g, "$1"),
      quote: '"',
      suffix: suffix!,
    };
  }
  return {
    prefix: prefix!,
    target: (single ?? bare)!,
    quote: single !== undefined ? "'" : "",
    suffix: suffix!,
  };
}

/** Writes `target` into the line's place, escaped so it parses back intact. */
export function formatIncludeLine(line: IncludeLine, target: string): string {
  const quote =
    line.quote === '"' || /[\s"'\\;]/.test(target) ? '"' : line.quote;
  const written =
    quote === '"'
      ? `"${target.replace(/[\\"]/g, "\\$&")}"`
      : `${quote}${target}${quote}`;
  return `${line.prefix}${written}${line.suffix}`;
}

/**
 * `content` with an `include` line for each path after its last `include`,
 * or at its end: how a file a write routes to joins the include closure
 * (w23/062). The ledger service's `addIncludes` is the bulk route's twin.
 */
export function addIncludeLines(
  content: string,
  paths: readonly string[],
  field = "path",
): string {
  if (paths.length === 0) return content;
  for (const path of paths) assertLiteralIncludePath(path, field);
  const block = paths.map((path) =>
    formatIncludeLine(
      { prefix: "include ", target: path, quote: '"', suffix: "" },
      path,
    ),
  );
  const lines = content.split("\n");
  const last = lines.findLastIndex((line) => parseIncludeLine(line) !== null);
  if (last >= 0) {
    lines.splice(last + 1, 0, ...block);
    return lines.join("\n");
  }
  const body = content.replace(/\n+$/, "");
  return `${body}${body ? "\n" : ""}${block.join("\n")}\n`;
}

/** A URL target names nothing in the repository and is never resolved. */
export function isUrlTarget(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(target);
}

/** The repo-relative path (or pattern) `target` names from `includingPath`. */
export function resolveIncludeTarget(
  includingPath: string,
  target: string,
): string {
  const joined = target.startsWith("/")
    ? target
    : posix.join(posix.dirname(includingPath), target);
  return posix.normalize(joined).replace(/^\/+/, "");
}

/**
 * The target that names `path` from `includingPath`, in the style of the
 * target it replaces: root-anchored stays root-anchored, and `./` is kept.
 */
export function includeTargetFor(
  includingPath: string,
  path: string,
  previous: string,
): string {
  if (previous.startsWith("/")) return `/${path}`;
  const relative = posix.relative(posix.dirname(includingPath), path);
  return previous.startsWith("./") && !relative.startsWith("../")
    ? `./${relative}`
    : relative;
}

export function isGlobPattern(target: string): boolean {
  return /[*?[]/.test(target);
}

/**
 * Refuse a file path containing a Beancount `include` glob metacharacter
 * (`*`, `?`, or `[`) when writing a literal `include` line for it (w31/093).
 * Both Python `glob.glob` and `rustledger` expand `[...]` as a character class,
 * and {@link isGlobPattern} treats it as a non-rewritable glob. Non-included
 * files (e.g. attachments like `receipt[1].pdf`) never call this guard.
 */
export function assertLiteralIncludePath(path: string, field = "path"): void {
  if (isGlobPattern(path)) {
    throw new BadUserInputError(
      `${field} ${JSON.stringify(path)} contains a Beancount include glob metacharacter (*, ?, or [) and cannot be targeted literally in an include line`,
      field,
      "Choose a path without *, ?, or [ when writing an include line for it.",
    );
  }
}

type SegmentToken =
  | { kind: "star" }
  | { kind: "any" }
  | { kind: "char"; char: string }
  | { kind: "class"; test: (char: string) => boolean };

function segmentTokens(pattern: string): SegmentToken[] {
  const tokens: SegmentToken[] = [];
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i]!;
    if (char === "*") {
      if (tokens.at(-1)?.kind !== "star") tokens.push({ kind: "star" });
      continue;
    }
    if (char === "?") {
      tokens.push({ kind: "any" });
      continue;
    }
    if (char === "[") {
      // fnmatch: `[!…]` negates, and a `]` right after the opening is literal.
      let end = i + 1;
      if (pattern[end] === "!") end += 1;
      if (pattern[end] === "]") end += 1;
      while (end < pattern.length && pattern[end] !== "]") end += 1;
      if (end < pattern.length) {
        const body = pattern.slice(i + 1, end);
        const negate = body.startsWith("!");
        const set = negate ? body.slice(1) : body;
        const ranges: [string, string][] = [];
        for (let j = 0; j < set.length; j += 1) {
          if (set[j + 1] === "-" && j + 2 < set.length) {
            ranges.push([set[j]!, set[j + 2]!]);
            j += 2;
          } else ranges.push([set[j]!, set[j]!]);
        }
        tokens.push({
          kind: "class",
          test: (c) =>
            ranges.some(([low, high]) => c >= low && c <= high) !== negate,
        });
        i = end;
        continue;
      }
    }
    tokens.push({ kind: "char", char });
  }
  return tokens;
}

/** One path segment against one pattern segment, as an NFA: no backtracking. */
function segmentMatches(pattern: string, name: string): boolean {
  // Python's glob skips hidden names unless the pattern names the dot.
  if (name.startsWith(".") && !pattern.startsWith(".")) return false;
  const tokens = segmentTokens(pattern);
  const close = (states: Set<number>) => {
    for (const state of states)
      if (tokens[state]?.kind === "star") states.add(state + 1);
    return states;
  };
  let states = close(new Set([0]));
  for (const char of name) {
    const next = new Set<number>();
    for (const state of states) {
      const token = tokens[state];
      if (!token) continue;
      if (token.kind === "star") next.add(state);
      else if (
        token.kind === "any" ||
        (token.kind === "char" && token.char === char) ||
        (token.kind === "class" && token.test(char))
      )
        next.add(state + 1);
    }
    states = close(next);
  }
  return states.has(tokens.length);
}

/**
 * Whether repo path `path` is one of the files glob `pattern` includes, under
 * Python's `glob.glob(pattern, recursive=True)`: `**` spans any number of
 * non-hidden directories, everything else matches within one segment.
 */
export function globMatches(pattern: string, path: string): boolean {
  const patterns = pattern.split("/");
  const names = path.split("/");
  const memo = new Map<number, boolean>();
  const match = (p: number, n: number): boolean => {
    const key = p * (names.length + 1) + n;
    const known = memo.get(key);
    if (known !== undefined) return known;
    let result: boolean;
    if (p === patterns.length) result = n === names.length;
    else if (patterns[p] === "**")
      result =
        match(p + 1, n) ||
        (n < names.length && !names[n]!.startsWith(".") && match(p, n + 1));
    else
      result =
        n < names.length &&
        segmentMatches(patterns[p]!, names[n]!) &&
        match(p + 1, n + 1);
    memo.set(key, result);
    return result;
  };
  return match(0, 0);
}
