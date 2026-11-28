import { parseableFiles } from "../parseable-files";
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

// w31/107: stock's lexer reads `2026/09/01` and `2026-9-1` as dates too (a
// ledger converted from ledger-cli writes every date with slashes), and
// bean-check 3.2.3 gives the same three errors, at the same lines, for each.
describe("a header dated in any spelling the lexer reads", () => {
  const SPELLINGS = [
    ["2026-09-01", "2026-09-03"],
    ["2026/09/01", "2026/09/03"],
    ["2026-9-1", "2026-9-3"],
  ];

  it.each(SPELLINGS)("reports all three for %s", (first, later) => {
    expect(
      check(
        [
          `${first} open Assets:QaStock ABC STRICT`,
          `${first} commodity QAZZ`,
          `${later} commodity QAZZ`,
          `${first} * "qa" "dupmeta"`,
          '  kk: "ab"',
          '  kk: "ab"',
          "  Assets:Cash  -1.00 USD",
          "  Expenses:Food:Coffee 1.00 USD",
          `${first} txn "qa"`,
          '  kk: "ab"',
          '  kk: "ab"',
          "",
        ].join("\n"),
      ),
    ).toEqual([
      `main.bean:1 ${BOOKING_ERROR}STRICT"`,
      "main.bean:4 DUPLICATE_METADATA Duplicate metadata field on entry: kk",
      "main.bean:9 DUPLICATE_METADATA Duplicate metadata field on entry: kk",
      "main.bean:3 DUPLICATE_COMMODITY Duplicate commodity directives for 'QAZZ'",
    ]);
  });

  it("flags the later date when the spellings differ, whichever sorts first as text", () => {
    // As written, `2026/09/01` sorts after `2026-09-03`; stock flags line 1.
    expect(
      check("2026-09-03 commodity QAZZ\n2026/09/01 commodity QAZZ\n"),
    ).toEqual([
      "main.bean:1 DUPLICATE_COMMODITY Duplicate commodity directives for 'QAZZ'",
    ]);
    expect(
      check("2026-9-10 commodity QAZZ\n2026-09-02 commodity QAZZ\n"),
    ).toEqual([
      "main.bean:1 DUPLICATE_COMMODITY Duplicate commodity directives for 'QAZZ'",
    ]);
  });

  // Each is a syntax error in stock, not a dated directive.
  it.each(["20260901", "2026.09.01", "26/09/01", "x2026/09/01", "2026_09_01"])(
    "reads nothing at column 0 that is not a date: %s",
    (start) => {
      expect(
        check(
          [
            `${start} open Assets:QaStock ABC STRICT`,
            `${start} commodity QAZZ`,
            `${start} commodity QAZZ`,
            `${start} * "qa"`,
            '  kk: "ab"',
            '  kk: "ab"',
            "",
          ].join("\n"),
        ),
      ).toEqual([]);
    },
  );
});

/**
 * w31/121: three spellings stock 3.2.3 refuses that the engine read clean. Each
 * expected message below starts with what bean-check 3.2.3 prints for the same
 * text, at the same line; stock's "expecting" list depends on where the
 * account stands.
 */
const COLON = "P0012 syntax error, unexpected COLON";
const EOL = "expecting end of file or EOL";
const POSTING_EOL = "expecting end of file or EOL or ATAT or AT";
const colonError = (line: number, expecting: string | null, account: string) =>
  `main.bean:${line} ${COLON}${expecting === null ? "" : `, ${expecting}`}: the account "${account}" ends with a colon`;

