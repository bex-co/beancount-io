import { addIncludes } from "../routed-includes";

// w23/062: a routed write's new file is included from the entry point.
describe("addIncludes", () => {
  it("adds the lines after the last include, keeping a per-year list together", () => {
    const main = [
      'option "title" "Books"',
      'include "txns/2025.bean"',
      'include "txns/2026.bean"',
      "",
      "2020-01-01 open Assets:Cash USD",
      "",
    ].join("\n");
    expect(addIncludes(main, ["txns/2027.bean"])).toBe(
      [
        'option "title" "Books"',
        'include "txns/2025.bean"',
        'include "txns/2026.bean"',
        'include "txns/2027.bean"',
        "",
        "2020-01-01 open Assets:Cash USD",
        "",
      ].join("\n"),
    );
  });

  it("appends them when the file has no include", () => {
    expect(
      addIncludes("2020-01-01 open Assets:Cash USD\n\n", ["a.bean", "b.bean"]),
    ).toBe(
      '2020-01-01 open Assets:Cash USD\ninclude "a.bean"\ninclude "b.bean"\n',
    );
    expect(addIncludes("", ["a.bean"])).toBe('include "a.bean"\n');
  });

  it("quotes a path so it reads back intact, and changes nothing for none", () => {
    expect(addIncludes("", ['odd "name".bean'])).toBe(
      'include "odd \\"name\\".bean"\n',
    );
    expect(addIncludes("x\n", [])).toBe("x\n");
  });
});

// w21/695: a CRLF entry point gained a bare-LF include line.
describe("addIncludes in a CRLF file", () => {
  const crlf = (lines: string[]) => lines.join("\r\n");

  it("keeps every line CRLF when it adds after the last include", () => {
    const main = crlf([
      'include "txns/2025.bean"',
      "",
      "2020-01-01 open Assets:Cash USD",
      "",
    ]);
    const out = addIncludes(main, ["txns/2026.bean"]);
    expect(out).toBe(
      crlf([
        'include "txns/2025.bean"',
        'include "txns/2026.bean"',
        "",
        "2020-01-01 open Assets:Cash USD",
        "",
      ]),
    );
    expect(out.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("appends in CRLF when the file has no include", () => {
    const out = addIncludes(crlf(["2020-01-01 open Assets:Cash USD", "", ""]), [
      "a.bean",
      "b.bean",
    ]);
    expect(out).toBe(
      crlf([
        "2020-01-01 open Assets:Cash USD",
        'include "a.bean"',
        'include "b.bean"',
        "",
      ]),
    );
  });

  it("does not leave a dangling carriage return when the include is the last line", () => {
    const out = addIncludes('include "a.bean"', ["b.bean"]);
    expect(out).toBe('include "a.bean"\ninclude "b.bean"');
    const crlfOut = addIncludes(
      crlf(['include "a.bean"', 'include "z.bean"']),
      ["b.bean"],
    );
    expect(crlfOut.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });
});
