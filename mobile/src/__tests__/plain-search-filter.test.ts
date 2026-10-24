import {
  toPlainSearchFilter,
  toWordsSearchFilter,
} from "../screens/transactions-screen/utils/plain-search-filter";

describe("toPlainSearchFilter", () => {
  it("returns undefined for empty or whitespace input", () => {
    expect(toPlainSearchFilter("")).toBe(undefined);
    expect(toPlainSearchFilter("   ")).toBe(undefined);
  });

  it("quotes and escapes punctuation so merchant periods stay literal", () => {
    expect(toPlainSearchFilter("Mr. Marcel")).toBe('"Mr\\.\\s+Marcel"');
  });

  it("preserves apostrophes inside double quotes", () => {
    expect(toPlainSearchFilter("O'Brien")).toBe(`"O['\u2018\u2019]Brien"`);
  });

  it("double-quotes a needle that contains double quotes", () => {
    // Always double-quoted, the double quote written as a regex escape.
    expect(toPlainSearchFilter('say "hi"')).toBe(
      '"say\\s+[\\x22\u201c\u201d]hi[\\x22\u201c\u201d]"',
    );
  });

  describe("when both quote kinds appear", () => {
    // Mirrors the filter service: its STRING lexer takes `"[^"]*"` or
    // `'[^']*'` verbatim (no escape processing), and the body is compiled as a
    // case-insensitive JavaScript regex.
    const compile = (raw: string): RegExp => {
      const filter = toPlainSearchFilter(raw);
      if (filter === undefined) throw new Error("expected a filter");
      const lexed = /^(?:"[^"]*"|'[^']*')$/.exec(filter);
      if (!lexed) throw new Error(`not one STRING token: ${filter}`);
      return new RegExp(filter.slice(1, -1), "i");
    };

    it("matches text containing both quote kinds, not the quote-stripped text", () => {
      const regex = compile(`E.B.'s "Beer"`);
      expect(regex.test(`E.B.'s "Beer" and Wine`)).toBe(true);
      expect(regex.test(`E.B.'s Beer and Wine`)).toBe(false);
    });

    it("keeps typed backslashes literal beside quotes", () => {
      const regex = compile(`a\\"b'`);
      expect(regex.test(`a\\"b'`)).toBe(true);
      expect(regex.test(`a"b'`)).toBe(false);
    });

    it("does not turn a typed \\x22 into a quote", () => {
      const regex = compile(`it's \\x22 "q"`);
      expect(regex.test(`it's \\x22 "q"`)).toBe(true);
      expect(regex.test(`it's " "q"`)).toBe(false);
    });
  });

  it("trims surrounding whitespace before encoding", () => {
    expect(toPlainSearchFilter("  Marcel  ")).toBe('"Marcel"');
  });

  // Merchant detail routes its journal needle through here too, so the payees
  // that used to break it are pinned as serializer cases.
  it("escapes a decimal point in a merchant name", () => {
    expect(toPlainSearchFilter("Ethereum 2.0")).toBe('"Ethereum\\s+2\\.0"');
  });

  it("keeps an apostrophe payee inside double quotes", () => {
    expect(toPlainSearchFilter("Lowe's")).toBe(`"Lowe['\u2018\u2019]s"`);
  });

  it("escapes a trailing period in a company suffix", () => {
    expect(toPlainSearchFilter("MiniMax Group Inc.")).toBe(
      '"MiniMax\\s+Group\\s+Inc\\."',
    );
  });

  it("double-quotes a payee with an embedded double quote", () => {
    expect(toPlainSearchFilter('The "Best" Cafe')).toBe(
      '"The\\s+[\\x22\u201c\u201d]Best[\\x22\u201c\u201d]\\s+Cafe"',
    );
  });
});