describe("an account with a colon after it", () => {
  it.each([
    [
      '2026-09-01 * "x"\n  Assets:Cash:  -1.00 USD\n  Expenses:Food 1.00 USD',
      2,
      POSTING_EOL,
      "Assets:Cash:",
    ],
    [
      '2026-09-01 * "x"\n  ! Assets:Cash:  -1.00 USD\n  Expenses:Food',
      2,
      POSTING_EOL,
      "Assets:Cash:",
    ],
    [
      '2026-09-01 * "x"\n  Assets:Cash  -1.00 USD\n  Expenses:Food:Coffee:',
      3,
      POSTING_EOL,
      "Expenses:Food:Coffee:",
    ],
    [
      '2026-09-01 txn "x"\n  Assets:Cash:\t-1.00 USD ; kept',
      2,
      POSTING_EOL,
      "Assets:Cash:",
    ],
    ["2026-09-01 open Assets:Cash2: USD", 1, EOL, "Assets:Cash2:"],
    ["2026-09-01 open Assets:Cash2:", 1, EOL, "Assets:Cash2:"],
    ["2026/09/01 close Assets:Cash: ; closed", 1, EOL, "Assets:Cash:"],
    ["2026-09-01 close Assets:Cash:;closed", 1, EOL, "Assets:Cash:"],
    [
      "2026-09-01 pad Assets:Cash: Equity:Opening",
      1,
      "expecting ACCOUNT",
      "Assets:Cash:",
    ],
    ["2026-09-01 pad Assets:Cash Equity:Opening:", 1, EOL, "Equity:Opening:"],
    [
      "2026-09-01 balance Assets:Cash:  48.75 USD",
      1,
      "expecting PLUS or MINUS or LPAREN or NUMBER",
      "Assets:Cash:",
    ],
    [
      '2026-09-01 note Assets:Cash: "hi"',
      1,
      "expecting STRING",
      "Assets:Cash:",
    ],
    [
      '2026-09-01 document Assets:Cash:\t"x.pdf"',
      1,
      "expecting STRING",
      "Assets:Cash:",
    ],
    [
      '2026-09-01 custom "budget" Expenses:Food:Coffee: "monthly" 10.00 USD',
      1,
      null,
      "Expenses:Food:Coffee:",
    ],
    [
      '2026-09-01 custom "budget" 10.00 USD TRUE Assets:Cash:',
      1,
      null,
      "Assets:Cash:",
    ],
    [
      '2026-09-01 * "x"\n  ref: Assets:Cash:\n  Assets:Cash  1 USD\n  Equity:O',
      2,
      EOL,
      "Assets:Cash:",
    ],
    [
      '2026-09-01 * "x"\n  Assets:Cash  1 USD\n    ref: Assets:Cash:\n  Equity:O',
      3,
      EOL,
      "Assets:Cash:",
    ],
    [
      "2026-09-01 open Assets:Cash7 USD\n  ref: Assets:Cash:",
      2,
      EOL,
      "Assets:Cash:",
    ],
    // Whatever follows the colon, if it cannot continue the account.
    [
      '2026-09-01 * "x"\n  Assets:Cash:-1.00 USD\n  Expenses:Food',
      2,
      POSTING_EOL,
      "Assets:Cash:",
    ],
    ['2026-09-01 note Assets:Cash:"hi"', 1, "expecting STRING", "Assets:Cash:"],
    ["2026-09-01 open Assets:Café: USD", 1, EOL, "Assets:Café:"],
    [
      "2026-09-01 open Assets:Cash: USD\r\n2026-09-02 close Assets:Cash:\r",
      1,
      EOL,
      "Assets:Cash:",
    ],
  ])("is refused as stock refuses it: %j", (text, line, expecting, account) => {
    expect(check(`${text}\n`)[0]).toBe(colonError(line, expecting, account));
  });

  it("reports the colon's column", () => {
    const [found] = stockSyntaxErrors(
      { "main.bean": "2026-09-01 open Assets:Cash2: USD\n" },
      "main.bean",
    );
    expect(found?.column).toBe(29);
  });

  it("reports one error for a directive, the first, as stock does", () => {
    expect(
      check(
        [
          '2026-09-01 * "x"',
          "  Assets:Cash:  -1.00 USD",
          "  Expenses:Food:Coffee:  1.00 USD",
          "2026-09-02 close Assets:Cash:",
          "",
        ].join("\n"),
      ),
    ).toEqual([
      colonError(2, POSTING_EOL, "Assets:Cash:"),
      colonError(4, EOL, "Assets:Cash:"),
    ]);
  });

  it.each([
    // Stock reads both as accounts.
    "2026-09-01 open Assets:Cash- USD",
    "2026-09-01 open Assets:9Cash USD",
    '2026-09-01 * "x"\n  key: "a:b"\n  Assets:Cash  1.00 USD\n  Equity:O',
    '2026-09-01 * "Assets:Cash:" "pay: me"\n  Assets:Cash  1.00 USD ; Assets:Cash:\n  Equity:O',
    '2026-09-01 note Assets:Cash "Assets:Cash: on\nAssets:Cash: two lines"',
    "2026-09-01 open Assets:Cash ; Assets:Cash:",
    ":Assets:Cash: an org-mode line Beancount skips",
    "* Assets:Cash: a heading",
    // A colon before a name character continues the account, or the engine
    // already refuses what follows it.
    "2026-09-01 open Assets:Cash:Sub",
    "2026-09-01 open Assets:Cash:lower",
    "2026-09-01 open Assets:Cash::Sub",
    '2026-09-01 * "x"\n  Assets:Cash:.5 USD\n  Equity:O',
    // An account where none goes is stock's other error, left to the engine.
    "2026-09-01 event Assets:Cash: x",
    '2026-09-01 * "x"\n  Assets:Cash  1 USD Assets:Cash:\n  Equity:O',
  ])(
    "leaves alone what is not an account with a colon after it: %j",
    (text) => {
      expect(check(`${text}\n`)).toEqual([]);
    },
  );
});

