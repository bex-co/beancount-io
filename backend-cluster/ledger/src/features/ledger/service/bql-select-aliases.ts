/**
 * Top-level SELECT aliases for dtype attribution (w23/134).
 *
 * `classifyColumnDtype` falls back to the output column *name* when every
 * value is NULL (or there are no rows) — correct when the name is the
 * source column (`SELECT number … WHERE FALSE` → Decimal), confidently
 * wrong when it is an alias shadowing another type (`SELECT payee AS
 * number …` → Decimal for string data). This maps each top-level alias
 * to its source root — the first identifier of its SELECT item — so the
 * fallback can tell the two apart: an alias whose root differs from the
 * name reports `unknown` instead of the lookalike's type, while a bare
 * column and a redundant alias (`number AS number`) keep the name rule.
 *
 * Aliases need `AS`: stock beanquery 0.2.0 and the engine both reject
 * bare aliases (`SELECT payee number` is a syntax error on each), so
 * explicit-`AS` extraction is complete. The scan is string-, comment-,
 * and paren-aware: commas and clause keywords inside strings, block
 * comments, or nested queries never split the list, and an `AS` inside
 * an item's own parens (a cast-shaped call) is not an alias. Duplicate
 * aliases keep the last root — positional attribution would break on
 * `SELECT *` expansion, and the common cases are all exact.
 */
/**
 * The root recorded for an item that opens with a string literal (w23/177):
 * not an identifier, so it can never equal a column name, but distinct from
 * the empty root of numeric and NULL/TRUE/FALSE heads, so the mapper can
 * report such an alias `str` instead of sniffing its values.
 */
export const STRING_LITERAL_ROOT = "'";

const AS_WORD = /\bas\b/iy;
const GAP = /\s*/y;
const IDENT = /[A-Za-z_][\w$]*/y;

export type SelectAliasInfo = {
  /** Alias → source root (the map `extractSelectAliases` returns). */
  roots: Map<string, string>;
  /** Alias → SELECT-item head text, for typing a computed head (w23/m14/t003). */
  heads: Map<string, string>;
};

/**
 * Both alias maps from one scan of the SELECT list, keyed by lowercased alias.
 * The root says what an alias is *rooted* in; a computed head such as
 * `sum(number)` or `year(date)` also has a static type the mapper can report
 * on an empty result instead of `unknown`. Duplicate aliases keep the last.
 */
export function extractSelectAliasInfo(query: string): SelectAliasInfo {
  const roots = new Map<string, string>();
  const heads = new Map<string, string>();
  const list = topLevelSelectList(query);
  if (list === undefined) return { roots, heads };
  for (const item of splitTopLevel(list)) {
    const aliased = splitAlias(item);
    if (aliased === undefined) continue;
    const alias = aliased.alias.toLowerCase();
    roots.set(alias, sourceRoot(aliased.head));
    heads.set(alias, stripLeadingComments(aliased.head));
  }
  return { roots, heads };
}

export function extractSelectAliases(query: string): Map<string, string> {
  return extractSelectAliasInfo(query).roots;
}

export function extractSelectAliasHeads(query: string): Map<string, string> {
  return extractSelectAliasInfo(query).heads;
}

/**
 * The top-level SELECT list: between the first depth-0 SELECT and the
 * first depth-0 clause word after it (FROM/WHERE/GROUP/ORDER/LIMIT/
 * HAVING/PIVOT) or the end of the query for a FROM-less select.
 */
function topLevelSelectList(query: string): string | undefined {
  const tokens = scan(query);
  let selectIndex = -1;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i] as Token;
    if (
      token.depth === 0 &&
      token.kind === "word" &&
      isKeyword(token, "select")
    ) {
      selectIndex = i;
      break;
    }
  }
  if (selectIndex === -1) return undefined;
  let end = query.length;
  for (let i = selectIndex + 1; i < tokens.length; i += 1) {
    const token = tokens[i] as Token;
    if (token.depth !== 0 || token.kind !== "word" || !isCutWord(token)) {
      continue;
    }
    end = token.start;
    break;
  }
  const from = (tokens[selectIndex] as Token).end;
  return query.slice(from, end);
}

type Token = {
  kind: "word" | "other";
  start: number;
  end: number;
  depth: number;
  text: string;
};

/** Word tokens outside strings/comments, each with its paren depth. */
function scan(query: string): Token[] {
  const tokens: Token[] = [];
  let depth = 0;
  let i = 0;
  while (i < query.length) {
    const ch = query[i] as string;
    if (ch === "'" || ch === '"') {
      i = skipString(query, i);
      continue;
    }
    if (ch === "/" && query[i + 1] === "*") {
      i = skipBlockComment(query, i);
      continue;
    }
    if (ch === "(") {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      i += 1;
      continue;
    }
    IDENT.lastIndex = i;
    const ident = IDENT.exec(query);
    if (ident !== null && ident.index === i) {
      tokens.push({
        kind: "word",
        start: i,
        end: i + ident[0].length,
        depth,
        text: ident[0],
      });
      i += ident[0].length;
      continue;
    }
    GAP.lastIndex = i;
    const gap = GAP.exec(query) as RegExpExecArray;
    if (gap.index === i && gap[0].length > 0) {
      i += gap[0].length;
      continue;
    }
    tokens.push({ kind: "other", start: i, end: i + 1, depth, text: ch });
    i += 1;
  }
  return tokens;
}

