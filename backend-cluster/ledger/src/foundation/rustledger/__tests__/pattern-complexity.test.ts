import { MAX_PATTERN_LENGTH, patternRefusal } from "../pattern-complexity";

/** The refusal for `source` compiled case-insensitively, as filters are. */
const refusal = (source: string, flags = "i") => {
  new RegExp(source, flags); // every caller checks a pattern that compiled
  return patternRefusal(source, flags);
};

const ONE_TEXT_TWO_WAYS =
  /^too complex: a repeated part can match the same text in more than one way/;
const REPEATS_IN_A_ROW = /^too complex: more than 2 repeats in a row/;
const MANY_WAYS =
  /^too complex: it can match the same text in more than 64 ways$/;

describe("patternRefusal", () => {
  it.each([
    "Assets:Cash",
    "^Expenses:(Food|Rent)",
    "Assets:Cash(App)?$",
    "Assets:.*",
    "VT.*",
    "Expenses:.*Food.*",
    "Assets:.*:.*",
    "Assets:US:(BofA|Chase):(Checking|Savings)",
    "^(?!Expenses).*$",
    "(?<account>Checking)",
    "\\d{4}-\\d{2}-\\d{2}",
    "(\\d{4}-)+",
    "(\\d{1,2}-)+",
    "(a{2})+",
    "(\\s+\\w+)+",
    "(Food:?)+",
    "(ab|cd)*",
    "(a|ab)*",
    ".{0,100}Z",
    "^([^:]+):([^:]+)$",
    "\\w+@\\w+\\.com",
  ])("accepts %s", (source) => {
    expect(refusal(source)).toBeUndefined();
  });

  it("accepts the patterns the search boxes build", () => {
    // Mobile: words joined by `\s+`, accented letters in both spellings, a
    // tag member, an exact payee among its spellings.
    const words = Array.from({ length: 20 }, (_, i) => `word${i}`).join("\\s+");
    expect(refusal(words)).toBeUndefined();
    expect(refusal("caf(?:é|é)\\s+cr(?:è|è)me")).toBeUndefined();
    expect(refusal("Trader\\s+Joe['‘’]s")).toBeUndefined();
    expect(refusal("(?:^|, )japan")).toBeUndefined();
    expect(
      refusal("^\\s*(?:Amazon|AMZN Mktp US|Amazon Prime|Amazon\\.com)\\s*$"),
    ).toBeUndefined();
  });

  it.each([
    "(A+)+B",
    "Assets:(A+)+B",
    "(a*)*",
    "(.*)*",
    "(.+)+Z",
    "(\\w+\\s?)+",
    "([a-z]+:?)+Z",
    "(a*b?)*c",
    "(a{1,3})+$",
    "(x+x+)+y",
  ])("refuses the nested repeat %s", (source) => {
    expect(refusal(source)).toMatch(ONE_TEXT_TWO_WAYS);
  });

  it.each(["(.|.)*Z", "(a|a)*", "(a|aa)*$", "^(a|a?)+$", "(\\d|\\w)+!"])(
    "refuses the repeated overlapping alternatives %s",
    (source) => {
      expect(refusal(source)).toMatch(ONE_TEXT_TWO_WAYS);
    },
  );

  it("reads letters in both cases when the match ignores case", () => {
    expect(refusal("([A-Z][a-z]+)+$", "i")).toMatch(ONE_TEXT_TWO_WAYS);
    expect(refusal("([A-Z][a-z]+)+$", "")).toBeUndefined();
  });

  it.each([".*.*.*Z", "\\w*\\w*\\w*Z", ".*a.*b.*c"])(
    "refuses more than two overlapping repeats in a row: %s",
    (source) => {
      expect(refusal(source)).toMatch(REPEATS_IN_A_ROW);
    },
  );

  it.each([
    "(.|.){32}",
    "(?:[a-z]|[a-z]){1,32}x",
    "a?".repeat(10) + "a".repeat(10),
    "(a|a)".repeat(8),
    "(?:|)".repeat(10) + "x",
  ])("refuses a pattern with many ways to read one text: %s", (source) => {
    expect(refusal(source)).toMatch(MANY_WAYS);
  });

  it("judges a lookaround's body as a pattern of its own", () => {
    expect(refusal("(?=(a+)+)b")).toMatch(ONE_TEXT_TWO_WAYS);
    expect(refusal("(?<=x(a+)+)b")).toMatch(ONE_TEXT_TWO_WAYS);
    expect(refusal("(?=Assets:)\\w+")).toBeUndefined();
  });

  it("reads a backreference as any text", () => {
    expect(refusal("(a)(?:\\1)+$")).toMatch(ONE_TEXT_TWO_WAYS);
    expect(refusal("(\\w)\\1")).toBeUndefined();
  });

  it("refuses a pattern longer than the limit, naming it", () => {
    expect(refusal("a".repeat(MAX_PATTERN_LENGTH))).toBeUndefined();
    expect(refusal("a".repeat(MAX_PATTERN_LENGTH + 1))).toBe(
      `longer than ${MAX_PATTERN_LENGTH} characters`,
    );
  });

  it("refuses a pattern it cannot judge within its budget, quickly", () => {
    const source = "(?:(?:(?:(?:(?:$){32}){32}){32}){32}){32}";
    const started = Date.now();
    expect(refusal(source)).toBe("too complex to check");
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("reads web-compatibility syntax without failing", () => {
    for (const source of [
      "a{",
      "}",
      "]",
      "\\8",
      "\\c",
      "[\\d-z]",
      "[]",
      "[^]",
    ]) {
      expect(refusal(source)).toBeUndefined();
    }
  });
});