const FLAGLESS = (line: number) =>
  `main.bean:${line} P0012 syntax error, unexpected STRING: a transaction has a flag (* or !) or txn after its date`;

describe("a string where a dated line's flag goes", () => {
  it.each([
    '2026-09-02 "noflag"\n  Assets:Cash  -1.00 USD\n  Expenses:Food:Coffee  1.00 USD',
    '2026-09-02 "payee" "narr" #tag',
    '2026/09/02 "slash"',
    '2026-9-2 "unpadded"',
    '2026-09-02\t"tab"',
    '2026-09-02"no space"',
  ])("is refused as stock refuses it: %j", (text) => {
    expect(check(`${text}\n`)).toEqual([FLAGLESS(1)]);
  });

  it("reports the quote's column", () => {
    const [found] = stockSyntaxErrors(
      { "main.bean": '2026-09-02  "x"\n' },
      "main.bean",
    );
    expect(found?.column).toBe(13);
  });

  it.each([
    '2026-09-01 txn "x"',
    '2026-09-01 * "x"',
    '2026-09-01 ! "x"',
    '2026-09-01 P "x"',
    '2026-09-01 event "a" "b"',
    '2026-09-01 * "first line\n2026-09-02 "inside the narration"\nlast"',
  ])("leaves a flagged or keyworded line alone: %j", (text) => {
    expect(check(`${text}\n`)).toEqual([]);
  });

  // Stock's parser stays quiet after an error until it has read three tokens:
  // a header straight after a failed directive is dropped without a word.
  it("is reported after a failed directive only with a line between them", () => {
    expect(
      check('2026-09-01 open Assets:Cash3:\n2026-09-02 "x"\n2026-09-03 "y"\n'),
    ).toEqual([colonError(1, EOL, "Assets:Cash3:")]);
    expect(check('2026-09-01 open Assets:Cash3:\n\n2026-09-02 "x"\n')).toEqual([
      colonError(1, EOL, "Assets:Cash3:"),
      FLAGLESS(3),
    ]);
    expect(
      check('2026-09-01 open Assets:Stock ABC STRICT\n2026-09-02 "x"\n'),
    ).toEqual([`main.bean:1 ${BOOKING_ERROR}STRICT"`]);
    expect(
      check(
        '2026-09-01 * "x"\n  Assets:Cash  .50 USD\n; note\n2026-09-02 "x"\n',
      ),
    ).toEqual(["main.bean:2 P0012 Invalid token: '.50'", FLAGLESS(4)]);
    expect(
      check('2026-09-01 * "x"\n  Assets:Cash  1 USD\n2026-09-02 "x"\n'),
    ).toEqual([FLAGLESS(3)]);
  });
});

const invalid = (line: number, token: string) =>
  `main.bean:${line} P0012 Invalid token: '${token}'`;

