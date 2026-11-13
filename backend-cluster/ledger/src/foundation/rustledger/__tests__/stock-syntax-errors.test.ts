import { stockSyntaxErrors } from "../stock-syntax-errors";

/**
 * w23/240: three things stock beancount 3.2.3 refuses and rustledger 0.24.0
 * loads. The expectations below are what stock's loader says for the same text
 * (an unquoted booking method is `ParserSyntaxError`, a repeated commodity is
 * `ValidationError` on the later directive, a repeated metadata key is
 * `ParserError` on a transaction or a posting and nothing on any other
 * directive).
 */
const check = (main: string, other?: Record<string, string>) =>
  stockSyntaxErrors({ "main.bean": main, ...other }, "main.bean").map(
    (e) => `${e.file}:${e.line} ${e.code} ${e.message}`,
  );

const BOOKING_ERROR =
  'SYNTAX syntax error, unexpected CURRENCY, expecting end of file or EOL: the booking method is a quoted string, "';

describe("an unquoted booking method on open", () => {
  it.each([
    ["open Assets:Stock ABC STRICT", "STRICT"],
    ["open Assets:Stock ABC, DEF FIFO", "FIFO"],
    ["open Assets:Stock ABC,DEF  NONE  ; kept", "NONE"],
    ["open Assets:Stock ABC STRICT_WITH_SIZE", "STRICT_WITH_SIZE"],
  ])("is reported at its line: %s", (open, word) => {
    expect(
      check(`2020-01-01 open Assets:Cash USD\n2026-11-12 ${open}\n`),
    ).toEqual([`main.bean:2 ${BOOKING_ERROR}${word}"`]);
  });

  it("reports the column of the bare word", () => {
    const [found] = stockSyntaxErrors(
      { "main.bean": "2026-11-12 open Assets:Stock ABC STRICT\n" },
      "main.bean",
    );
    expect(found?.column).toBe(34);
  });

  it.each([
    // `STRICT` alone is a currency named STRICT in stock's grammar.
    "open Assets:Stock STRICT",
    'open Assets:Stock ABC "STRICT"',
    "open Assets:Stock ABC,STRICT",
    "open Assets:Stock ABC",
    "open Assets:Stock",
    'open Assets:Stock ABC, DEF "FIFO" ; note',
  ])("leaves a valid line alone: %s", (open) => {
    expect(check(`2026-11-12 ${open}\n`)).toEqual([]);
  });

  it("does not read a line inside a multi-line narration as a directive", () => {
    expect(
      check(
        [
          '2026-01-01 * "first line',
          "2026-11-12 open Assets:Stock ABC STRICT",
          'last line"',
          "  Assets:Cash  1 USD",
          "  Equity:O",
          "",
        ].join("\n"),
      ),
    ).toEqual([]);
  });
});

describe("a second commodity directive for one currency", () => {
  it("flags each later directive, on its own line", () => {
    expect(
      check(
        [
          "2026-01-01 commodity ZZZ",
          "2026-01-05 commodity YYY",
          "2026-02-01 commodity ZZZ",
          "2026-03-01 commodity ZZZ",
          "",
        ].join("\n"),
      ),
    ).toEqual([
      "main.bean:3 DUPLICATE_COMMODITY Duplicate commodity directives for 'ZZZ'",
      "main.bean:4 DUPLICATE_COMMODITY Duplicate commodity directives for 'ZZZ'",
    ]);
  });

  it("flags the later date even when the file lists it first", () => {
    expect(
      check("2026-06-01 commodity ZZZ\n2026-01-01 commodity ZZZ\n"),
    ).toEqual([
      "main.bean:1 DUPLICATE_COMMODITY Duplicate commodity directives for 'ZZZ'",
    ]);
  });

  it("counts a commodity in an included file", () => {
    expect(
      check('include "other.bean"\n2026-02-01 commodity ZZZ\n', {
        "other.bean": "2026-01-01 commodity ZZZ\n",
      }),
    ).toEqual([
      "main.bean:2 DUPLICATE_COMMODITY Duplicate commodity directives for 'ZZZ'",
    ]);
  });

  it("leaves different currencies, and a commodity with metadata, alone", () => {
    expect(
      check(
        '2026-01-01 commodity ZZZ\n  name: "a"\n2026-01-01 commodity YYY\n  name: "b"\n',
      ),
    ).toEqual([]);
  });
});

const txn = (...body: string[]) =>
  ['2026-11-12 * "x"', ...body, "  Assets:Cash  1 USD", "  Equity:O", ""].join(
    "\n",
  );

