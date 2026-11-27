import {
  addIncludeLines,
  assertLiteralIncludePath,
  formatDocumentLine,
  formatIncludeLine,
  globMatches,
  includeTargetFor,
  movedDocumentTarget,
  parseIncludeLine,
  resolveIncludeTarget,
  scanIncludeLines,
} from "@/features/ledger/utils/include-target";
import { BadUserInputError } from "@/shared/errors";

describe("include lines", () => {
  it.each([
    ['include "x.bean"', "x.bean", '"'],
    ['  include "my file.bean"  ; note', "my file.bean", '"'],
    ['include "c\\"x.bean"', 'c"x.bean', '"'],
    ["include 'x.bean'", "x.bean", "'"],
    ["include x.bean", "x.bean", ""],
  ])("reads the target of %p", (line, target, quote) => {
    expect(parseIncludeLine(line)).toMatchObject({ target, quote });
  });

  it.each(['option "title" "x"', "; include x.bean", "include"])(
    "reads %p as no include",
    (line) => expect(parseIncludeLine(line)).toBeNull(),
  );

  it.each([
    ['include "x.bean" ; keep', "y.bean", 'include "y.bean" ; keep'],
    ['include "x.bean"', 'c"x\\y.bean', 'include "c\\"x\\\\y.bean"'],
    ["include 'x.bean'", "y.bean", "include 'y.bean'"],
    ["include x.bean", "my file.bean", 'include "my file.bean"'],
  ])("rewrites %p to name %p", (line, target, written) => {
    const rewritten = formatIncludeLine(parseIncludeLine(line)!, target);
    expect(rewritten).toBe(written);
    expect(parseIncludeLine(rewritten)?.target).toBe(target);
  });

  // w31/097: stateful scanning skips lines inside multiline Beancount strings.
  it("scanIncludeLines tracks multiline strings, escapes, comments, org headings, and CRLF", () => {
    const content = [
      '; comment with "unclosed',
      '* Heading with "unclosed',
      'include "before.bean"',
      '2026-08-30 * "Landlord" "Monthly rent with \\"quote\\" and \\\\',
      "include fake-bare.bean",
      "include 'fake-single.bean'",
      'include \\"fake-escaped.bean\\"',
      '* closing bullet"',
      "  Expenses:Food  1.00 USD",
      'include "after.bean"',
    ].join("\r\n");

    const found = scanIncludeLines(content)
      .filter((entry) => entry.include !== null)
      .map((entry) => ({ index: entry.index, target: entry.include!.target }));

    expect(found).toEqual([
      { index: 2, target: "before.bean" },
      { index: 9, target: "after.bean" },
    ]);
  });
});

// w31/099: Beancount skips a whole line starting with any of `*#:!&?%`, and a
// `"` on it opens no string, so the include after it is still an include.
describe("scanIncludeLines over lines Beancount skips (w31/099)", () => {
  it.each(
    ["*", "#", ":", "!", "&", "?", "%"].flatMap((start) => [
      [start, "without a quote", ""],
      [start, "with an unmatched quote", ' 5"'],
    ]),
  )("finds the include after a %s line %s", (start, _case, quote) => {
    const content = `${start} see the 5 note${quote}\ninclude "a.bean"\n`;
    expect(
      scanIncludeLines(content)
        .filter((entry) => entry.include !== null)
        .map((entry) => [entry.index, entry.include!.target]),
    ).toEqual([[1, "a.bean"]]);
    expect(addIncludeLines(content, ["b.bean"])).toBe(
      `${start} see the 5 note${quote}\ninclude "a.bean"\ninclude "b.bean"\n`,
    );
  });

  it.each(["*", "#", ":", "!", "&", "?", "%"])(
    "reads a %s line inside a multiline string as the string's content",
    (start) => {
      const content = [
        '2026-08-30 note Assets:Cash "first line',
        `${start} still the note"`,
        'include "a.bean"',
      ].join("\n");
      expect(
        scanIncludeLines(content)
          .filter((entry) => entry.include !== null)
          .map((entry) => entry.index),
      ).toEqual([2]);
    },
  );
});