describe("a number with no leading digit", () => {
  it("is refused at each one, with the token stock's lexer reads", () => {
    expect(
      check(
        [
          '2026-09-01 * "x"',
          "  Assets:Cash  -.50 USD @ .5 USD",
          "  Assets:Cash  1 HOOL {.5 USD}",
          "  Assets:Cash  (.5+1) USD",
          "  Assets:Cash  +.25 USD",
          "  Assets:Cash  .5USD",
          "  rate: .5",
          "  Expenses:Food:Coffee",
          "2026-09-02 price EUR .5 USD",
          "2026-09-03 balance Assets:Cash .5 USD",
          "",
        ].join("\n"),
      ),
    ).toEqual([
      invalid(2, ".50"),
      invalid(2, ".5"),
      invalid(3, ".5"),
      invalid(4, ".5+1)"),
      invalid(5, ".25"),
      invalid(6, ".5USD"),
      invalid(7, ".5"),
      invalid(9, ".5"),
      invalid(10, ".5"),
    ]);
  });

  it("reports the dot's column", () => {
    const [found] = stockSyntaxErrors(
      { "main.bean": '2026-09-01 * "x"\n  Expenses:Food  .50 USD\n' },
      "main.bean",
    );
    expect(found?.column).toBe(18);
  });

  it("is reported at every dot withLeadingZeros gives a zero, and nowhere else", () => {
    const text = [
      '2026-09-01 * "Order .5 kg" "ratio .75" #a.5 ^b.5',
      "  Assets:Cash  .5 USD ; was .5",
      "  Assets:Cash  0.50 USD",
      "  Assets:Cash  1. USD",
      "  Assets:Cash  1,000.00 USD",
      '  note: "a .5 b"',
      "  Expenses:Food  -.5 USD",
      "* .5 on a heading Beancount skips",
      "",
    ].join("\n");
    expect(check(text)).toEqual([invalid(2, ".5"), invalid(7, ".5")]);
    // The engine reads the same text with a zero at exactly those two dots.
    const parsed = parseableFiles({ "main.bean": text }, "main.bean");
    expect(parsed["main.bean"]!.split("0.5").length).toBe(
      text.split("0.5").length + 2,
    );
  });
});

describe("what stock drops after a syntax error", () => {
  const body = [
    '  ab: "ab"',
    '  ab: "ab"',
    "  Assets:Cash  10 EUR @ -1.10 USD",
    "  BAD",
    "  Assets:Cash  10 EUR @ -1.10 USD",
    "  Expenses:Food:Coffee  1.00 USD",
  ];
  const NEGATIVE =
    "NEGATIVE_PRICE Negative prices are not allowed: -1.10 USD (see http://furius.ca/beancount/doc/bug-negative-prices for workaround)";

  it.each([
    ["Assets:Cash:  -1.00 USD", colonError(5, POSTING_EOL, "Assets:Cash:")],
    ["Assets:Cash  -.50 USD", invalid(5, ".50")],
  ])(
    "keeps a posting error above the bad line and nothing else from the directive: %s",
    (bad, reported) => {
      const text = ['2026-09-01 * "x"', ...body, ""]
        .join("\n")
        .replace("BAD", bad);
      expect(check(text)).toEqual([`main.bean:4 ${NEGATIVE}`, reported]);
    },
  );

  it("does not count a dropped commodity directive as a duplicate", () => {
    expect(
      check(
        [
          "2026-01-01 commodity ZZZ",
          "2026-02-01 commodity ZZZ",
          "  ref: Assets:Cash:",
          "2026-03-01 commodity ZZZ",
          "",
        ].join("\n"),
      ),
    ).toEqual([
      colonError(3, EOL, "Assets:Cash:"),
      "main.bean:4 DUPLICATE_COMMODITY Duplicate commodity directives for 'ZZZ'",
    ]);
  });

  it("reports an invalid token anywhere, and no syntax error after one", () => {
    expect(
      check(
        '2026-09-01 * "x"\n  Assets:Cash  -.50 USD\n  Expenses:Food:Coffee:  .50 USD\n',
      ),
    ).toEqual([invalid(2, ".50"), invalid(3, ".50")]);
    expect(
      check(
        '2026-09-01 * "x"\n  Assets:Cash:  -.50 USD\n  Expenses:Food:Coffee  .50 USD\n',
      ),
    ).toEqual([
      colonError(2, POSTING_EOL, "Assets:Cash:"),
      invalid(2, ".50"),
      invalid(3, ".50"),
    ]);
  });

  it("reports the colon, not the booking method behind it", () => {
    expect(check("2026-09-01 open Assets:Stock: ABC STRICT\n")).toEqual([
      colonError(1, EOL, "Assets:Stock:"),
    ]);
  });
});

/**
 * w31/148: a line of tags or links after a transaction's first posting, and a
 * `|` between its header's strings. Stock 3.2.3 refuses both on the
 * transaction's line (and does not apply the late tags); rustledger 0.24.0
 * loads them clean and files the transaction under the late tag.
 */