describe("a metadata key repeated on a transaction or a posting", () => {
  it("flags a repeated entry key on the transaction's line", () => {
    expect(
      check(
        [
          '2026-11-12 * "x"',
          '  k1: "a"',
          '  k1: "b"',
          "  Assets:Cash 1 USD",
          "  Equity:O",
          "",
        ].join("\n"),
      ),
    ).toEqual([
      "main.bean:1 DUPLICATE_METADATA Duplicate metadata field on entry: k1",
    ]);
  });

  it("flags a repeated posting key, and a key line after a posting belongs to it", () => {
    const expected = [
      "main.bean:1 DUPLICATE_METADATA Duplicate posting metadata field: k1",
    ];
    expect(
      check(
        [
          '2026-11-12 * "x"',
          "  Assets:Cash 1 USD",
          '    k1: "a"',
          '    k1: "b"',
          "  Equity:O",
          "",
        ].join("\n"),
      ),
    ).toEqual(expected);
    // Stock attaches any key line after a posting to it, whatever its indent.
    expect(
      check(
        [
          '2026-11-12 * "x"',
          "  Assets:Cash 1 USD",
          '  k1: "a"',
          '  k1: "b"',
          "  Equity:O",
          "",
        ].join("\n"),
      ),
    ).toEqual(expected);
  });

  it("reports each extra copy", () => {
    expect(check(txn('  k1: "a"', '  k1: "b"', '  k1: "c"'))).toHaveLength(2);
  });

  it("accepts the same key on the transaction and on a posting, and on two postings", () => {
    expect(
      check(
        [
          '2026-11-12 * "x"',
          '  k1: "a"',
          "  Assets:Cash 1 USD",
          '    k1: "b"',
          "  Equity:O",
          '    k1: "c"',
          "",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("does not hold a tags line, comment or blank line against the owner", () => {
    expect(
      check(txn("  #tag ^link", "  ; a comment", '  k1: "a"', "", '  k2: "b"')),
    ).toEqual([]);
  });

  it("accepts a repeated key on any other directive, as stock does", () => {
    expect(
      check(
        [
          '2026-11-12 open Assets:Cash USD\n  k1: "a"\n  k1: "b"',
          '2026-11-12 commodity ABC\n  k1: "a"\n  k1: "b"',
          '2026-11-12 note Assets:Cash "n"\n  k1: "a"\n  k1: "b"',
          "",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("does not read a line inside a multi-line string as a key", () => {
    expect(
      check(
        [
          '2026-11-12 * "first line',
          "  k1: a",
          '  k1: b"',
          "  Assets:Cash 1 USD",
          "  Equity:O",
          '    note: "one',
          "  note: two",
          '  note: three"',
          "",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  // Stock records a repeat only when the second value is not the same Python
  // object as the first, so a repeat of a value CPython shares is accepted.
  // Each row is stock 3.2.3's verdict for `k1: <first>` then `k1: <second>`.
  it.each([
    ["TRUE", "TRUE", false],
    ["TRUE", "FALSE", true],
    ['"a"', '"a"', false],
    ['""', '""', false],
    ['"é"', '"é"', false],
    ['"a"', '"b"', true],
    ['"ab"', '"ab"', true],
    ['"中"', '"中"', true],
    ["Assets:Cash", "Assets:Cash", false],
    ["Assets:Cash", "Equity:O", true],
    ["5", "5", true],
    ["2026-01-01", "2026-01-01", true],
    ["USD", "USD", true],
    ["#tg", "#tg", true],
    ['"a"', "5", true],
    ["TRUE", '"a"', true],
    ["", "", false],
  ])("repeats %s then %s: stock reports it = %s", (first, second, reported) => {
    const line = (value: string) => (value === "" ? "  k1:" : `  k1: ${value}`);
    expect(check(txn(line(first), line(second)))).toHaveLength(
      reported ? 1 : 0,
    );
  });

  it("compares a third copy with the first value, as stock does", () => {
    expect(check(txn('  k1: "a"', '  k1: "b"', '  k1: "a"'))).toHaveLength(1);
  });

  it("reads a key written straight against its quote", () => {
    expect(check(txn('  k1:"ab"', '  k1:"ab"'))).toEqual([
      "main.bean:1 DUPLICATE_METADATA Duplicate metadata field on entry: k1",
    ]);
  });

  it("abstains on a string with an escape, whose length it will not guess", () => {
    expect(check(txn('  k1: "a\\\\"', '  k1: "a\\\\"'))).toEqual([]);
  });

  it("reads txn and flag spellings as transactions", () => {
    for (const header of [
      '2026-11-12 txn "x"',
      '2026-11-12 ! "x"',
      '2026-11-12 P "x"',
    ]) {
      expect(check([header, '  k1: "a"', '  k1: "b"', ""].join("\n"))).toEqual([
        "main.bean:1 DUPLICATE_METADATA Duplicate metadata field on entry: k1",
      ]);
    }
  });
});
