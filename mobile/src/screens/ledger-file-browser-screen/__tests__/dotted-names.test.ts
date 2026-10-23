import { checkLedgerFileName, listingHasFile } from "../utils";

// w21/275: New File refused any name with a dot, though the dialog says .bean
// is added when the extension is omitted.
describe("a dot inside a new file's name", () => {
  it("is part of the name, and .bean is added", () => {
    for (const [typed, made] of [
      ["2024.q1", "2024.q1.bean"],
      ["v1.2 notes", "v1.2 notes.bean"],
      ["J.Smith accounts", "J.Smith accounts.bean"],
      ["Jan. expenses", "Jan. expenses.bean"],
      ["sub/2024.q1", "sub/2024.q1.bean"],
      ["notes.", "notes.bean"],
      // w21/429: a short word after the dot is part of the name too.
      ["Mr.Smith", "Mr.Smith.bean"],
      ["J.Smith", "J.Smith.bean"],
      ["budget.march", "budget.march.bean"],
      ["2024.Q", "2024.Q.bean"],
      ["acme.inc", "acme.inc.bean"],
      ["archive.old", "archive.old.bean"],
    ]) {
      expect(checkLedgerFileName(typed)).toEqual({ ok: true, filename: made });
    }
  });

  it("still refuses another explicit extension", () => {
    for (const typed of [
      "notes.txt",
      "data.csv",
      "sub/readme.md",
      "NOTES.TXT",
      "export.xlsx",
      "scan.pdf",
    ]) {
      expect(checkLedgerFileName(typed)).toEqual({
        ok: false,
        issue: "extension",
      });
    }
  });

  it("keeps .bean and .beancount names as typed", () => {
    expect(checkLedgerFileName("2024.q1.bean")).toEqual({
      ok: true,
      filename: "2024.q1.bean",
    });
    expect(checkLedgerFileName("a.BEANCOUNT")).toEqual({
      ok: true,
      filename: "a.BEANCOUNT",
    });
  });
});

// w21/589: Files sorted names as plain text, so "qa-10.bean" listed before
// "qa-2.bean" and month-numbered books read 1, 10, 11, 12, 2, 3.
describe("sortEntries in natural order", () => {
  const { sortEntries } = require("../utils");
  const entry = (name: string, type = "file") => ({
    name,
    type,
    path: name,
  });
  const names = (list: { name: string }[]) =>
    sortEntries(list).map((e: { name: string }) => e.name);

  it("orders numbered names numerically", () => {
    expect(
      names(
        ["12.bean", "2.bean", "10.bean", "1.bean", "3.bean", "11.bean"].map(
          (n) => entry(n),
        ),
      ),
    ).toEqual(["1.bean", "2.bean", "3.bean", "10.bean", "11.bean", "12.bean"]);
    expect(
      names([entry("main.bean"), entry("qa-10.bean"), entry("qa-2.bean")]),
    ).toEqual(["main.bean", "qa-2.bean", "qa-10.bean"]);
  });

  it("keeps folders first, and plain names alphabetical", () => {
    expect(
      names([
        entry("b.bean"),
        entry("2026", "dir"),
        entry("a.bean"),
        entry("books", "dir"),
      ]),
    ).toEqual(["2026", "books", "a.bean", "b.bean"]);
  });
});

// w21/769: a trailing dot added the extension a second time, and let a refused
// extension through.
describe("a new-file name ending in a dot", () => {
  it("drops the dot before the extension is judged", () => {
    expect(checkLedgerFileName("qa20261020.bean.")).toEqual({
      ok: true,
      filename: "qa20261020.bean",
    });
    expect(checkLedgerFileName("qa20261020.beancount.")).toEqual({
      ok: true,
      filename: "qa20261020.beancount",
    });
    expect(checkLedgerFileName("notes.")).toEqual({
      ok: true,
      filename: "notes.bean",
    });
  });

  it("refuses a refused extension however many dots follow it", () => {
    expect(checkLedgerFileName("qa20261020.txt.").ok).toBe(false);
    expect(checkLedgerFileName("qa20261020.txt..").ok).toBe(false);
  });
});

// w21/770: "Main" beside main.bean was offered, as were a decomposed "café"
// and a name with a zero-width space; macOS and Windows keep one of each pair.
describe("a new file named like an existing one but for case or form", () => {
  const existing = [
    "main.bean",
    "qa20261020-notes.bean",
    "qa20261020-caf\u00e9.bean",
  ];

  it("is refused as existing", () => {
    for (const typed of [
      "Main",
      "QA20261020-Notes",
      "qa20261020-cafe\u0301",
      "main\u200b",
    ]) {
      expect([typed, checkLedgerFileName(typed, existing).ok]).toEqual([
        typed,
        false,
      ]);
    }
    expect(checkLedgerFileName("main", existing).ok).toBe(false);
    expect(checkLedgerFileName("notes", existing).ok).toBe(true);
  });

  it("is found in a target folder's listing too", () => {
    const listing = [{ path: "sub/notes.bean", type: "file" }];
    expect(listingHasFile(listing, "sub/Notes.bean")).toBe(true);
    expect(listingHasFile(listing, "sub/other.bean")).toBe(false);
  });
});