const LATE = (tags: string, links: string) =>
  `TAGS_AFTER_POSTING Tags or links not allowed after first Posting: TagsLinks(tags=${tags}, links=${links})`;
const PIPE = "P0024 Pipe symbol is deprecated.";
const block = (header: string, ...body: string[]) =>
  [header, ...body, ""].join("\n");

describe("a tags or links line after the first posting", () => {
  it("is reported on the transaction's line, once per line", () => {
    expect(
      check(
        [
          "2026-08-30 open Assets:Cash",
          "",
          '2026-08-30 * "tags after posting"',
          "  Assets:Cash  -1.00 USD",
          "  #qa-late",
          "  Expenses:Food:Coffee  1.00 USD",
          "  ^qa-link",
          "",
        ].join("\n"),
      ),
    ).toEqual([
      `main.bean:3 ${LATE("{'qa-late'}", "set()")}`,
      `main.bean:3 ${LATE("set()", "{'qa-link'}")}`,
    ]);
  });

  // Stock prints a set in its hash order, which changes from run to run; the
  // written order is one of the orders it prints.
  it.each([
    ["  #a#b^c ; comment", LATE("{'a', 'b'}", "{'c'}")],
    ["  #t.a-g_/x", LATE("{'t.a-g_/x'}", "set()")],
    ["\t^only-link", LATE("set()", "{'only-link'}")],
    ["  #late #late ^l", LATE("{'late'}", "{'l'}")],
  ])("reads %p as stock's lexer does", (line, reported) => {
    expect(
      check(
        block(
          '2026-08-30 * "x"',
          "  Assets:Cash  -1.00 USD",
          line,
          "  Equity:E",
        ),
      ),
    ).toEqual([`main.bean:1 ${reported}`]);
  });

  it("counts a line below a posting's metadata, and a #-flagged posting", () => {
    expect(
      check(
        block(
          '2026-08-30 * "x"',
          "  Assets:Cash  -1.00 USD",
          '    note: "x"',
          "    #under-meta",
          "  Equity:E",
        ),
      ),
    ).toEqual([`main.bean:1 ${LATE("{'under-meta'}", "set()")}`]);
    expect(
      check(
        block(
          '2026-08-30 * "x"',
          "  # Assets:Cash  -1.00 USD",
          "  #after-flagged",
          "  Equity:E",
        ),
      ),
    ).toEqual([`main.bean:1 ${LATE("{'after-flagged'}", "set()")}`]);
  });

  it("leaves tags before the first posting, on the header and in comments alone", () => {
    expect(
      check(
        block(
          '2026-08-30 * "x" #header ^hl',
          "  #early",
          '  key: "v"',
          "  #early2 ^l1",
          "  Assets:Cash  -1.00 USD",
          "  ; #not-a-tag",
          "  Equity:E",
        ),
      ),
    ).toEqual([]);
  });

  it("does not read a line inside a multi-line narration as tags", () => {
    expect(
      check(
        block(
          '2026-08-30 * "x" "first',
          "  Assets:Cash  -1.00 USD",
          '  #inside"',
          "  Assets:Cash  -1.00 USD",
          "  Equity:E",
        ),
      ),
    ).toEqual([]);
  });

  it("reports nothing from a directive stock drops at a tags line it cannot read", () => {
    expect(
      check(
        block(
          '2026-08-30 * "x"',
          "  Assets:Cash  -1.00 USD @@ -1 EUR",
          "  #late",
          "  #late2 Assets:Cash",
          "  Expenses:Food:Coffee  @@ 1 USD",
        ),
      ),
    ).toEqual([
      // The posting above the bad line was read, and its error stays.
      "main.bean:2 NEGATIVE_PRICE Negative prices are not allowed: -1 EUR (see http://furius.ca/beancount/doc/bug-negative-prices for workaround)",
    ]);
  });
});

