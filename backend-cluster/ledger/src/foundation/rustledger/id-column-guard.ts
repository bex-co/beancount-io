import type { QueryResult } from "@rustledger/wasm";

/**
 * The `id` column is positional on the engine, content-addressed on stock
 * (w23/153; the upstream identity-scheme half is w23/blocked/022 it.983).
 *
 * rustledger 0.24.0 projects small ordinals for `id` (`0`, `1`, `2`, …
 * — one per directive, shared by a transaction's postings) while stock
 * beanquery projects stable `hash_entry` hex strings. The name is the
 * same but the identity scheme differs, so every `id`-keyed filter,
 * join, or display ported from stock silently mismatches: `WHERE id =
 * 'abc'` reads empty, `WHERE id = 3` matches an ordinal stock never
 * had, and projected ids join against nothing. Refused before the
 * query runs.
 *
 * The rule is mention-based, which bounds the guard:
 *
 * - Any bare or dotted `id` column mention fires — projection,
 *   comparison, `IN`, `GROUP BY`, `ORDER BY`, function arguments —
 *   since every use consumes the wrong values. `id` as a plain-table
 *   alias (`FROM postings id … id.payee`) is stripped before the scan
 *   along with its qualified refs, so only genuine column mentions
 *   fire; a subquery aliased `id` still fires (rare; loud beats
 *   silent). An `id(` call stays out — the engine's own syntax error
 *   is the honest report there.
 * - String literals and slash-star block comments may name `id`
 *   without meaning the column. `--` is deliberately NOT stripped: it
 *   is double negation in BQL, not a comment (w23/blocked/022
 *   it.1514), so `id` beside one still fires.
 * - A name shadowed by an `AS id` alias anywhere in the query is
 *   skipped, since the alias retypes it (the 128 convention) — except
 *   the absurd `SELECT id AS id`, which leaks by construction, as does
 *   a table aliased `AS id` beside a genuine column mention.
 * - `SELECT *` carries no mention and passes. On the served path that
 *   is safe — the shell trims `*` to a set without `id` (022 it.905);
 *   the raw engine's wider `*` expansion is 022's item, not this one's.
 * - Only SELECT statements are scanned.
 *
 * Remove once the engine projects stock's hashes (or refuses `id`
 * itself); the live check in `scripts/verify-rustledger.ts` shows when.
 */
const ALIAS_DEF = /\bas\s+([A-Za-z_]\w*)/gi;
const SELECT_STMT = /\bselect\b/i;
const ID_MENTION = /(?<![\w.])(?:[A-Za-z_]\w*\.)?id\b(?!\s*\()(?!\.)/i;
const TABLE_ALIAS_ID =
  /\b(?:from|join)\s+[A-Za-z_]\w*\s+(?:as\s+)?id\b|\bid\s*\.\s*[A-Za-z_]\w*/gi;

/** The query error for an `id` column mention, or `undefined`. */
export function idColumnError(query: string): QueryResult | undefined {
  const unquoted = query
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
  if (!SELECT_STMT.test(unquoted)) return undefined;
  const shadowed = new Set(
    [...unquoted.matchAll(ALIAS_DEF)].map((m) => (m[1] as string).toLowerCase()),
  );
  if (shadowed.has("id")) return undefined;
  // A table alias named `id` is not the column; strip the declaration
  // and its qualified refs so only genuine mentions fire.
  const unaliased = unquoted.replace(TABLE_ALIAS_ID, " ");
  if (!ID_MENTION.test(unaliased)) return undefined;
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message:
          "The `id` column is not supported by this query engine: it projects positional ordinals where stock beanquery projects stable content hashes, so any `id` it returns silently mismatches stock. Filter or join on entry attributes instead — dates, narrations, or accounts — rather than `id`.",
        code: null,
        phase: "query",
        hint: "Replace `id` with entry-attribute filters such as date, narration, or account.",
        file: null,
        line: null,
        column: null,
        end_line: null,
        end_column: null,
        severity: "error",
      },
    ],
  };
}
