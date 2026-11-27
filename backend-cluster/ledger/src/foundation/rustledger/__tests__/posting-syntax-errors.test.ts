import { postingSyntaxErrors } from "../posting-syntax-errors";
import { stockSyntaxErrors } from "../stock-syntax-errors";

/**
 * w31/120: a negative price, a merge cost and a repeated cost component are
 * refused by stock beancount 3.2.3's parser and loaded clean by rustledger
 * 0.24.0. Every expected message and line below is what stock's `bean-check`
 * prints for the same text: the error sits on the posting's own line.
 */
const check = (main: string, other?: Record<string, string>) =>
  stockSyntaxErrors({ "main.bean": main, ...other }, "main.bean").map(
    (e) => `${e.file}:${e.line} ${e.code} ${e.message}`,
  );

const posting = (line: string) =>
  postingSyntaxErrors(line).map(({ message }) => message);

const NEGATIVE = (amount: string) =>
  `Negative prices are not allowed: ${amount} (see http://furius.ca/beancount/doc/bug-negative-prices for workaround)`;
const MISSING = "<class 'beancount.core.number.MISSING'>";

describe("a negative price", () => {
  it("is reported on the posting's line, and the entry is no longer clean", () => {
    expect(
      check(
        [
          "2026-09-01 open Assets:Wallet",
          '2026-09-01 * "qa" "negative price"',
          "  Assets:Wallet  10 EUR @ -1.10 USD",
          "  Assets:Bank:Checking  11.00 USD",
          "",
        ].join("\n"),
      ),
    ).toEqual([`main.bean:3 NEGATIVE_PRICE ${NEGATIVE("-1.10 USD")}`]);
  });

  it.each([
    ["10 EUR @ -1.10 USD", "-1.10 USD"],
    ["10 EUR @@ -11.00 USD", "-11.00 USD"],
    ["10 EUR @ (1-2.1) USD", "-1.1 USD"],
    ["10 HOOL {5 USD} @ -5 USD", "-5 USD"],
    ["10 EUR @ - 1.10 USD", "-1.10 USD"],
    ["10 EUR @ -1,000.00 USD  ; a comment", "-1000.00 USD"],
    ["10 EUR @ 2 * -0.50 USD", "-1.00 USD"],
    ["10 EUR @ -1/3 USD", "-0.3333333333333333333333333333 USD"],
    ["10 EUR @ -10.00/4 USD", "-2.50 USD"],
    ["10 EUR @ -10/0.5 USD", "-20 USD"],
    ["10 EUR @ -0.0000001 USD", "-0.0000001 USD"],
    ["10 EUR @ +-1 USD", "-1 USD"],
    ["10 EUR @ 1-2 USD", "-1 USD"],
  ])("%s prints the price as stock does: %s", (amount, printed) => {
    expect(posting(`  Assets:Wallet  ${amount}`)).toEqual([NEGATIVE(printed)]);
  });

  it.each([
    "10 EUR @ 1.10 USD",
    "10 EUR @ 0 USD",
    "10 EUR @ -0 USD",
    "10 EUR @ -0.00 USD",
    "10 EUR @@ -0 USD",
    "10 EUR @ --1 USD",
    "10 EUR @ -1 * -1 USD",
    "-10 EUR @ 1.10 USD",
    "10 EUR ; @ -1.10 USD in a comment",
  ])("accepts %s, as stock does", (amount) => {
    expect(posting(`  Assets:Wallet  ${amount}`)).toEqual([]);
  });

  it("reads a flagged posting, and leaves key lines and price directives alone", () => {
    expect(
      check(
        [
          "2026-09-01 price EUR -1.10 USD",
          '2026-09-01 * "x"',
          '  k1: "a @ -1 USD"',
          "  ! Assets:Wallet  10 EUR @ -1.10 USD",
          '    note: "@ -2 USD"',
          "  Assets:Bank",
          "",
        ].join("\n"),
      ),
    ).toEqual([`main.bean:4 NEGATIVE_PRICE ${NEGATIVE("-1.10 USD")}`]);
  });

  it("does not read a line inside a multi-line narration as a posting", () => {
    expect(
      check(
        [
          '2026-09-01 * "first line',
          "  Assets:Wallet  10 EUR @ -1.10 USD",
          'last line"',
          "  Assets:Wallet  10 EUR",
          "  Assets:Bank",
          "",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("reads a slash-dated transaction too", () => {
    expect(
      check(
        '2026/9/1 * "x"\n  Assets:Wallet  10 EUR @ -1 USD\n  Assets:Bank\n',
      ),
    ).toEqual([`main.bean:2 NEGATIVE_PRICE ${NEGATIVE("-1 USD")}`]);
  });
});

describe("a merge cost", () => {
  it("is reported on the reducing posting's line, with two lots held", () => {
    expect(
      check(
        [
          "2026-09-01 open Assets:Broker",
          '2026-09-01 * "buy"',
          "  Assets:Broker  10 HOOL {5 USD, 2026-01-01}",
          "  Assets:Bank:Checking  -50.00 USD",
          '2026-09-01 * "buy2"',
          "  Assets:Broker  10 HOOL {7 USD, 2026-01-02}",
          "  Assets:Bank:Checking  -70.00 USD",
          '2026-09-02 * "sell"',
          "  Assets:Broker  -5 HOOL {*}",
          "  Assets:Bank:Checking  30.00 USD",
          "",
        ].join("\n"),
      ),
    ).toEqual(["main.bean:9 COST_MERGE Cost merging is not supported yet"]);
  });

  it.each([
    ["10 HOOL {*}", ["Cost merging is not supported yet"]],
    ["10 HOOL {5 USD, *}", ["Cost merging is not supported yet"]],
    ["10 HOOL {*, 5 USD}", ["Cost merging is not supported yet"]],
    [
      "10 HOOL {5 USD, *, *}",
      ["Cost merging is not supported yet", "Duplicate merge-cost spec"],
    ],
  ])("%s", (amount, messages) => {
    expect(posting(`  Assets:Broker  ${amount}`)).toEqual(messages);
  });

  it("is not an asterisk that multiplies a cost", () => {
    expect(posting("  Assets:Broker  10 HOOL {2 * 3 USD}")).toEqual([]);
  });
});

describe("a second amount, date or label in one cost spec", () => {
  it("is reported on the posting's line", () => {
    expect(
      check(
        [
          '2026-09-01 * "buy"',
          "  Assets:Broker  10 HOOL {5 USD, 2026-01-01, 2026-01-05}",
          '  Assets:Broker  10 HOOL {5 USD, "a", "b"}',
          "  Assets:Broker  10 HOOL {5 USD, 6 USD}",
          "  Assets:Bank:Checking",
          "",
        ].join("\n"),
      ),
    ).toEqual([
      "main.bean:2 DUPLICATE_COST_COMPONENT Duplicate date: '2026-01-05'.",
      "main.bean:3 DUPLICATE_COST_COMPONENT Duplicate label: 'b'.",
      "main.bean:4 DUPLICATE_COST_COMPONENT Duplicate cost: 'CompoundAmount(number_per=Decimal('6'), number_total=None, currency='USD')'.",
    ]);
  });

  it.each([
    ["{5 USD, 2026-01-01, 2026-01-01}", "Duplicate date: '2026-01-01'."],
    ["{5 USD, 2026/1/5, 2026-01-06}", "Duplicate date: '2026-01-06'."],
    ["{5 USD, 2026-01-05, 2026/1/6}", "Duplicate date: '2026-01-06'."],
    ['{5 USD, "a", "a"}', "Duplicate label: 'a'."],
    ['{5 USD, "", ""}', "Duplicate label: ''."],
    ['{5 USD, "a\\"x", "b\\"y"}', `Duplicate label: 'b"y'.`],
    ['{ 5 USD , "x" , "y" }', "Duplicate label: 'y'."],
    [
      "{5 USD, # 1 USD}",
      `Duplicate cost: 'CompoundAmount(number_per=${MISSING}, number_total=Decimal('1'), currency='USD')'.`,
    ],
    [
      "{5 USD, 2 # 1 USD}",
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('2'), number_total=Decimal('1'), currency='USD')'.",
    ],
    [
      "{5 USD, 5 # USD}",
      `Duplicate cost: 'CompoundAmount(number_per=Decimal('5'), number_total=${MISSING}, currency='USD')'.`,
    ],
    [
      "{5 USD, 7}",
      `Duplicate cost: 'CompoundAmount(number_per=Decimal('7'), number_total=None, currency=${MISSING})'.`,
    ],
    [
      "{5 USD, EUR}",
      `Duplicate cost: 'CompoundAmount(number_per=${MISSING}, number_total=None, currency='EUR')'.`,
    ],
    [
      "{5 USD,6 USD}",
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('6'), number_total=None, currency='USD')'.",
    ],
    [
      "{{50 USD, 60 USD}}",
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('60'), number_total=None, currency='USD')'.",
    ],
    [
      "{5 USD, (1+2.50) USD}",
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('3.50'), number_total=None, currency='USD')'.",
    ],
    [
      "{5 USD, 1,000.00 USD}",
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('1000.00'), number_total=None, currency='USD')'.",
    ],
    [
      "{5 USD, -(0) USD}",
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('0'), number_total=None, currency='USD')'.",
    ],
    [
      "{5 USD, 7 / 2 USD}",
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('3.5'), number_total=None, currency='USD')'.",
    ],
    [
      "{5 USD, 100 / 10 USD}",
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('10'), number_total=None, currency='USD')'.",
    ],
    [
      "{5 USD, 0.00 / 3 USD}",
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('0.00'), number_total=None, currency='USD')'.",
    ],
    [
      "{5 USD, 1 / 7 USD}",
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('0.1428571428571428571428571429'), number_total=None, currency='USD')'.",
    ],
    [
      "{5 USD, 0.0000001 USD}",
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('1E-7'), number_total=None, currency='USD')'.",
    ],
    [
      "{5 USD, 99999999999999999999999999999 USD}",
      // A literal is exact; only an operation rounds to 28 digits.
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('99999999999999999999999999999'), number_total=None, currency='USD')'.",
    ],
  ])("%s: %s", (spec, message) => {
    expect(posting(`  Assets:Broker  10 HOOL ${spec}`)).toEqual([message]);
  });

  it("reports each repeat, and a price after the cost too", () => {
    expect(
      posting("  Assets:Broker  10 HOOL {5 USD, 6 USD, 7 USD} @ -1 USD"),
    ).toEqual([
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('6'), number_total=None, currency='USD')'.",
      "Duplicate cost: 'CompoundAmount(number_per=Decimal('7'), number_total=None, currency='USD')'.",
      NEGATIVE("-1 USD"),
    ]);
  });

  it.each([
    '{5 USD, 2026-01-01, "lot1"}',
    "{5 # 1 USD}",
    "{}",
    '{5 USD, "a, b", 2026-01-01}',
    "{{50 USD, 2026-01-01}}",
  ])("accepts %s, as stock does", (spec) => {
    expect(posting(`  Assets:Broker  10 HOOL ${spec}`)).toEqual([]);
  });

  // Stock refuses each as a syntax error before it reads the cost spec's
  // components, and so does the engine; the rule abstains.
  it.each([
    "{5 USD, 6 USD",
    "{5 USD,, 6 USD}",
    "{5 USD, #1 USD, 6 USD}",
    "{5 USD, 6 TRUE}",
    "{5 USD, 2026-02-30, 2026-01-01}",
    '{5 USD, "a',
    "{5 USD, 6 USD} {7 USD, 8 USD}",
    "@ -1.10 USD {5 USD, 6 USD}",
    "{5 USD, 6 V}",
  ])("abstains on a line stock cannot read: %s", (spec) => {
    expect(posting(`  Assets:Broker  10 HOOL ${spec}`)).toEqual([]);
  });
});
