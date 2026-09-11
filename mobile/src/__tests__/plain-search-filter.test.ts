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

  it("keeps a usable literal when both quote kinds appear", () => {
    expect(toPlainSearchFilter(`say "hi" 'there'`)).toBe('"say hi \'there\'"');
  });

  it("trims surrounding whitespace before encoding", () => {
    expect(toPlainSearchFilter("  Marcel  ")).toBe('"Marcel"');
  });
});