describe("a pipe between the header's strings", () => {
  it("is reported on the header's line, at the pipe", () => {
    const [found] = stockSyntaxErrors(
      {
        "main.bean": block(
          '2026-08-30 * "payee" | "narration"',
          "  Assets:Cash  -1.00 USD",
          "  Equity:E",
        ),
      },
      "main.bean",
    );
    expect(found).toMatchObject({
      code: "P0024",
      message: "Pipe symbol is deprecated.",
      line: 1,
      column: 22,
    });
  });

  it.each([
    ['2026-08-30 * | "a" | |', 3],
    ['2026-08-30 txn "x"|"z"', 1],
    ['2026-08-30 ! "x" "y" | "z"', 1],
    ['2026-08-30 * "q\\"|" | "z" #t ^l ; c', 1],
    ['2026/8/30 P "x" | "z"', 1],
    ['2026-08-30 * "x" ; | "z"', 0],
    ['2026-08-30 * "x | y"', 0],
    ['2026-08-30 * "x" "y" #t', 0],
  ])("%s: %d", (header, count) => {
    expect(
      check(block(header, "  Assets:Cash  -1.00 USD", "  Equity:E")),
    ).toEqual(Array<string>(count).fill(`main.bean:1 ${PIPE}`));
  });

  it("is reported on the header's first line when a string spans lines", () => {
    expect(
      check(
        block('2026-08-30 * "multi', 'line" | "b"', "  Assets:Cash  -1.00 USD"),
      ),
    ).toEqual([`main.bean:1 ${PIPE}`]);
  });

  it("honours allow_pipe_separator from its line on, in its own file only", () => {
    const pipe = (date: string) =>
      block(`${date} * "a" | "b"`, "  Assets:Cash  -1.00 USD", "  Equity:E");
    expect(
      check(
        [
          pipe("2026-08-01"),
          'option "allow_pipe_separator" "TRUE"',
          'include "other.bean"',
          pipe("2026-08-02"),
          'option "allow_pipe_separator" "yes"',
          pipe("2026-08-03"),
          'option "allow_pipe_separator" "FALSE"',
          pipe("2026-08-04"),
        ].join("\n"),
        { "other.bean": pipe("2026-08-05") },
      ),
    ).toEqual([
      `main.bean:1 ${PIPE}`,
      `main.bean:17 ${PIPE}`,
      `other.bean:1 ${PIPE}`,
    ]);
  });

  const PIPE_AFTER_TAGS =
    "P0012 syntax error, unexpected PIPE, expecting end of file or EOL or TAG or LINK: a | stands only between the payee and the narration, before any tag or link";

  // A pipe after the tags, or an account in the header, is a syntax error that
  // drops the directive; a pipe before it was already reported.
  it.each([
    ['2026-08-30 * "x" | "z" #tag |', [PIPE, PIPE_AFTER_TAGS]],
    ['2026-08-30 * "x" | "z" Assets:Cash', [PIPE]],
  ])(
    "stops at the header's syntax error, and nothing below it is reported: %s",
    (header, reported) => {
      expect(
        check(
          block(
            header,
            "  Assets:Cash  -1.00 USD",
            "  #late",
            "  Equity:E  @@ 1 USD",
          ),
        ),
      ).toEqual(reported.map((message) => `main.bean:1 ${message}`));
    },
  );

  it("reads a header of many pipes in linear time", () => {
    // A run of pipes that fails to match took exponential time to refuse, and
    // each pipe's line was counted from the header's start.
    const started = Date.now();
    const backtracking = check(
      block(
        `2026-08-30 * "x" #t |${" |".repeat(16)} X`,
        "  Assets:Cash  1 USD",
      ),
    );
    const many = check(
      block(`2026-08-30 * "x"${" |".repeat(20000)}`, "  Assets:Cash  1 USD"),
    );
    expect(Date.now() - started).toBeLessThan(1000);
    expect(backtracking).toEqual([]);
    expect(many).toHaveLength(20000);
  });

  // The engine loads a pipe after the tags clean, and refuses the rest.
  it.each([
    ['2026-08-30 * "x" #tag |', true],
    ['2026-08-30 * "x" ^l #t | ; c', true],
    ['2026-08-30 * "x" #t | |#u', true],
    ['2026-08-30 * "x" #t | "z"', false],
    ['2026-08-30 * "x" #t "z"', false],
  ])(
    "reports a pipe after the tags as stock's syntax error: %s",
    (header, reported) => {
      const found = stockSyntaxErrors(
        {
          "main.bean": block(header, "  Assets:Cash  -1.00 USD", "  Equity:E"),
        },
        "main.bean",
      );
      expect(
        found.map((e) => `${e.line}:${e.column} ${e.code} ${e.message}`),
      ).toEqual(
        reported ? [`1:${header.indexOf("|") + 1} ${PIPE_AFTER_TAGS}`] : [],
      );
    },
  );
});
