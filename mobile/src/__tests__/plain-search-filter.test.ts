import { toPlainSearchFilter } from "../screens/transactions-screen/utils/plain-search-filter";

describe("toPlainSearchFilter", () => {
  it("returns undefined for empty or whitespace input", () => {
    expect(toPlainSearchFilter("")).toBe(undefined);
    expect(toPlainSearchFilter("   ")).toBe(undefined);
  });

  it("quotes and escapes punctuation so merchant periods stay literal", () => {
    expect(toPlainSearchFilter("Mr. Marcel")).toBe('"Mr\\. Marcel"');
  });

  it("preserves apostrophes inside double quotes", () => {
    expect(toPlainSearchFilter("O'Brien")).toBe('"O\'Brien"');
  });

  it("uses single quotes when the needle contains double quotes", () => {
    expect(toPlainSearchFilter('say "hi"')).toBe("'say \"hi\"'");
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
    expect(toPlainSearchFilter("Ethereum 2.0")).toBe('"Ethereum 2\\.0"');
  });

  it("keeps an apostrophe payee inside double quotes", () => {
    expect(toPlainSearchFilter("Lowe's")).toBe('"Lowe\'s"');
  });

  it("escapes a trailing period in a company suffix", () => {
    expect(toPlainSearchFilter("MiniMax Group Inc.")).toBe(
      '"MiniMax Group Inc\\."',
    );
  });

  it("falls back to single quotes for a payee with an embedded double quote", () => {
    expect(toPlainSearchFilter('The "Best" Cafe')).toBe("'The \"Best\" Cafe'");
  });
});