// A lone tag or link is Fava filter syntax and must reach it unquoted: the
// quoted form matched payee and narration only (w21/025). It is also how a check
// or order number reads in a narration ("Check #1042"), so it goes with the text
// as an alternative (`,` is Fava's OR) (w21/400).
describe("toPlainSearchFilter tags and links", () => {
  it("sends a single tag or link token as the tag, its prefix, or the text", () => {
    expect(toPlainSearchFilter(" #work ")).toBe(
      '#work,tags:"(?:^|, )work","#work"',
    );
    expect(toPlainSearchFilter("^qa-receipt-001")).toBe(
      '^qa-receipt-001,links:"(?:^|, )qa-receipt-001","\\^qa-receipt-001"',
    );
    expect(toPlainSearchFilter("#trip/2026.q3")).toBe(
      '#trip/2026.q3,tags:"(?:^|, )trip/2026\\.q3","#trip/2026\\.q3"',
    );
  });

  // w21/640: the bare form matched only the exact, case-sensitive tag.
  it("matches the start of a tag in any case", () => {
    const filter = toPlainSearchFilter("#japan") ?? "";
    const pattern = /tags:"([^"]*)"/.exec(filter)?.[1] ?? "";
    // The filter lists a transaction's tags as "a, b" and matches the pattern
    // case-insensitively.
    const matches = (tags: string) => new RegExp(pattern, "i").test(tags);
    expect(matches("Japan2026")).toBe(true);
    expect(matches("trip, JAPAN")).toBe(true);
    expect(matches("nihon-japan")).toBe(false);
  });

  it("finds a check number in a narration as well as a real tag", () => {
    expect(toPlainSearchFilter("#1042")).toBe(
      '#1042,tags:"(?:^|, )1042","#1042"',
    );
    expect(toPlainSearchFilter("#112-3456789-1234567")).toBe(
      '#112-3456789-1234567,tags:"(?:^|, )112-3456789-1234567","#112-3456789-1234567"',
    );
  });

  it("keeps quoting anything that is not exactly one token", () => {
    expect(toPlainSearchFilter("#a b")).toBe('"#a\\s+b"');
    expect(toPlainSearchFilter("#")).toBe('"#"');
    expect(toPlainSearchFilter("coffee #work")).toBe('"coffee\\s+#work"');
    expect(toPlainSearchFilter("#café")).toBe('"#caf(?:\u00e9|e\u0301)"');
  });
});

// w21/401: iOS Smart Punctuation turns a typed apostrophe into U+2019, which
// matched nothing against the straight quote in the ledger, and the reverse.
describe("toPlainSearchFilter and typographic quotes", () => {
  const compile = (raw: string): RegExp => {
    const filter = toPlainSearchFilter(raw);
    if (filter === undefined) throw new Error("expected a filter");
    const lexed = /^"[^"]*"$/.exec(filter);
    if (!lexed) throw new Error(`not one STRING token: ${filter}`);
    return new RegExp(filter.slice(1, -1), "i");
  };

  it("finds a straight apostrophe from the curly one iOS types, and the reverse", () => {
    expect(compile("Trader Joe\u2019s").test("TRADER JOE'S #123")).toBe(true);
    expect(compile("Trader Joe's").test("Trader Joe\u2019s")).toBe(true);
    expect(compile("Trader Joe\u2018s").test("Trader Joe's")).toBe(true);
    expect(compile("Trader Joe's").test("Trader Joes")).toBe(false);
  });

  it("finds straight double quotes from curly ones and the reverse", () => {
    expect(
      compile("E.B.'s \u201cBeer\u201d").test(`E.B.'s "Beer" and Wine`),
    ).toBe(true);
    expect(compile('The "Best" Cafe').test("The \u201cBest\u201d Cafe")).toBe(
      true,
    );
    expect(compile('The "Best" Cafe').test("The Best Cafe")).toBe(false);
  });

  it("stays one lexable literal whatever quotes it holds", () => {
    for (const text of [`a'b`, `a"b`, `a'b"c`, `\u2019\u201c`]) {
      expect(/^"[^"]*"$/.test(toPlainSearchFilter(text) ?? "")).toBe(true);
    }
  });
});

// w21/402: the ledger service refuses a filter pattern over 256 characters, and
// escaping makes a text several times longer, so a long memo failed the list.
describe("toPlainSearchFilter and long text", () => {
  const body = (raw: string) => {
    const filter = toPlainSearchFilter(raw) ?? "";
    return filter.slice(1, -1);
  };

  it("keeps the pattern within 256 characters however it escapes", () => {
    for (const text of [
      "x".repeat(300),
      ".".repeat(300),
      "'".repeat(100),
      `a"b'c.`.repeat(60),
      "(*)".repeat(100),
    ]) {
      expect(body(text).length <= 256).toBe(true);
    }
  });

  it("cuts to a prefix that matches the text, never in the middle of an escape", () => {
    const text = "Check number 1042.".repeat(30);
    const regex = new RegExp(body(text), "i");
    expect(regex.test(text)).toBe(true);
    // An escape cut in half would not compile, or would match something else.
    expect(() => new RegExp(body(".".repeat(300)))).not.toThrow();
    expect(body(".".repeat(300))).toBe("\\.".repeat(128));
  });

  it("leaves a text that fits exactly as before", () => {
    expect(body("x".repeat(256))).toBe("x".repeat(256));
    expect(toPlainSearchFilter("Check 1042")).toBe('"Check\\s+1042"');
  });
});