// w31/100: the engine reads a file past a leading byte-order mark, so line 1
// behind one is read as written, and the mark survives every rewrite.
describe("scanIncludeLines behind a byte-order mark (w31/100)", () => {
  it("finds the include after a first-line odd-quote # line", () => {
    const content = '\uFEFF# a 5" ruler\ninclude "a.bean"\n';
    expect(
      scanIncludeLines(content)
        .filter((entry) => entry.include !== null)
        .map((entry) => [entry.index, entry.include!.target]),
    ).toEqual([[1, "a.bean"]]);
    expect(addIncludeLines(content, ["b.bean"])).toBe(
      '\uFEFF# a 5" ruler\ninclude "a.bean"\ninclude "b.bean"\n',
    );
  });

  it("keeps the mark on a first-line include's line and its rewrite", () => {
    const content = '\uFEFFinclude "a.bean"\ninclude "b.bean"';
    const scanned = scanIncludeLines(content);
    expect(scanned.map((entry) => entry.include?.target)).toEqual([
      "a.bean",
      "b.bean",
    ]);
    expect(scanned.map((entry) => entry.line).join("\n")).toBe(content);
    expect(scanned[0]!.include!.prefix).toBe("\uFEFFinclude ");
    expect(formatIncludeLine(scanned[0]!.include!, "c.bean")).toBe(
      '\uFEFFinclude "c.bean"',
    );
  });
});

// w31/133: a relative `document` filename resolves against its own file's
// folder, so a file moving to another folder has it rewritten.
describe("document lines", () => {
  const documentOf = (line: string) => scanIncludeLines(line)[0]!.document;

  it.each([
    ['2026-08-30 document Assets:Cash "receipt.txt"', "receipt.txt"],
    ['2026/08/30 document Assets:Cash "r.txt" #trip ; c', "r.txt"],
    ['2026-8-3\tdocument\tAssets:Cash\t"r.txt"\r', "r.txt"],
    ['2026-08-30 document Assets:Cash "we\\"ird.txt"', 'we"ird.txt'],
  ])("reads the filename of %p", (line, target) => {
    expect(documentOf(line)).toMatchObject({ target });
  });

  it.each([
    '2026-08-30 note Assets:Cash "receipt.txt"',
    '  2026-08-30 document Assets:Cash "receipt.txt"',
    '; 2026-08-30 document Assets:Cash "receipt.txt"',
    '20260830 document Assets:Cash "receipt.txt"',
    "2026-08-30 document Assets:Cash receipt.txt",
    '2026-08-30 document Assets:Cash "open',
  ])("reads %p as no document", (line) => expect(documentOf(line)).toBeNull());

  it("skips a document line inside a multiline string, and keeps a mark on line 1", () => {
    const scanned = scanIncludeLines(
      [
        '\uFEFF2026-08-30 document Assets:Cash "a.txt"',
        '2026-08-31 * "memo',
        '2026-08-31 document Assets:Cash "b.txt"',
        'end"',
      ].join("\n"),
    );
    expect(scanned.map((entry) => entry.document?.target ?? null)).toEqual([
      "a.txt",
      null,
      null,
      null,
    ]);
    expect(formatDocumentLine(scanned[0]!.document!, "d/a.txt")).toBe(
      '\uFEFF2026-08-30 document Assets:Cash "d/a.txt"',
    );
  });

  it("writes the filename escaped, keeping the rest of the line", () => {
    const line = '2026-08-30 document Assets:Cash "r.txt" #trip ; c\r';
    expect(formatDocumentLine(documentOf(line)!, 'd/we"ird\\x.txt')).toBe(
      '2026-08-30 document Assets:Cash "d/we\\"ird\\\\x.txt" #trip ; c\r',
    );
  });

  const files = new Set(["books/receipt.txt", "receipt.txt", "shared/s.pdf"]);
  const exists = (path: string) => files.has(path);
  it.each([
    ["books/docs.bean", "docs.bean", "receipt.txt", "books/receipt.txt"],
    ["books/docs.bean", "books/sub/docs.bean", "receipt.txt", "../receipt.txt"],
    [
      "books/docs.bean",
      "other/docs.bean",
      "./receipt.txt",
      "../books/receipt.txt",
    ],
    ["books/docs.bean", "docs.bean", "./receipt.txt", "./books/receipt.txt"],
    ["books/docs.bean", "docs.bean", "../shared/s.pdf", "shared/s.pdf"],
    ["docs.bean", "books/docs.bean", "receipt.txt", "../receipt.txt"],
  ])("moves %s to %s: %p reads %p", (oldPath, newPath, target, written) => {
    expect(movedDocumentTarget(oldPath, newPath, target, exists)).toBe(written);
  });

  it.each([
    ["books/docs.bean", "books/docs2.bean", "receipt.txt"],
    ["books/docs.bean", "docs.bean", "/books/receipt.txt"],
    ["books/docs.bean", "docs.bean", "https://example.com/r.txt"],
    ["books/docs.bean", "docs.bean", "missing.txt"],
    ["books/docs.bean", "docs.bean", "../../outside.txt"],
    ["a/docs.bean", "b/docs.bean", "../shared/s.pdf"],
    ["books/docs.bean", "docs.bean", ""],
  ])("leaves %s → %s's %p as written", (oldPath, newPath, target) => {
    expect(
      movedDocumentTarget(oldPath, newPath, target, exists),
    ).toBeUndefined();
  });
});

