import {
  beancountIndent,
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
  expectToken("pushtag #travel", "keyword");
  expectToken("poptag #travel", "keyword");
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

// w21/338: Enter copied the current line's indentation, so a new date typed
// after a posting was indented ("unexpected INDENT"), and the first posting
// after a header started at column 0.
describe("beancountIndent", () => {
  const HEADER = '2026-10-20 * "Coffee"';
  const POSTING = "  Expenses:Food  4.50 USD";

  it("indents the first posting under a header", () => {
    expect(beancountIndent(HEADER, "", 2)).toBe(2);
    for (const flag of ["*", "!", "P", "txn", "?", "&", "#", "%"]) {
      expect(beancountIndent(`2026-10-20 ${flag} "Coffee"`, "", 2)).toBe(2);
    }
  });

  // w21/688: Enter after a one-line directive indented the next directive.
  it("starts the line after a one-line directive at column 0", () => {
    const lines = [
      "2026-10-01 price BTC 60000.00 USD",
      "2026-10-20 open Assets:Cash",
      "2026-10-20 close Assets:Cash",
      "2026-10-20 balance Assets:Cash 1.00 USD",
      "2026-10-20 pad Assets:Cash Equity:Opening",
      '2026-10-20 note Assets:Cash "called the bank"',
      '2026-10-20 event "location" "Paris"',
      "2026-10-20 commodity BTC",
      '2026-10-20 document Assets:Cash "receipt.pdf"',
      '2026-10-20 custom "budget" Expenses:Food "monthly" 300 USD',
    ];
    for (const line of lines) {
      expect(beancountIndent(line, "", 2)).toBe(0);
    }
  });

  it("keeps postings and metadata at the posting indent", () => {
    expect(beancountIndent(POSTING, "", 2)).toBe(2);
    expect(beancountIndent('    invoice: "INV-1"', "", 2)).toBe(2);
  });

  it("starts the line after a blank one at column 0", () => {
    // Enter twice after a posting: the second Enter sees an empty line above.
    expect(beancountIndent("", "", 2)).toBe(0);
    expect(beancountIndent("   ", "", 2)).toBe(0);
    expect(beancountIndent(null, "", 2)).toBe(0);
  });

  it("puts a date at column 0 wherever it is typed", () => {
    expect(beancountIndent(POSTING, '2026-10-21 * "Lunch"', 2)).toBe(0);
    expect(
      beancountIndent(HEADER, "2026-10-21 balance Assets:Cash 1 USD", 2),
    ).toBe(0);
  });

  it("leaves other top-level lines to the default", () => {
    expect(beancountIndent('option "title" "x"', "", 2)).toBe(null);
    expect(beancountIndent("; a comment", "", 2)).toBe(null);
    expect(beancountIndent('include "a.bean"', "", 2)).toBe(null);
  });

  it("gives the note's sequence an unindented date line", () => {
    // Doc: header, posting, posting. Enter → "  "; Enter again → blank line.
    const afterPosting = beancountIndent("  Assets:Cash", "", 2);
    expect(afterPosting).toBe(2);
    const afterBlank = beancountIndent("", "", 2);
    expect(afterBlank).toBe(0);
  });
});

describe("the editor uses it", () => {
  it("wires the rule into the Beancount language", () => {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const editor = fs
      .readFileSync(path.join(__dirname, "..", "code-editor.tsx"), "utf8")
      .replace(/\s+/gu, "");
    expect(
      editor.includes(
        "indentService.of((cx,pos)=>beancountIndent(cx.lineAt(pos,-1).text,cx.textAfterPos(pos),cx.unit),)",
      ),
    ).toBe(true);
    // Both places the language is installed (initially and via the compartment).
    expect(editor.split("beancount?beancountLanguage:[]").length - 1).toBe(2);
  });
});
