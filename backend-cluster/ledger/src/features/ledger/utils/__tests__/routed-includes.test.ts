import { addIncludes, assertLiteralIncludePath } from "../routed-includes";
import { BadUserInputError } from "@/shared/errors";

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

  // w31/093: glob metacharacters in an include target cannot be loaded literally.
  it.each(["books/q[1].bean", "books/q[1.bean", "books/*.bean", "books/?.bean"])(
    "refuses glob metacharacter path %p",
    (badPath) => {
      expect(() => assertLiteralIncludePath(badPath, "toPath")).toThrow(
        BadUserInputError,
      );
      expect(() => addIncludes("", [badPath], "toPath")).toThrow(
        /toPath.*glob metacharacter/,
      );
    },
  );
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

  // w31/097: multiline strings and prose lines must never act as include anchors.
  it("never splices inside a multiline string in LF or CRLF files", () => {
    const lines = [
      '2026-08-30 * "Landlord" "Monthly rent',
      "include qa-sub.bean",
      'include utilities and trash"',
      "  Expenses:Food:Groceries  1.00 USD",
      "  Assets:Bank:Checking",
      "",
    ];
    expect(addIncludes(lines.join("\n"), ["qa-moved.bean"])).toBe(
      `${lines.join("\n")}include "qa-moved.bean"\n`,
    );
    expect(addIncludes(crlf(lines), ["qa-moved.bean"])).toBe(
      `${crlf(lines)}include "qa-moved.bean"\r\n`,
    );
  });

  it("anchors after the last real double-quoted include, ignoring multiline strings, prose, comments, and org headings", () => {
    const main = [
      '; comment with "unclosed quote',
      '* Heading with "unclosed quote',
      'include "odd \\"name\\".bean" ; keep',
      "",
      '2026-08-30 * "Landlord" "Monthly rent',
      "include qa-sub.bean",
      'include \\"qa-sub.bean\\"',
      'end of memo"',
      "  Expenses:Food:Groceries  1.00 USD",
      "  Assets:Bank:Checking",
      "",
    ].join("\n");
    expect(addIncludes(main, ["qa-moved.bean"])).toBe(
      [
        '; comment with "unclosed quote',
        '* Heading with "unclosed quote',
        'include "odd \\"name\\".bean" ; keep',
        'include "qa-moved.bean"',
        "",
        '2026-08-30 * "Landlord" "Monthly rent',
        "include qa-sub.bean",
        'include \\"qa-sub.bean\\"',
        'end of memo"',
        "  Expenses:Food:Groceries  1.00 USD",
        "  Assets:Bank:Checking",
        "",
      ].join("\n"),
    );

    const afterClosed = [
      '2026-08-30 * "Landlord" "Monthly rent',
      '* bullet closing quote"',
      "  Expenses:Food:Groceries  1.00 USD",
      "  Assets:Bank:Checking",
      'include "txns/2025.bean"',
      "",
    ].join("\n");
    expect(addIncludes(afterClosed, ["txns/2026.bean"])).toBe(
      [
        '2026-08-30 * "Landlord" "Monthly rent',
        '* bullet closing quote"',
        "  Expenses:Food:Groceries  1.00 USD",
        "  Assets:Bank:Checking",
        'include "txns/2025.bean"',
        'include "txns/2026.bean"',
        "",
      ].join("\n"),
    );

    const proseLineOutsideString = [
      "include utilities and trash",
      "2020-01-01 open Assets:Cash USD",
      "",
    ].join("\n");
    expect(addIncludes(proseLineOutsideString, ["txns/2026.bean"])).toBe(
      `${proseLineOutsideString}include "txns/2026.bean"\n`,
    );
  });
});
