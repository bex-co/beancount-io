import {
  startBeancountState,
  tokenizeBeancount,
  type BeancountState,
  type BeancountStream,
} from "../beancount-language";

/**
 * Minimal line stream satisfying the BeancountStream interface so the tests
 * drive the *production* token rules (the same `tokenizeBeancount` the
 * CodeMirror StreamLanguage calls) without the ESM-only @codemirror packages.
 */
class LineStream implements BeancountStream {
  pos = 0;

  constructor(private readonly line: string) {}

  eol(): boolean {
    return this.pos >= this.line.length;
  }

  next(): string | undefined {
    return this.pos < this.line.length ? this.line[this.pos++] : undefined;
  }

  peek(): string | undefined {
    return this.pos < this.line.length ? this.line[this.pos] : undefined;
  }

  match(pattern: RegExp): RegExpMatchArray | null {
    const match = this.line.slice(this.pos).match(pattern);
    if (!match || match.index !== 0) return null;
    this.pos += match[0].length;
    return match;
  }

  eatSpace(): boolean {
    const start = this.pos;
    while (this.pos < this.line.length && /[\s ]/u.test(this.line[this.pos])) {
      this.pos += 1;
    }
    return this.pos > start;
  }
}

type Token = { token: string | null; text: string };

function tokenizeLine(line: string, state: BeancountState): Token[] {
  const stream = new LineStream(line);
  const tokens: Token[] = [];
  while (!stream.eol()) {
    const start = stream.pos;
    const token = tokenizeBeancount(stream, state);
    if (stream.pos === start) {
      throw new Error(
        `tokenizer made no progress on ${JSON.stringify(line)} at ${start}`,
      );
    }
    tokens.push({ token, text: line.slice(start, stream.pos) });
  }
  return tokens;
}

/** Tokenize consecutive lines, threading the string state across them. */
function tokenizeLines(lines: string[]): Token[][] {
  const state = startBeancountState();
  return lines.map((line) => tokenizeLine(line, state));
}

/** Non-whitespace tokens of a single line, as [text, token] pairs. */
function significantTokens(line: string): [string, string][] {
  return tokenizeLine(line, startBeancountState())
    .filter(({ token }) => token !== null)
    .map(({ token, text }) => [text, token as string]);
}

function expectToken(line: string, expected: string): void {
  const first = significantTokens(line)[0];
  if (!first || first[1] !== expected) {
    throw new Error(
      `expected first token of ${JSON.stringify(line)} to be '${expected}', got ${JSON.stringify(
        first,
      )}`,
    );
  }
}

// ── currency vs account (regression: a colon-less account rule ate USD) ──────

test("currency codes get the currency token, not the account token", () => {
  expectToken("USD", "typeName");
  expectToken("EUR", "typeName");
  expectToken("BTC", "typeName");
  expectToken("AAPL", "typeName");
});

test("account paths get the account token", () => {
  expectToken("Assets:Checking:Main", "variableName");
  expectToken("Expenses:Food:Groceries", "variableName");
  expectToken("Liabilities:Credit-Card", "variableName");
});

test("a bare account segment is neither account nor currency", () => {
  const tokens = significantTokens("Assets");
  if (tokens.length !== 0) {
    throw new Error(`expected no tokens for 'Assets', got ${tokens}`);
  }
});

test("non-ASCII account names are supported", () => {
  expectToken("Assets:银行:活期", "variableName");
  expectToken("Ausgaben:Lebensmittel", "variableName");
});

test("a full posting line keeps accounts and currency distinct", () => {
  expect(significantTokens("  Assets:Cash  -5.00 USD")).toEqual([
    ["Assets:Cash", "variableName"],
    ["-5.00", "number"],
    ["USD", "typeName"],
  ]);
});

// ── basics ────────────────────────────────────────────────────────────────────

test("dates, flags, and directives", () => {
  expectToken("2026-01-15 txn", "number");
  expectToken("txn", "keyword");
  expectToken("open Assets:Cash", "keyword");
  expectToken("*", "atom");
  expectToken('! "pending"', "atom");
});

test("partial dates are not dates", () => {
  const tokens = significantTokens("2026-01 balance");
  if (tokens[0]?.[1] === "number" && tokens[0][0].length === 10) {
    throw new Error("partial date should not tokenize as a full date");
  }
});

test("comments, tags, and links", () => {
  expectToken("; a note", "comment");
  expectToken("#vacation-2026", "tagName");
  expectToken("^trip-ref", "labelName");
});

test("amounts with separators and signs", () => {
  expectToken("1,234.56", "number");
  expectToken("-100.00", "number");
});

// ── strings ───────────────────────────────────────────────────────────────────

test("an escaped quote does not close the string", () => {
  expect(significantTokens('"say \\"hi\\" ok" 10 USD')).toEqual([
    ['"say \\"hi\\" ok"', "string"],
    ["10", "number"],
    ["USD", "typeName"],
  ]);
});

test("a string left open continues on the next line without corrupting it", () => {
  const lines = tokenizeLines([
    '2026-01-15 * "payee" "narration with',
    'a continued string" #tag',
    "2026-01-16 open Assets:Cash",
  ]);

  const line1 = lines[0].filter((t) => t.token !== null);
  expect(line1.map((t) => [t.text, t.token])).toEqual([
    ["2026-01-15", "number"],
    ["*", "atom"],
    ['"payee"', "string"],
    ['"narration with', "string"],
  ]);

  // The continuation line is string content up to the closing quote, then
  // normal tokenization resumes.
  const line2 = lines[1].filter((t) => t.token !== null);
  expect(line2.map((t) => [t.text, t.token])).toEqual([
    ['a continued string"', "string"],
    ["#tag", "tagName"],
  ]);

  // The string state must not leak past the closing quote.
  const line3 = lines[2].filter((t) => t.token !== null);
  expect(line3.map((t) => [t.text, t.token])).toEqual([
    ["2026-01-16", "number"],
    ["open", "keyword"],
    ["Assets:Cash", "variableName"],
  ]);
});

test("a transaction line highlights every supported construct", () => {
  expect(
    significantTokens('2026-08-01 * "Coffee Shop" "Latte" #food ^receipt-42'),
  ).toEqual([
    ["2026-08-01", "number"],
    ["*", "atom"],
    ['"Coffee Shop"', "string"],
    ['"Latte"', "string"],
    ["#food", "tagName"],
    ["^receipt-42", "labelName"],
  ]);
});
