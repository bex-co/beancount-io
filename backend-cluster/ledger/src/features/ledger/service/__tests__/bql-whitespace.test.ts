import { foldBqlWhitespace } from "../bql-whitespace";

// Stock beanquery separates tokens on Python `\s`; the engine only on ASCII
// space/tab/CR/LF. Every non-ASCII member of that class folds to a space
// outside string literals (w23/162), verified against stock beanquery 0.2.0.
const FOLDABLE: Array<[string, string]> = [
  ["VTAB", "\x0b"],
  ["FF", "\x0c"],
  ["FS", "\x1c"],
  ["GS", "\x1d"],
  ["RS", "\x1e"],
  ["US", "\x1f"],
  ["NEL", "\x85"],
  ["NBSP", "\xa0"],
  ["OGHAM", "\u1680"],
  ["EN QUAD", "\u2000"],
  ["EM QUAD", "\u2001"],
  ["EN SPACE", "\u2002"],
  ["EM SPACE", "\u2003"],
  ["THREE-PER-EM", "\u2004"],
  ["FOUR-PER-EM", "\u2005"],
  ["SIX-PER-EM", "\u2006"],
  ["FIGURE", "\u2007"],
  ["PUNCTUATION", "\u2008"],
  ["THIN", "\u2009"],
  ["HAIR", "\u200a"],
  ["LINE SEPARATOR", "\u2028"],
  ["PARAGRAPH SEPARATOR", "\u2029"],
  ["NNBSP", "\u202f"],
  ["MMSP", "\u205f"],
  ["IDEOGRAPHIC", "\u3000"],
];

describe("foldBqlWhitespace", () => {
  it.each(FOLDABLE)("folds %s to a space", (_name, ch) => {
    expect(foldBqlWhitespace(`SELECT${ch}1`)).toBe("SELECT 1");
  });

  it("leaves ASCII gaps untouched", () => {
    const query = "SELECT 1\tFROM\r\naccounts LIMIT 2";
    expect(foldBqlWhitespace(query)).toBe(query);
  });

  it("returns the same string when nothing folds", () => {
    const query = "SELECT account FROM accounts";
    expect(foldBqlWhitespace(query)).toBe(query);
  });

  it("keeps string data byte-identical", () => {
    expect(foldBqlWhitespace(`SELECT 'a\xa0b' AS\xa0s`)).toBe(`SELECT 'a\xa0b' AS s`);
    expect(foldBqlWhitespace('SELECT "a\u2003b" AS\xa0s')).toBe(
      'SELECT "a\u2003b" AS s',
    );
  });

  it("folds nothing past an unterminated string", () => {
    expect(foldBqlWhitespace(`SELECT 'a\xa0b`)).toBe(`SELECT 'a\xa0b`);
  });

  it("keeps offsets and length identical", () => {
    const query = "SELECT\xa0count(*)\u2003AS\xa0n\nFROM\xa0postings;";
    const folded = foldBqlWhitespace(query);
    expect(folded).toHaveLength(query.length);
    expect(folded).toBe("SELECT count(*) AS n\nFROM postings;");
  });

  it("does not fold what stock refuses", () => {
    // ZWSP and BOM are syntax errors in stock too \u2014 the shared refusal is
    // parity, so they pass through to the engine's own report.
    expect(foldBqlWhitespace("SELECT\u200b1")).toBe("SELECT\u200b1");
    expect(foldBqlWhitespace("\ufeffSELECT 1")).toBe("\ufeffSELECT 1");
  });

  it("is idempotent", () => {
    const query = "SELECT\xa0count(*)\u2003AS\xa0n FROM\xa0postings;";
    expect(foldBqlWhitespace(foldBqlWhitespace(query))).toBe(
      foldBqlWhitespace(query),
    );
  });
});
