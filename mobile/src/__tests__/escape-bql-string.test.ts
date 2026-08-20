import { escapeBqlString } from "../screens/merchant-detail-screen/selectors/escape-bql-string";

describe("escapeBqlString", () => {
  it("wraps a plain payee in double quotes", () => {
    expect(escapeBqlString("MiniMax Group Inc.")).toBe('"MiniMax Group Inc."');
  });

  it("leaves single quotes inside a double-quoted literal", () => {
    expect(escapeBqlString("O'Brien")).toBe('"O\'Brien"');
  });

  it("backslash-escapes embedded double quotes", () => {
    expect(escapeBqlString('He said "hi"')).toBe('"He said \\"hi\\""');
  });

  it("backslash-escapes backslashes", () => {
    expect(escapeBqlString("path\\to")).toBe('"path\\\\to"');
  });

  it("escapes newlines and carriage returns", () => {
    expect(escapeBqlString("a\nb\rc")).toBe('"a\\nb\\rc"');
  });

  it("preserves unicode and empty strings", () => {
    expect(escapeBqlString("emoji 🎉")).toBe('"emoji 🎉"');
    expect(escapeBqlString("")).toBe('""');
  });
});
