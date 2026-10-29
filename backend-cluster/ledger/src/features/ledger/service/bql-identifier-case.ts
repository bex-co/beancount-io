/**
 * Folds mixed-case BQL identifiers to the lowercase names the engine
 * resolves (w23/176).
 *
 * Stock beanquery resolves every identifier case-insensitively; rustledger
 * resolves tables and functions that way but matches column and alias names
 * exactly, so `SELECT PAYEE`, `WHERE Account = …`, and `upper(Payee)` die
 * with `column 'PAYEE' not found`. Columns are all lowercase, so lowercasing
 * every unquoted word that contains an uppercase letter is what stock does.
 *
 * Five things are left alone: keywords and function names (the engine already matches them case-insensitively), string literals (data — no escapes, the next
 * matching quote ends the literal), block comments, and alias declarations
 * (the word after `AS`), whose spelling is the output column's name. A
 * mixed-case reference to a declared alias takes the alias's spelling in
 * the clauses that can see aliases (GROUP/ORDER/HAVING/PIVOT BY), so
 * `SELECT payee AS Total … ORDER BY TOTAL` resolves. Words that are already
 * lowercase are never touched: `WHERE account = …` keeps resolving to the
 * column even when `AS Account` is declared, as before.
 *
 * Header caveat: a folded column prints lowercase (`SELECT PAYEE` → `payee`);
 * the engine names columns from the resolved name, and the only alternative
 * is the refusal this replaces.
 */
const IDENT = /[A-Za-z_][\w$]*/y;
const ALIAS_CLAUSE = /^(?:group|order|having|pivot)$/;
const OTHER_CLAUSE = /^(?:select|from|where|limit)$/;

/**
 * Words the engine already matches case-insensitively: clause and operator
 * keywords, and the literals. They pass through untouched so the later
 * stages and the engine see the user's own spelling; functions are skipped
 * by their following `(`.
 */
const KEYWORDS = new Set(
  (
    "select from where group order by having limit as and or not in is " +
    "null true false distinct all asc desc pivot open close clear on " +
    "between flatten balances journal print"
  ).split(" "),
);

type Word = { start: number; end: number; text: string; afterAs: boolean };

export function foldBqlIdentifierCase(query: string): string {
  const words = scanWords(query);
  const aliases = new Map<string, string>();
  for (const word of words) {
    if (word.afterAs) aliases.set(word.text.toLowerCase(), word.text);
  }

  let out = "";
  let cursor = 0;
  let aliasVisible = false;
  for (const word of words) {
    const lower = word.text.toLowerCase();
    if (ALIAS_CLAUSE.test(lower)) aliasVisible = true;
    else if (OTHER_CLAUSE.test(lower)) aliasVisible = false;
    if (
      KEYWORDS.has(lower) ||
      isCall(query, word.end) ||
      word.afterAs ||
      word.text === lower ||
      aliases.get(lower) === word.text
    ) {
      continue;
    }
    const folded = aliasVisible ? (aliases.get(lower) ?? lower) : lower;
    out += query.slice(cursor, word.start) + folded;
    cursor = word.end;
  }
  return out + query.slice(cursor);
}

/** Whether the word is a function name: its next non-space character is `(`. */
function isCall(query: string, end: number): boolean {
  let i = end;
  while (i < query.length && /\s/.test(query[i] as string)) i += 1;
  return query[i] === "(";
}

/** Unquoted identifier-shaped words outside strings and block comments. */
function scanWords(query: string): Word[] {
  const words: Word[] = [];
  let previous = "";
  let i = 0;
  while (i < query.length) {
    const ch = query[i] as string;
    if (ch === "'" || ch === '"') {
      const end = query.indexOf(ch, i + 1);
      i = end === -1 ? query.length : end + 1;
      previous = "";
      continue;
    }
    if (ch === "/" && query[i + 1] === "*") {
      const end = query.indexOf("*/", i + 2);
      i = end === -1 ? query.length : end + 2;
      continue;
    }
    // A digit run is one token (`1E5`, `2026-01-01`), never a word start.
    if (/[0-9.]/.test(ch)) {
      while (i < query.length && /[\w.$]/.test(query[i] as string)) i += 1;
      previous = "";
      continue;
    }
    IDENT.lastIndex = i;
    const ident = IDENT.exec(query);
    if (ident !== null && ident.index === i) {
      const text = ident[0];
      words.push({
        start: i,
        end: i + text.length,
        text,
        afterAs: previous === "as",
      });
      previous = text.toLowerCase();
      i += text.length;
      continue;
    }
    if (!/\s/.test(ch)) previous = "";
    i += 1;
  }
  return words;
}
