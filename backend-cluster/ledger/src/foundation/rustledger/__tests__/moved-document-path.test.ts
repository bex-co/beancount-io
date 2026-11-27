import { withDocumentPathFor } from "../moved-document-path";

/**
 * w31/133: a relative `document` filename resolves against the folder of the
 * file that declares it, so an entry moved to another folder has it written
 * for that folder, naming the same repository file.
 */
describe("withDocumentPathFor", () => {
  const files = new Set([
    "books/receipt.txt",
    "receipt.txt",
    "shared/s.pdf",
    'books/we"ird\\x.txt',
  ]);
  const exists = (path: string) => files.has(path);
  const header = (filename: string, rest = "") =>
    `2026-08-30 document Assets:Cash "${filename}"${rest}`;

  it.each([
    ["books/docs.bean", "main.bean", "receipt.txt", "books/receipt.txt"],
    ["books/docs.bean", "books/sub/x.bean", "receipt.txt", "../receipt.txt"],
    ["books/docs.bean", "other/x.bean", "receipt.txt", "../books/receipt.txt"],
    ["books/docs.bean", "main.bean", "./receipt.txt", "./books/receipt.txt"],
    ["books/docs.bean", "main.bean", "../shared/s.pdf", "shared/s.pdf"],
    ["main.bean", "books/x.bean", "receipt.txt", "../receipt.txt"],
  ])("moves %s's entry to %s: %p reads %p", (from, to, target, written) => {
    expect(withDocumentPathFor(header(target), from, to, exists)).toBe(
      header(written),
    );
  });

  it("keeps the date spelling, spacing, tags, links, comment and line ending", () => {
    const text = [
      '2026/8/30\tdocument  Assets:Cash   "receipt.txt" #trip ^r1 ; kept\r',
      '  note: "x"\r',
    ].join("\n");
    expect(withDocumentPathFor(text, "books/d.bean", "main.bean", exists)).toBe(
      text.replace('"receipt.txt"', '"books/receipt.txt"'),
    );
  });

  it("decodes the filename's escapes and writes the new one escaped", () => {
    expect(
      withDocumentPathFor(
        '2026-08-30 document Assets:Cash "we\\"ird\\\\x.txt"',
        "books/d.bean",
        "main.bean",
        exists,
      ),
    ).toBe('2026-08-30 document Assets:Cash "books/we\\"ird\\\\x.txt"');
  });

  it.each([
    ["the same folder", header("receipt.txt"), "books/d.bean", "books/e.bean"],
    [
      "a root-anchored filename",
      header("/books/receipt.txt"),
      "books/d.bean",
      "main.bean",
    ],
    ["a URL", header("https://example.com/r.txt"), "books/d.bean", "main.bean"],
    [
      "a filename that names no file",
      header("missing.txt"),
      "books/d.bean",
      "main.bean",
    ],
    [
      "a filename outside the repository",
      header("../../r.txt"),
      "books/d.bean",
      "main.bean",
    ],
    [
      "a filename that resolves the same",
      header("../shared/s.pdf"),
      "a/d.bean",
      "b/e.bean",
    ],
    ["an empty filename", header(""), "books/d.bean", "main.bean"],
    [
      "a note",
      '2026-08-30 note Assets:Cash "receipt.txt"',
      "books/d.bean",
      "main.bean",
    ],
    [
      "a transaction",
      '2026-08-30 * "receipt.txt"\n  Assets:Cash',
      "books/d.bean",
      "main.bean",
    ],
    [
      "an unclosed filename",
      '2026-08-30 document Assets:Cash "receipt.txt',
      "books/d.bean",
      "main.bean",
    ],
  ])("leaves %s as written", (_label, text, from, to) => {
    expect(withDocumentPathFor(text, from, to, exists)).toBe(text);
  });
});
