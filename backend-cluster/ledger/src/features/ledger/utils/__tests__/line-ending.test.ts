import { appendBlock, lineEndingOf, withLineEnding } from "../line-ending";

// w21/673: the add path wrote LF lines onto a CRLF file.
describe("lineEndingOf", () => {
  it("reads the first line's ending", () => {
    expect(lineEndingOf("a\r\nb\r\n")).toBe("\r\n");
    expect(lineEndingOf("a\nb\n")).toBe("\n");
    expect(lineEndingOf("")).toBe("\n");
    expect(lineEndingOf("no newline")).toBe("\n");
  });
});

describe("appendBlock", () => {
  const block = '2026-10-22 * "Coffee"\n  Assets:Cash  -3.00 USD\n';

  it("keeps every line of a CRLF file CRLF", () => {
    const out = appendBlock("2026-01-01 open Assets:Cash\r\n", block);
    expect(out.replace(/\r\n/g, "")).not.toContain("\n");
    expect(out).toBe(
      '2026-01-01 open Assets:Cash\r\n\r\n2026-10-22 * "Coffee"\r\n  Assets:Cash  -3.00 USD\r\n',
    );
  });

  it("leaves an LF file as it was", () => {
    expect(appendBlock("2026-01-01 open Assets:Cash\n", block)).toBe(
      `2026-01-01 open Assets:Cash\n\n${block}`,
    );
    expect(appendBlock("", block)).toBe(`\n${block}`);
  });

  it("does not double a block that already has CRLF", () => {
    expect(withLineEnding("a\r\nb\n", "\r\n")).toBe("a\r\nb\r\n");
  });
});