describe("include targets", () => {
  it.each([
    ["main.bean", "x.bean", "x.bean"],
    ["d/inc.bean", "x.bean", "d/x.bean"],
    ["d/inc.bean", "../b.bean", "b.bean"],
    ["inc.bean", "./b.bean", "b.bean"],
    ["d/inc.bean", "/b.bean", "b.bean"],
    ["d/inc.bean", "*.bean", "d/*.bean"],
  ])("resolves %p's %p to %p", (including, target, resolved) => {
    expect(resolveIncludeTarget(including, target)).toBe(resolved);
  });

  it.each([
    ["main.bean", "c.bean", "b.bean", "c.bean"],
    ["inc3.bean", "c.bean", "./b.bean", "./c.bean"],
    ["d/inc.bean", "e/c.bean", "../b.bean", "../e/c.bean"],
    ["d/inc.bean", "d/y.bean", "./x.bean", "./y.bean"],
    ["d/inc.bean", "c.bean", "./x.bean", "../c.bean"],
    ["d/inc.bean", "e/c.bean", "/b.bean", "/e/c.bean"],
  ])(
    "names %p's new target %p in the style of %p",
    (including, path, previous, target) => {
      expect(includeTargetFor(including, path, previous)).toBe(target);
      expect(resolveIncludeTarget(including, target)).toBe(path);
    },
  );
});

describe("include globs", () => {
  it.each([
    ["d/*.bean", "d/x.bean", true],
    ["d/*.bean", "e/x.bean", false],
    ["d/*.bean", "d/sub/x.bean", false],
    ["d/*.bean", "d/.hidden.bean", false],
    ["d/.*.bean", "d/.hidden.bean", true],
    ["d/?.bean", "d/x.bean", true],
    ["d/?.bean", "d/xy.bean", false],
    ["d/[a-c].bean", "d/b.bean", true],
    ["d/[!a-c].bean", "d/b.bean", false],
    ["d/[]].bean", "d/].bean", true],
    ["d/[.bean", "d/[.bean", true],
    ["**/*.bean", "x.bean", true],
    ["**/*.bean", "a/b/x.bean", true],
    ["**/*.bean", "a/.git2/x.bean", false],
    ["d/**", "d/a/x.bean", true],
    ["d/**/x.bean", "d/x.bean", true],
  ])("%p matching %p is %p", (pattern, path, matches) => {
    expect(globMatches(pattern, path)).toBe(matches);
  });

  it("matches a long name against many stars without backtracking", () => {
    const pattern = `d/${"*a".repeat(40)}*b`;
    expect(globMatches(pattern, `d/${"a".repeat(2000)}`)).toBe(false);
  });
});