/** No-escape rule, like the rest of the family. */
function skipString(query: string, i: number): number {
  const quote = query[i] as string;
  let j = i + 1;
  while (j < query.length && query[j] !== quote) j += 1;
  return Math.min(j + 1, query.length);
}

function skipBlockComment(query: string, i: number): number {
  const end = query.indexOf("*/", i + 2);
  return end === -1 ? query.length : end + 2;
}

function isKeyword(token: Token, word: string): boolean {
  return token.text.toLowerCase() === word;
}

function isCutWord(token: Token): boolean {
  return /^(?:from|where|group|order|limit|having|pivot)$/i.test(token.text);
}

/** Split a SELECT list on depth-0 commas (strings/comments/parens aware). */
function splitTopLevel(list: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < list.length) {
    const ch = list[i] as string;
    if (ch === "'" || ch === '"') {
      i = skipString(list, i);
      continue;
    }
    if (ch === "/" && list[i + 1] === "*") {
      i = skipBlockComment(list, i);
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === "," && depth === 0) {
      items.push(list.slice(start, i));
      start = i + 1;
    }
    i += 1;
  }
  items.push(list.slice(start));
  return items;
}

/**
 * The last depth-0 AS in an item splits head from alias; without one
 * the item is unaliased. The alias is one bare or quoted identifier —
 * anything longer stays with the engine.
 */
function splitAlias(item: string): { head: string; alias: string } | undefined {
  let depth = 0;
  let lastAs = -1;
  let i = 0;
  while (i < item.length) {
    const ch = item[i] as string;
    if (ch === "'" || ch === '"') {
      i = skipString(item, i);
      continue;
    }
    if (ch === "/" && item[i + 1] === "*") {
      i = skipBlockComment(item, i);
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    AS_WORD.lastIndex = i;
    const as = AS_WORD.exec(item);
    if (as !== null && as.index === i && depth === 0) {
      lastAs = i;
      i += as[0].length;
      continue;
    }
    i += 1;
  }
  if (lastAs === -1) return undefined;
  const alias = parseAliasTail(item.slice(lastAs + 2));
  if (alias === undefined || alias === "") return undefined;
  return { head: item.slice(0, lastAs), alias };
}

/**
 * One bare or quoted alias past AS, ignoring surrounding block comments;
 * anything longer stays with the engine.
 */
function parseAliasTail(tail: string): string | undefined {
  const text = stripLeadingComments(tail.trim());
  const first = text[0] as string | undefined;
  if (first === "'" || first === '"') {
    const end = text.indexOf(first, 1);
    if (end === -1) return undefined;
    const rest = stripLeadingComments(text.slice(end + 1).trim());
    if (rest !== "") return undefined;
    return text.slice(1, end);
  }
  IDENT.lastIndex = 0;
  const ident = IDENT.exec(text);
  if (ident === null || ident.index !== 0) return undefined;
  const rest = stripLeadingComments(text.slice(ident[0].length).trim());
  if (rest !== "") return undefined;
  return ident[0];
}

function stripLeadingComments(text: string): string {
  let out = text;
  for (;;) {
    const trimmed = out.trim();
    if (!trimmed.startsWith("/*")) return trimmed;
    const end = trimmed.indexOf("*/", 2);
    if (end === -1) return "";
    out = trimmed.slice(end + 2);
  }
}

/**
 * First identifier of an item head past DISTINCT/ALL, parens, and `-` —
 * or "" when the head is a literal (a literal's content is not an
 * identifier: `'number' AS number` over zero rows must not inherit the
 * Decimal name rule). A string-literal head reports {@link STRING_LITERAL_ROOT}
 * so its type survives the alias; other literals report "".
 */
function sourceRoot(head: string): string {
  let text = stripLeadingComments(head);
  text = text.replace(/^(?:distinct|all)\b/i, "").trim();
  text = stripLeadingComments(text);
  while (text.startsWith("(") || text.startsWith("-")) {
    text = stripLeadingComments(text.slice(1));
  }
  if (/^(?:null|true|false)\b/i.test(text)) return "";
  const first = text[0] as string | undefined;
  if (first === "'" || first === '"') return STRING_LITERAL_ROOT;
  IDENT.lastIndex = 0;
  const ident = IDENT.exec(text);
  return ident !== null && ident.index === 0 ? ident[0].toLowerCase() : "";
}
