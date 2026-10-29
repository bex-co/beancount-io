/**
 * Unquotes a double-quoted SELECT alias after `AS` (w23/188).
 *
 * Stock beanquery takes `SELECT payee AS "p"` and names the column `p`;
 * rustledger 0.24.0's alias rule accepts only a bare name and refuses the
 * quoted one with `syntax error … unexpected token 'AS'`, mislocating the
 * fault at the alias keyword. A quoted alias that is a plain identifier is
 * exactly its bare self, so the quotes come off before the engine sees it.
 *
 * Only `AS "<identifier>"` moves: single-quoted aliases, quoted text that
 * is not identifier-shaped (spaces, punctuation), and every double-quoted
 * string outside an alias position stay as written for the engine and the
 * quoted-identifier guard to judge. Strings use the family's no-escape
 * rule (the next matching quote ends the literal). The change shortens the
 * text by two characters per alias, so offsets in later engine errors shift
 * like the other rewriting stages.
 */
const AS_BEFORE = /(?<![\w$.])as\s*$/i;
const IDENTIFIER = /^[A-Za-z_][\w$]*$/;

export function unquoteBqlAliases(query: string): string {
  let out = "";
  let i = 0;
  while (i < query.length) {
    const ch = query[i] as string;
    if (ch !== "'" && ch !== '"') {
      out += ch;
      i += 1;
      continue;
    }
    const close = query.indexOf(ch, i + 1);
    if (close === -1) return query;
    const literal = query.slice(i, close + 1);
    const inner = literal.slice(1, -1);
    if (ch === '"' && IDENTIFIER.test(inner) && AS_BEFORE.test(out)) {
      out += inner;
    } else {
      out += literal;
    }
    i = close + 1;
  }
  return out;
}
