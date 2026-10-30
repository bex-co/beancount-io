import { canIncludeNewFile, withIncludeLine } from "../include-new-file";

// w21/588: a file nothing includes is read by no one, so entries typed into it
// never count.
describe("canIncludeNewFile", () => {
  it("offers the include for a Beancount file", () => {
    expect(canIncludeNewFile("investments.bean")).toBe(true);
    expect(canIncludeNewFile("books/2026/jan.beancount")).toBe(true);
  });

  it("leaves it out for the entry point, other files and awkward names", () => {
    expect(canIncludeNewFile("main.bean")).toBe(false);
    expect(canIncludeNewFile("notes.txt")).toBe(false);
    expect(canIncludeNewFile('a"b.bean')).toBe(false);
    expect(canIncludeNewFile("a\\b.bean")).toBe(false);
  });
});

describe("withIncludeLine", () => {
  it("adds the line after the last include, as one added line", () => {
    const before =
      'option "title" "x"\ninclude "a.bean"\ninclude "b.bean"\n\n2026-01-01 open Assets:Cash\n';
    expect(withIncludeLine(before, "c.bean")).toBe(
      'option "title" "x"\ninclude "a.bean"\ninclude "b.bean"\ninclude "c.bean"\n\n2026-01-01 open Assets:Cash\n',
    );
  });

  it("appends to a file with no includes, ending the last line first", () => {
    expect(withIncludeLine("2026-01-01 open Assets:Cash", "c.bean")).toBe(
      '2026-01-01 open Assets:Cash\ninclude "c.bean"\n',
    );
    expect(withIncludeLine("", "c.bean")).toBe('include "c.bean"\n');
  });

  it("handles an include on the last line with no newline", () => {
    expect(withIncludeLine('include "a.bean"', "c.bean")).toBe(
      'include "a.bean"\ninclude "c.bean"\n',
    );
  });

  it("keeps a CRLF file's line ending", () => {
    expect(withIncludeLine('include "a.bean"\r\nx\r\n', "c.bean")).toBe(
      'include "a.bean"\r\ninclude "c.bean"\r\nx\r\n',
    );
  });

  it("changes nothing when the exact path is already included", () => {
    expect(withIncludeLine('include "c.bean"\n', "c.bean")).toBe(null);
    expect(withIncludeLine('  include "c.bean" ; note\n', "c.bean")).toBe(null);
  });

  it("does not take a similar path for the same one", () => {
    expect(withIncludeLine('include "dir/c.bean"\n', "c.bean")).toBe(
      'include "dir/c.bean"\ninclude "c.bean"\n',
    );
  });
});
