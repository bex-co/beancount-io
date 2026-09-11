/**
 * Neutralizes BQL block comments before the query reaches the engine.
 *
 * The upstream BQL grammar declares `/* … *\/` block comments and Python
 * beanquery accepts them anywhere outside a string literal, but rustledger's
 * parser only skips plain whitespace — so an annotated query that runs in
 * beanquery fails with `syntax error at position 0: found '/' expected
 * identifier` on every one of our surfaces (dashboard, REST, GraphQL, MCP).
 *
 * This is a normalizer, not a parser fork: each comment character is replaced
 * with a space and newlines are kept, so byte offsets and line numbers in the
 * engine's error messages still point at the user's original text.
 *
 * Deliberately NOT handled, because the Python oracle rejects them too:
 * `--`, `#` and `;` line comments. And deliberately left to fail: an
 * unterminated `/*` is returned unchanged so the engine still reports it, and a
 * comment-only query normalizes to whitespace, which the engine still rejects.
 */
export function stripBqlBlockComments(query: string): string {
  if (!query.includes("/*")) return query;

  // UTF-16 units, not code points: replacing each unit with a space keeps the
  // string length identical so engine error offsets stay aligned. Both halves
  // of a surrogate pair inside a comment are replaced together.
  const out = query.split("");
  let i = 0;
  let quote: string | undefined;

  while (i < out.length) {
    const ch = out[i];

    if (quote !== undefined) {
      // BQL has no escape sequences inside string literals — a backslash is an
      // ordinary byte, including immediately before the closing quote — so the
      // next matching quote character always ends the literal. Adjacent quotes
      // ('' or "") therefore close one literal and open the next, which leaves
      // the in/out-of-string parity correct either way it is read.
      if (ch === quote) quote = undefined;
      i += 1;
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      i += 1;
      continue;
    }

    if (ch === "/" && out[i + 1] === "*") {
      const end = findCommentEnd(out, i + 2);
      // Unterminated comment: hand the original text to the engine so it keeps
      // reporting a syntax error rather than silently running a truncated query.
      if (end === -1) return query;
      for (let j = i; j < end; j += 1) {
        if (out[j] !== "\n") out[j] = " ";
      }
      i = end;
      continue;
    }

    i += 1;
  }

  // An unterminated string literal is likewise the engine's error to report.
  return quote === undefined ? out.join("") : query;
}

/** Index just past the `*\/` that closes a comment opened before `from`. */
function findCommentEnd(chars: string[], from: number): number {
  for (let i = from; i < chars.length - 1; i += 1) {
    if (chars[i] === "*" && chars[i + 1] === "/") return i + 2;
  }
  return -1;
}