// w21/466: iOS types "é" composed and an import may hold it decomposed; a bank
// export may double a space or use a no-break one. The search found neither.
describe("toPlainSearchFilter and how text is written", () => {
  const compile = (raw: string): RegExp => {
    const filter = toPlainSearchFilter(raw);
    if (filter === undefined) throw new Error("expected a filter");
    const lexed = /^"[^"]*"$/.exec(filter);
    if (!lexed) throw new Error(`not one STRING token: ${filter}`);
    return new RegExp(filter.slice(1, -1), "i");
  };
  const NFC = "Caf\u00e9";
  const NFD = "Cafe\u0301";

  it("finds composed text from decomposed and the reverse", () => {
    expect(NFC.length === NFD.length).toBe(false);
    expect(compile(NFC).test(`${NFD} Rouge`)).toBe(true);
    expect(compile(NFD).test(`${NFC} Rouge`)).toBe(true);
    expect(compile(NFC).test(`${NFC} Rouge`)).toBe(true);
    // Without the accent it is another word.
    expect(compile(NFC).test("Cafe Rouge")).toBe(false);
  });

  it("finds a phrase across a double space and a no-break space", () => {
    expect(compile("whole foods").test("Whole Foods")).toBe(true);
    expect(compile("whole foods").test("Whole  Foods Market")).toBe(true);
    expect(compile("whole foods").test("Whole\u00a0Foods")).toBe(true);
    expect(compile("whole   foods").test("Whole Foods")).toBe(true);
    // But not two words with nothing between.
    expect(compile("whole foods").test("Wholefoods")).toBe(false);
  });

  it("stays one lexable literal within 256 characters", () => {
    for (const text of [
      `${NFD} `.repeat(80),
      "\u00e9".repeat(200),
      "a  b ".repeat(80),
    ]) {
      const filter = toPlainSearchFilter(text) ?? "";
      expect(/^"[^"]*"$/.test(filter)).toBe(true);
      expect(filter.length - 2 <= 256).toBe(true);
      expect(() => new RegExp(filter.slice(1, -1), "i")).not.toThrow();
    }
  });
});

// w21/911: "sushi dinner" found nothing unless both words sat together in one field.
describe("toWordsSearchFilter", () => {
  it("sends each word as its own term, which the engine reads as an AND", () => {
    expect(toWordsSearchFilter("sushi dinner")).toBe('"sushi" "dinner"');
    expect(toWordsSearchFilter("dinner   sushi")).toBe('"dinner" "sushi"');
  });

  it("leaves a single word as the phrase search it was", () => {
    expect(toWordsSearchFilter("Mr. Marcel".split(" ")[0]!)).toBe(
      toPlainSearchFilter("Mr."),
    );
    expect(toWordsSearchFilter("  ")).toBe(undefined);
  });

  it("keeps a tag word's alternatives grouped so the OR cannot take its neighbours", () => {
    const filter = toWordsSearchFilter("#trip sushi")!;
    expect(filter.startsWith("(#trip,tags:")).toBe(true);
    expect(filter.endsWith(') "sushi"')).toBe(true);
  });

  it("holds the pattern cap for each word", () => {
    const words = ["a".repeat(300), "b".repeat(300)];
    for (const term of toWordsSearchFilter(words.join(" "))!.split(" ")) {
      expect(term.length <= 258).toBe(true);
    }
  });
});

// w21/912: a typed full-width dot must not become an unescaped regex dot.
describe("toPlainSearchFilter with full-width text", () => {
  it("folds it to the ordinary form before escaping", () => {
    expect(toPlainSearchFilter("ＡＭＡＺＯＮ．ＣＯ．ＪＰ")).toBe(
      toPlainSearchFilter("AMAZON.CO.JP"),
    );
    expect(toPlainSearchFilter("ｽﾀｰﾊﾞｯｸｽ")).toBe(
      toPlainSearchFilter("スターバックス"),
    );
    expect(toPlainSearchFilter("ａｂｃ　ｄｅｆ")).toBe(
      toPlainSearchFilter("abc def"),
    );
  });
});
