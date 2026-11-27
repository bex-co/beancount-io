import {
  assertAmountsFitEngineDecimal,
  fitsEngineDecimal,
  formatEngineDecimalPreview,
  textAmountLiterals,
} from "../engine-decimal";
import { BadUserInputError } from "@/shared/errors";

describe("fitsEngineDecimal", () => {
  it.each([
    "1234567890123456789012345678",
    "-1234567890123456789012345678",
    "+1234567890123456789012345678",
    "00000000000000000000000000001.23",
    "0.0000000000000000000000000001",
    "1,234,567.89",
  ])("accepts %s", (literal) => {
    expect(fitsEngineDecimal(literal)).toBe(true);
  });

  it.each([
    "10000000000000000000000000000",
    "1.0000000000000000000000000001",
    "0.00000000000000000000000000001",
    "9999999999999999999999999999999999",
  ])("refuses %s", (literal) => {
    expect(fitsEngineDecimal(literal)).toBe(false);
  });

  it("truncates previews longer than 64 characters", () => {
    expect(formatEngineDecimalPreview("9".repeat(64))).toBe("9".repeat(64));
    expect(formatEngineDecimalPreview("9".repeat(65))).toBe(
      `${"9".repeat(64)}…`,
    );
  });
});

/** w23/081: the 28-significant-digit rule for amounts in raw Beancount text. */
describe("textAmountLiterals", () => {
  it("finds posting amounts, prices and balance assertions", () => {
    expect(
      textAmountLiterals(
        [
          '2021-01-02 * "raw"',
          "  Assets:Cash  999999999999999999999999999.99 USD",
          "  Equity:Initial",
          "2021-01-03 balance Assets:Cash 10.00 USD",
          "2021-01-04 price USD 1.50 EUR",
          "  Assets:Broker 10 HOOL @ 150.25 USD",
        ].join("\n"),
      ),
    ).toEqual([
      "999999999999999999999999999.99",
      "10.00",
      "1.50",
      "10",
      "150.25",
    ]);
  });

  it("ignores long digit strings outside amounts", () => {
    expect(
      textAmountLiterals(
        '2021-01-02 * "Invoice 99999999999999999999999999999999" "ref 99999999999999999999999999999999 USD"',
      ),
    ).toEqual([]);
    expect(
      textAmountLiterals(
        [
          '2021-01-02 * "x"',
          "  Assets:Cash 10 USD",
          '  statement: "no 99999999999999999999999999999999"',
          "; a comment holding 99999999999999999999999999999999 USD",
        ].join("\n"),
      ),
    ).toEqual(["10"]);
  });

  it("does not read account names, dates or tags as numbers", () => {
    expect(
      textAmountLiterals(
        [
          "2026-10-25 * #tag",
          "  Assets:Vault123456789012345678901234567890 10 USD",
          "  Equity:Initial",
        ].join("\n"),
      ),
    ).toEqual(["10"]);
  });
});