// w23/062: a routed write's new file joins the closure from the entry point.
describe("addIncludeLines", () => {
  it("adds the lines after the last include, keeping a per-year list together", () => {
    const main = [
      'include "txns/2025.bean"',
      "include 'txns/2026.bean' ; per year",
      "",
      "2020-01-01 open Assets:Cash USD",
      "",
    ].join("\n");
    expect(addIncludeLines(main, ["txns/2027.bean"])).toBe(
      [
        'include "txns/2025.bean"',
        "include 'txns/2026.bean' ; per year",
        'include "txns/2027.bean"',
        "",
        "2020-01-01 open Assets:Cash USD",
        "",
      ].join("\n"),
    );
  });

  it("appends them when the file has none, and reads back what it wrote", () => {
    const written = addIncludeLines("2020-01-01 open Assets:Cash USD\n\n", [
      "a.bean",
      'odd "name".bean',
    ]);
    expect(written).toBe(
      '2020-01-01 open Assets:Cash USD\ninclude "a.bean"\ninclude "odd \\"name\\".bean"\n',
    );
    expect(
      written
        .split("\n")
        .flatMap((line) => parseIncludeLine(line)?.target ?? []),
    ).toEqual(["a.bean", 'odd "name".bean']);
    expect(addIncludeLines("x\n", [])).toBe("x\n");
  });

  // w31/116: where the lines went maps an error below them back to its line.
  it("says where it put the lines", () => {
    const seen: { at: number; lines: number }[] = [];
    const record = (insertion: { at: number; lines: number }) =>
      seen.push(insertion);
    const main = 'option "title" "T"\ninclude "a.bean"\n\n2020-01-01 open A\n';
    const after = addIncludeLines(main, ["b.bean", "c.bean"], "path", record);
    expect(after.split("\n").slice(2, 4)).toEqual([
      'include "b.bean"',
      'include "c.bean"',
    ]);
    addIncludeLines("2020-01-01 open A\n\n", ["b.bean"], "path", record);
    addIncludeLines("", ["b.bean"], "path", record);
    addIncludeLines("x\n", [], "path", record);
    expect(seen).toEqual([
      { at: 2, lines: 2 },
      { at: 1, lines: 1 },
      { at: 0, lines: 1 },
    ]);
  });

  // w31/093: glob metacharacters in an include target cannot be matched literally.
  it.each([
    "books/q[1].bean",
    "books/q[1.bean",
    "books/*.bean",
    "books/?.bean",
  ])("refuses glob metacharacter path %p", (badPath) => {
    expect(() => assertLiteralIncludePath(badPath, "toPath")).toThrow(
      BadUserInputError,
    );
    expect(() => addIncludeLines("", [badPath], "toPath")).toThrow(
      /toPath.*glob metacharacter/,
    );
  });

  it("allows literal paths without glob metacharacters", () => {
    expect(() =>
      assertLiteralIncludePath("books/q1.bean", "toPath"),
    ).not.toThrow();
    expect(() =>
      assertLiteralIncludePath("books/q1].bean", "toPath"),
    ).not.toThrow();
  });

  // w31/097: lines inside multiline Beancount strings are content, not include directives.
  it("ignores include-like lines inside multiline strings when anchoring new includes", () => {
    const noRealIncludes = [
      '2026-08-30 * "Landlord" "Monthly rent',
      "include qa-sub.bean",
      "include 'qa-sub.bean'",
      'include \\"qa-sub.bean\\"',
      'end of memo"',
      "  Expenses:Food:Groceries  1.00 USD",
      "  Assets:Bank:Checking",
      "",
    ].join("\n");
    expect(addIncludeLines(noRealIncludes, ["qa-moved.bean"])).toBe(
      `${noRealIncludes}include "qa-moved.bean"\n`,
    );

    const withEarlierInclude = [
      'include "txns/2025.bean"',
      "",
      '2026-08-30 * "Landlord" "Monthly rent',
      "include qa-sub.bean",
      'end of memo"',
      "  Expenses:Food:Groceries  1.00 USD",
      "  Assets:Bank:Checking",
      "",
    ].join("\n");
    expect(addIncludeLines(withEarlierInclude, ["txns/2026.bean"])).toBe(
      [
        'include "txns/2025.bean"',
        'include "txns/2026.bean"',
        "",
        '2026-08-30 * "Landlord" "Monthly rent',
        "include qa-sub.bean",
        'end of memo"',
        "  Expenses:Food:Groceries  1.00 USD",
        "  Assets:Bank:Checking",
        "",
      ].join("\n"),
    );

    const withLaterInclude = [
      '; comment with "unclosed quote',
      '* Heading with "unclosed quote',
      '2026-08-30 * "Landlord" "Monthly rent',
      'include qa-sub.bean"',
      "  Expenses:Food:Groceries  1.00 USD",
      "  Assets:Bank:Checking",
      'include "txns/2025.bean"',
      "",
    ].join("\n");
    expect(addIncludeLines(withLaterInclude, ["txns/2026.bean"])).toBe(
      [
        '; comment with "unclosed quote',
        '* Heading with "unclosed quote',
        '2026-08-30 * "Landlord" "Monthly rent',
        'include qa-sub.bean"',
        "  Expenses:Food:Groceries  1.00 USD",
        "  Assets:Bank:Checking",
        'include "txns/2025.bean"',
        'include "txns/2026.bean"',
        "",
      ].join("\n"),
    );
  });
});