describe("assertAmountsFitEngineDecimal", () => {
  it.each([
    ["29 digits with cents", "999999999999999999999999999.99"],
    ["30 digits with cents", "9999999999999999999999999999.99"],
  ])("refuses the note's %s literal", (_name, literal) => {
    const text = [
      '2021-01-02 * "raw"',
      `  Assets:Cash  ${literal} USD`,
      "  Equity:Initial",
    ].join("\n");
    expect(() => assertAmountsFitEngineDecimal(text)).toThrow(
      BadUserInputError,
    );
    expect(() => assertAmountsFitEngineDecimal(text)).toThrow(
      new RegExp(
        `amount ${literal.replace(/\./g, "\\.")} has more than 28 significant digits`,
      ),
    );
  });

  it.each([
    ["28 significant digits", "99999999999999999999999999.99"],
    ["an ordinary amount", "10.00"],
    ["a comma-grouped amount", "1,234,567.89"],
    ["a negative amount", "-10 USD"],
  ])("accepts %s", (_name, literal) => {
    const amount = literal.endsWith("USD") ? literal : `${literal} USD`;
    expect(() =>
      assertAmountsFitEngineDecimal(
        `2021-01-02 * "x"\n  Assets:Cash  ${amount}\n  Equity:Initial\n`,
      ),
    ).not.toThrow();
  });

  it("accepts long digit strings in narrations, meta and comments", () => {
    expect(() =>
      assertAmountsFitEngineDecimal(
        [
          '2021-01-02 * "Invoice 99999999999999999999999999999999"',
          "  Assets:Cash 10 USD",
          '  ref: "99999999999999999999999999999999 USD"',
          "; 99999999999999999999999999999999 USD",
          "  Equity:Initial",
        ].join("\n"),
      ),
    ).not.toThrow();
  });

  it("skips binary callers rather than reading bytes as amounts", () => {
    expect(() =>
      assertAmountsFitEngineDecimal(
        "binary\0 99999999999999999999999999999 USD",
      ),
    ).not.toThrow();
  });

  /**
   * w31/095: expressions, balance tolerances, compound costs, metadata/custom
   * numbers, and stateful string/comment/org-heading scanning.
   */
  it.each([
    [
      "parenthesized arithmetic expression",
      '2026-08-01 * "Cafe" "expr"\n  Expenses:Food:Groceries   (1.0000000000000000000000000001 + 0) USD\n  Assets:Bank:Checking\n',
      "1.0000000000000000000000000001",
    ],
    [
      "unparenthesized multiplication expression",
      '2026-08-01 * "Cafe" "mul"\n  Expenses:Food:Groceries   1.0000000000000000000000000001 * 2 USD\n  Assets:Bank:Checking\n',
      "1.0000000000000000000000000001",
    ],
    [
      "balance assertion with tolerance",
      "2026-01-02 balance Assets:Cash 200.00000000000000000000000001 ~ 0.01 USD\n",
      "200.00000000000000000000000001",
    ],
    [
      "balance assertion tolerance operand",
      "2026-01-02 balance Assets:Cash 200.00 ~ 0.00000000000000000000000000001 USD\n",
      "0.00000000000000000000000000001",
    ],
    [
      "compound lot cost per-unit leg",
      '2026-08-01 * "Buy" "lot"\n  Assets:Bank:Savings 10.00 USD {1.0000000000000000000000000001 # 0 USD}\n  Assets:Bank:Checking\n',
      "1.0000000000000000000000000001",
    ],
    [
      "compound lot cost total leg without space after #",
      '2026-08-01 * "Buy" "lot"\n  Assets:Bank:Savings 10.00 USD {0 #1.0000000000000000000000000001 USD}\n  Assets:Bank:Checking\n',
      "1.0000000000000000000000000001",
    ],
    [
      "currency-less lot cost with date",
      '2026-08-01 * "Buy" "lot"\n  Assets:Bank:Savings 10.00 USD {1.0000000000000000000000000001, 2026-08-01}\n  Assets:Bank:Checking\n',
      "1.0000000000000000000000000001",
    ],
    [
      "total cost double braces",
      '2026-08-01 * "Buy" "lot"\n  Assets:Bank:Savings 10.00 USD {{1.0000000000000000000000000001 USD}}\n  Assets:Bank:Checking\n',
      "1.0000000000000000000000000001",
    ],
    [
      "bare numeric metadata value",
      '2026-08-01 * "Cafe"\n  ratio: 1.0000000000000000000000000001\n  Expenses:Food 10 USD\n  Assets:Cash\n',
      "1.0000000000000000000000000001",
    ],
    [
      "custom directive bare numeric value",
      '2026-08-01 custom "metric" 1.0000000000000000000000000001\n',
      "1.0000000000000000000000000001",
    ],
    [
      "amount after string ending with escaped backslash",
      '2026-08-01 custom "path" "C:\\\\" 1.0000000000000000000000000001 USD\n',
      "1.0000000000000000000000000001",
    ],
    [
      "amount after closing quote of multiline string",
      '2026-08-01 custom "note" "line 1\nline 2" 1.0000000000000000000000000001 USD\n',
      "1.0000000000000000000000000001",
    ],
  ])("refuses %s", (_name, text, literal) => {
    expect(() => assertAmountsFitEngineDecimal(text)).toThrow(
      BadUserInputError,
    );
    expect(() => assertAmountsFitEngineDecimal(text)).toThrow(
      new RegExp(
        `amount ${literal.replace(/\./g, "\\.")} has more than 28 significant digits`,
      ),
    );
  });

  it.each([
    [
      "escaped quote in narration",
      '2026-08-01 * "Cafe" "ref \\" 123456789012345678901234567890 USD"\n  Expenses:Food:Groceries 10.00 USD\n  Assets:Bank:Checking\n',
    ],
    [
      "multiline string containing long number and currency",
      '2026-08-01 * "Cafe" "line1\n123456789012345678901234567890 USD"\n  Expenses:Food:Groceries 10.00 USD\n  Assets:Bank:Checking\n',
    ],
    [
      "multiline string with column-0 star line",
      '2026-08-01 * "Cafe" "line1\n* 123456789012345678901234567890 USD\nstill string 123456789012345678901234567890 USD"\n  Expenses:Food:Groceries 10.00 USD\n  Assets:Bank:Checking\n',
    ],
    [
      "org-mode heading at column 0",
      '* Ref 123456789012345678901234567890 USD\n** Sub 123456789012345678901234567890 USD\n2026-08-01 * "Cafe"\n  Expenses:Food 10.00 USD\n  Assets:Cash\n',
    ],
    [
      "numeric account component, tag, link, metadata key, and slash date",
      [
        "2026/01/01 open Assets:123456789012345678901234567890 USD",
        '2026/08/01 * "Cafe" #123456789012345678901234567890 ^123456789012345678901234567890',
        '  ref123456789012345678901234567890: "USD"',
        "  Assets:123456789012345678901234567890 10.00 USD",
        "  Equity:Initial",
      ].join("\n"),
    ],
    [
      "28-digit boundary in expression, balance tolerance, and compound cost",
      [
        "2026-01-02 balance Assets:Cash 200.0000000000000000000000001 ~ 0.01 USD",
        '2026-08-01 * "Boundary"',
        "  Expenses:Food (1.000000000000000000000000001 + 0) USD",
        "  Assets:Stock 10.00 USD {1.000000000000000000000000001 # 0 USD}",
        "  Assets:Cash",
      ].join("\n"),
    ],
  ])("accepts %s", (_name, text) => {
    expect(() => assertAmountsFitEngineDecimal(text)).not.toThrow();
  });

  // w31/099: Beancount skips a whole line starting with any of `*#:!&?%`, and
  // a `"` on it opens no string.
  it.each(
    ["*", "#", ":", "!", "&", "?", "%"].flatMap((start) => [
      [start, "without a quote", ""],
      [start, "with an unmatched quote", ' 5"'],
    ]),
  )(
    "skips a %s line %s, and still checks the amounts after it",
    (start, _case, quote) => {
      const skipped = `${start} ref 123456789012345678901234567890 USD${quote}`;
      expect(() =>
        assertAmountsFitEngineDecimal(
          `${skipped}\n2026-08-01 * "Cafe"\n  Expenses:Food 10.00 USD\n  Assets:Cash\n`,
        ),
      ).not.toThrow();
      expect(() =>
        assertAmountsFitEngineDecimal(
          `${skipped}\n2026-08-01 * "Cafe"\n  Expenses:Food 123456789012345678901234567890 USD\n  Assets:Cash\n`,
        ),
      ).toThrow(BadUserInputError);
    },
  );

  it.each(["*", "#", ":", "!", "&", "?", "%"])(
    "reads a %s line inside a multiline string as the string's content (w31/099)",
    (start) => {
      const text = [
        '2026-08-01 * "Cafe" "line1',
        `${start} 123456789012345678901234567890 USD"`,
        "  Expenses:Food 123456789012345678901234567890 USD",
        "  Assets:Cash",
      ].join("\n");
      expect(textAmountLiterals(text)).toEqual([
        "123456789012345678901234567890",
      ]);
    },
  );

  it("tracks multiline string state from line 0 when checking only changed lines", () => {
    const file = [
      '2026-08-01 * "Cafe" "line 1',
      "123456789012345678901234567890 USD",
      'line 3"',
      "  Assets:Legacy 999999999999999999999999999.99 USD",
      "  Assets:Edited 10.00 USD",
    ].join("\n");
    expect(() =>
      assertAmountsFitEngineDecimal(file, new Set([1, 4])),
    ).not.toThrow();
    expect(() => assertAmountsFitEngineDecimal(file, new Set([3]))).toThrow(
      BadUserInputError,
    );
  });
});
