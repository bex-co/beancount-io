import type { DirectiveJson, FileMap } from "@rustledger/wasm";
import {
  buildEntrySourceDetailsMap,
  buildEntrySourceLocationMap,
  buildSourceDetailsProbe,
  deleteSliceFromFile,
  entryBalances,
  findEntrySlice,
  findEntrySliceBySourceSha,
  normalizeSliceReplacement,
  replaceSliceInFile,
  replacementLineEnding,
  servedReplacementSlice,
  servedSliceText,
  sliceSha256,
  sourceDetailsFromProbe,
  splitIntoBlocks,
} from "../source-slice";
import { entryIdFor, hashEntry } from "../entry-hash";
import { bookedBlockParserFromModule } from "../booked-block-parser";
import golden from "./source-slice.golden.json";

/**
 * Golden-parity tests for the source-slice module.
 *
 * `source-slice.golden.json` carries, for one representative multi-file ledger:
 *   - `files` / `entryPoint`: the raw FileMap;
 *   - `entries[]`: for every entry, the `hash` ({@link entryBalances}'s
 *     `exclude_meta` `hashEntry` value), the exact `slice` text + `sha256`, and
 *     the `before`/`after` context balances — all captured from the REAL Python
 *     fava-slim `SourceSliceModule.context` (via `beancount-ledger/.venv`);
 *   - `delete_groceries` / `update_groceries`: the byte-exact new file content
 *     the real Python `delete_source_slice` / `update_source_slice` produced;
 *   - `fullDirectives`: the full booked ledger `DirectiveJson[]` from the real
 *     `@rustledger/wasm` engine (`Ledger.fromFiles(...).getDirectives()`), the
 *     input to `entryBalances`;
 *   - `blockParses`: a `blockText -> DirectiveJson` map captured by running the
 *     real WASM `parse()` on each split block — the injected `BlockParser` for
 *     `findEntrySlice`, so these unit tests stay off the live WASM path (kept for
 *     `scripts/verify-rustledger.ts`) while still asserting against real engine
 *     output.
 */

interface GoldenEntry {
  hash: string;
  type: string;
  slice: string;
  sha256: string;
  before: Record<string, string[]> | null;
  after: Record<string, string[]> | null;
}

interface Golden {
  files: FileMap;
  entryPoint: string;
  entries: GoldenEntry[];
  delete_groceries: { hash: string; sha256: string; new_main_content: string };
  update_groceries: {
    hash: string;
    sha256: string;
    new_content: string;
    new_sha256: string;
    new_main_content: string;
  };
  fullDirectives: DirectiveJson[];
  blockParses: Record<string, DirectiveJson>;
  costSpecCases: Array<{
    source: string;
    rawDirective: DirectiveJson;
    bookedDirective: DirectiveJson;
  }>;
}

const data = golden as unknown as Golden;

/** Injected block parser backed by the captured real-WASM per-block parses. */
const parseBlock = (blockText: string): DirectiveJson[] => {
  const directive = data.blockParses[blockText];
  return directive ? [directive] : [];
};

const groceries = data.entries.find(
  (e) => e.type === "Transaction" && e.slice.includes("Groceries"),
)!;
const salary = data.entries.find(
  (e) => e.type === "Transaction" && e.slice.includes('"Salary"'),
)!;
const buyStock = data.entries.find(
  (e) => e.type === "Transaction" && e.slice.includes("Buy stock"),
)!;
const balanceEntry = data.entries.find((e) => e.type === "Balance")!;
const noteEntry = data.entries.find((e) => e.type === "Note")!;

describe("splitIntoBlocks", () => {
  it("splits the entry file into dated + keyword blocks, skipping blanks", () => {
    const blocks = splitIntoBlocks(data.files["main.beancount"]);
    // option, include, 4 dated txns/directives + balance/note/event = 8 dated.
    const dated = blocks.filter((b) => b.isDated);
    expect(dated).toHaveLength(6);
    // The first two blocks are the option + include keyword lines.
    expect(blocks[0].isDated).toBe(false);
    expect(blocks[0].text).toBe('option "operating_currency" "USD"');
    expect(blocks[1].text).toBe('include "accounts.beancount"');
  });

  it("does not include trailing blank lines in a block (fava _find_entry_lines)", () => {
    const blocks = splitIntoBlocks(data.files["main.beancount"]);
    const salaryBlock = blocks.find((b) => b.text.includes("Salary"))!;
    expect(salaryBlock.text).toBe(salary.slice);
    // The line after the block must be the blank separator.
    const lines = data.files["main.beancount"].split("\n");
    expect(lines[salaryBlock.endLine]).toBe("");
  });

  it("treats a whitespace-only line as a blank block terminator", () => {
    const blocks = splitIntoBlocks(
      '2024-01-01 * "one"\n  Assets:Cash  1 USD\n   \n  Expenses:Food -1 USD\n',
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('2024-01-01 * "one"\n  Assets:Cash  1 USD');
  });
});

/** Lines inside a quoted string are content, not block layout (w4/m34). */
describe("splitIntoBlocks — multiline strings", () => {
  const texts = (source: string) =>
    splitIntoBlocks(source).map((block) => block.text);

  it.each([
    ["an unindented line", '2024-03-01 note Assets:Cash "one\ntwo\nthree"'],
    ["a blank line", '2024-03-01 note Assets:Cash "one\n\ntwo"'],
    [
      "a date-like line",
      '2024-03-01 note Assets:Cash "one\n2024-03-02 open Assets:Phantom"',
    ],
    ["an indented line", '2024-03-01 note Assets:Cash "one\n  two"'],
  ])("keeps %s inside the literal in its block", (_case, note) => {
    const source = `${note}\n\n2024-03-05 note Assets:Cash "after"\n`;
    expect(texts(source)).toEqual([
      note,
      '2024-03-05 note Assets:Cash "after"',
    ]);
  });

  it("ends the header after a multiline narration and keeps its postings", () => {
    const txn = [
      '2024-03-09 * "Payee" "two-line',
      'narration"',
      "  Expenses:Food   1.25 USD",
      "  Assets:Cash",
    ].join("\n");
    const [block] = splitIntoBlocks(`${txn}\n`);
    expect(block.text).toBe(txn);
    expect(block.headerEndLine).toBe(1);
    expect(block.endLine).toBe(4);
  });

  it("honors escaped quotes and backslashes", () => {
    const note = '2024-03-01 note Assets:Cash "say \\"hi\\"\nC:\\\\dir\\\\"';
    expect(texts(`${note}\n2024-03-02 note Assets:Cash "next"`)).toEqual([
      note,
      '2024-03-02 note Assets:Cash "next"',
    ]);
  });

  it("ignores a quote inside a comment", () => {
    const source =
      '2024-03-01 open Assets:Cash ; an "unclosed comment\n2024-03-02 note Assets:Cash "x"';
    expect(texts(source)).toHaveLength(2);
  });

  it("keeps CRLF line endings inside the block text", () => {
    const note = '2024-03-01 note Assets:Cash "one\r\ntwo"\r';
    expect(texts(`${note}\n\r\n2024-03-02 note Assets:Cash "x"`)[0]).toBe(note);
  });

  it("falls back to the line rule when a quote never closes", () => {
    const source = [
      '2024-03-01 note Assets:Cash "never closed',
      "",
      '2024-03-02 note Assets:Cash "fine"',
    ].join("\n");
    expect(texts(source)).toEqual([
      '2024-03-01 note Assets:Cash "never closed',
      '2024-03-02 note Assets:Cash "fine"',
    ]);
  });

  it("deletes and replaces the whole multiline block, keeping neighbors", () => {
    const source = [
      '2024-03-01 note Assets:Cash "keep before"',
      "",
      '2024-03-02 note Assets:Cash "one',
      "",
      'two"',
      "",
      '2024-03-03 note Assets:Cash "keep after"',
      "",
    ].join("\n");
    const block = splitIntoBlocks(source)[1];
    // One separator goes with the entry (w23/055).
    expect(deleteSliceFromFile(source, block.startLine, block.endLine)).toBe(
      [
        '2024-03-01 note Assets:Cash "keep before"',
        "",
        '2024-03-03 note Assets:Cash "keep after"',
        "",
      ].join("\n"),
    );
    expect(
      replaceSliceInFile(
        source,
        block.startLine,
        block.endLine,
        '2024-03-02 note Assets:Cash "edited"',
      ),
    ).toBe(
      [
        '2024-03-01 note Assets:Cash "keep before"',
        "",
        '2024-03-02 note Assets:Cash "edited"',
        "",
        '2024-03-03 note Assets:Cash "keep after"',
        "",
      ].join("\n"),
    );
  });
});

describe("single-parse source details probe", () => {
  it("places the marker after a multiline header, outside the literal", () => {
    const source = [
      '2024-03-01 note Assets:Cash "one',
      "",
      'two"',
      '2024-03-02 * "Payee" "multi',
      'line"',
      "  Assets:Cash  1 USD",
      "  Expenses:Food",
      "",
    ].join("\n");
    const probe = buildSourceDetailsProbe({ "main.bean": source });
    const marker = (n: number) => `  ${probe.markerKey}: "${n}"`;
    expect(probe.files["main.bean"].split("\n")).toEqual([
      '2024-03-01 note Assets:Cash "one',
      "",
      'two"',
      marker(0),
      '2024-03-02 * "Payee" "multi',
      'line"',
      marker(1),
      "  Assets:Cash  1 USD",
      "  Expenses:Food",
      "",
    ]);
    expect(probe.detailsByMarker.get("1")).toEqual({
      filename: "main.bean",
      lineno: 4,
    });
  });

  it("preserves line provenance and duplicate occurrence ids", () => {
    const files = {
      "main.bean": [
        "2024-01-01 open Assets:Cash USD",
        "",
        "2024-01-01 open Assets:Cash USD",
        "",
      ].join("\n"),
    };
    const probe = buildSourceDetailsProbe(files);
    const markers = [
      ...probe.files["main.bean"].matchAll(
        new RegExp(`  ${probe.markerKey}: "([^"]+)"`, "gu"),
      ),
    ].map((match) => match[1]);
    const directives: DirectiveJson[] = markers.map((marker) => ({
      type: "open",
      date: "2024-01-01",
      account: "Assets:Cash",
      currencies: ["USD"],
      meta: { [probe.markerKey]: marker },
    }));

    const details = sourceDetailsFromProbe(directives, probe);
    const base = hashEntry(directives[0]);
    expect(details.get(base)).toEqual({ filename: "main.bean", lineno: 1 });
    expect(details.get(`${base}:1`)).toEqual({
      filename: "main.bean",
      lineno: 3,
    });
  });
});

// w21/655: Beancount gives a note its inline tags and links and gives a note or
// document the tags `pushtag` holds; rustledger's JSON carries none of them.
describe("source probe syntax for notes and pushed tags", () => {
  it("recovers a note's tags and links, and pushed tags until poptag", () => {
    const source = [
      "2024-01-01 open Assets:Cash",
      "pushtag #trip",
      '2024-02-01 note Assets:Cash "dispute filed" #dispute ^case-42 ; #not-a-tag',
      '2024-02-02 document Assets:Cash "r.pdf"',
      '2024-02-03 * "coffee"',
      "  Assets:Cash -1 USD",
      "  Expenses:Food",
      "poptag #trip",
      '2024-02-04 note Assets:Cash "after"',
      "",
    ].join("\n");
    const probe = buildSourceDetailsProbe({ "main.bean": source });
    const byLine = new Map(
      [...probe.detailsByMarker.values()].map((detail) => [
        detail.lineno,
        detail,
      ]),
    );

    expect(byLine.get(3)).toMatchObject({
      syntaxTags: ["dispute", "trip"],
      syntaxLinks: ["case-42"],
    });
    expect(byLine.get(4)).toMatchObject({ syntaxTags: ["trip"] });
    expect(byLine.get(4)?.syntaxLinks).toBeUndefined();
    // A transaction's pushed tags are the engine's; the probe adds none.
    expect(byLine.get(5)?.syntaxTags).toBeUndefined();
    expect(byLine.get(9)?.syntaxTags).toBeUndefined();
  });
});

describe("findEntrySlice — Fava parity", () => {
  it("locates each entry's slice + sha256 byte-for-byte", () => {
    for (const entry of data.entries) {
      const found = findEntrySlice(
        data.files,
        data.entryPoint,
        entry.hash,
        parseBlock,
      );
      expect(found).not.toBeNull();
      expect(found!.slice).toBe(entry.slice);
      expect(found!.sha256).toBe(entry.sha256);
    }
  });

  it("locates entries in the included accounts.beancount file", () => {
    const openEntry = data.entries.find((e) => e.type === "Open")!;
    const found = findEntrySlice(
      data.files,
      data.entryPoint,
      openEntry.hash,
      parseBlock,
    );
    expect(found).not.toBeNull();
    expect(found!.file).toBe("accounts.beancount");
    expect(found!.slice).toBe(openEntry.slice);
  });

  it("returns null for an unknown hash", () => {
    const found = findEntrySlice(
      data.files,
      data.entryPoint,
      "deadbeefdeadbeefdeadbeefdeadbeef",
      parseBlock,
    );
    expect(found).toBeNull();
  });
});

describe("findEntrySlice — booked total/compound costs", () => {
  it.each(data.costSpecCases)(
    "locates $bookedDirective.narration after isolated-block booking",
    ({ source, rawDirective, bookedDirective }) => {
      const free = jest.fn();
      const parseBooked = bookedBlockParserFromModule({
        Ledger: {
          fromFiles: () => ({
            getDirectives: () => [bookedDirective],
            free,
          }),
        },
      } as never);
      const bookedHash = hashEntry(bookedDirective);

      // This is the regression: mod.parse() returns the raw CostSpec and its
      // hash does not match the full-ledger booked directive.
      expect(hashEntry(rawDirective)).not.toBe(bookedHash);
      expect(
        findEntrySlice(
          { "main.bean": source },
          "main.bean",
          bookedHash,
          parseBooked,
        )?.slice,
      ).toBe(source);
      expect(free).toHaveBeenCalledTimes(1);
    },
  );
});

describe("buildEntrySourceLocationMap", () => {
  it("restores beancount filename/lineno metadata in entry-id order", () => {
    const locations = buildEntrySourceLocationMap(
      data.files,
      data.entryPoint,
      parseBlock,
    );
    const expected = findEntrySlice(
      data.files,
      data.entryPoint,
      salary.hash,
      parseBlock,
    )!;

    expect(locations.get(salary.hash)).toEqual({
      filename: expected.file,
      lineno: expected.startLine + 1,
    });
  });

  it("recovers inline Document tags/links omitted by the WASM wire", () => {
    const document: DirectiveJson = {
      type: "document",
      date: "2024-02-01",
      account: "Assets:Cash",
      path: "receipt.pdf",
    };
    const block =
      '2024-02-01 document Assets:Cash "receipt.pdf" #receipt#tax ^paper^scan ; #comment';
    const details = buildEntrySourceDetailsMap(
      { "main.bean": `${block}\n` },
      "main.bean",
      (text) => (text === block ? [document] : []),
    );

    expect(details.get(hashEntry(document))).toEqual({
      filename: "main.bean",
      lineno: 1,
      syntaxTags: ["receipt", "tax"],
      syntaxLinks: ["paper", "scan"],
    });
  });

  it("can restrict source recovery to Document blocks", () => {
    const document: DirectiveJson = {
      type: "document",
      date: "2024-02-01",
      account: "Assets:Cash",
      path: "receipt.pdf",
    };
    const documentBlock =
      '2024-02-01 document Assets:Cash "receipt.pdf" #receipt';
    const parsedBlocks: string[] = [];
    const details = buildEntrySourceDetailsMap(
      {
        "main.bean": ["2000-01-01 open Assets:Cash", documentBlock].join("\n"),
      },
      "main.bean",
      (block) => {
        parsedBlocks.push(block);
        return block === documentBlock ? [document] : [];
      },
      { syntaxOnly: true },
    );

    expect(parsedBlocks).toEqual([documentBlock]);
    expect([...details.values()]).toEqual([
      {
        filename: "main.bean",
        lineno: 2,
        syntaxTags: ["receipt"],
      },
    ]);
  });
});

describe("occurrence disambiguation (two identical entries)", () => {
  const dupTxn: DirectiveJson = {
    type: "transaction",
    date: "2024-01-01",
    flag: "*",
    narration: "coffee",
    tags: [],
    links: [],
    postings: [
      { account: "Expenses:Coffee", units: { number: "5", currency: "USD" } },
      { account: "Assets:Cash", units: { number: "-5", currency: "USD" } },
    ],
  };
  const blockText =
    '2024-01-01 * "coffee"\n  Expenses:Coffee   5 USD\n  Assets:Cash      -5 USD';
  // Two byte-identical blocks in one file, separated by a blank line.
  const dupFiles: FileMap = { "main.bean": `${blockText}\n\n${blockText}\n` };
  const dupParse = (t: string): DirectiveJson[] =>
    t === blockText ? [dupTxn] : [];
  const base = hashEntry(dupTxn);

  it("findEntrySlice(base) returns the FIRST occurrence", () => {
    const found = findEntrySlice(dupFiles, "main.bean", base, dupParse);
    expect(found?.startLine).toBe(0);
  });

  it("findEntrySlice(base:1) returns the SECOND occurrence", () => {
    const found = findEntrySlice(dupFiles, "main.bean", `${base}:1`, dupParse);
    expect(found?.startLine).toBe(4);
    // Both byte-identical source blocks are in the same file.
    expect(found?.localOccurrence).toBe(1);
  });

  it("findEntrySlice(base:2) returns null when there is no third occurrence", () => {
    expect(
      findEntrySlice(dupFiles, "main.bean", `${base}:2`, dupParse),
    ).toBeNull();
  });

  it("entryBalances(base:1) walks the stream up to the SECOND duplicate", () => {
    // Two identical txns in stream order; base:1 targets the second, so its
    // `before` reflects the FIRST duplicate's postings (not an empty inventory).
    const balances = entryBalances([dupTxn, dupTxn], `${base}:1`);
    expect(balances?.before["Assets:Cash"]).toEqual(["-5 USD"]);
    expect(balances?.before["Expenses:Coffee"]).toEqual(["5 USD"]);
    // The first occurrence sees an empty inventory before it.
    const first = entryBalances([dupTxn, dupTxn], base);
    expect(first?.before["Assets:Cash"]).toEqual([]);
  });
});

describe("cross-file duplicate: local occurrence for single-file re-location (#2)", () => {
  const dupTxn: DirectiveJson = {
    type: "transaction",
    date: "2024-01-01",
    flag: "*",
    narration: "coffee",
    tags: [],
    links: [],
    postings: [
      { account: "Expenses:Coffee", units: { number: "5", currency: "USD" } },
      { account: "Assets:Cash", units: { number: "-5", currency: "USD" } },
    ],
  };
  const blockText =
    '2024-01-01 * "coffee"\n  Expenses:Coffee   5 USD\n  Assets:Cash      -5 USD';
  // a.bean and b.bean EACH hold one identical entry (whole-ledger occ 0 and 1).
  const files: FileMap = {
    "main.bean": 'include "a.bean"\ninclude "b.bean"\n',
    "a.bean": `${blockText}\n`,
    "b.bean": `${blockText}\n`,
  };
  const dupParse = (t: string): DirectiveJson[] =>
    t === blockText ? [dupTxn] : [];
  const base = hashEntry(dupTxn);

  it("resolves base:1 to b.bean but with localOccurrence 0", () => {
    const found = findEntrySlice(files, "main.bean", `${base}:1`, dupParse);
    expect(found?.file).toBe("b.bean");
    // Within b.bean it's the 0th occurrence — NOT the whole-ledger index 1.
    expect(found?.localOccurrence).toBe(0);
  });

  it("re-locates in b.bean by localOccurrence 0 (was NotFound with the global id)", () => {
    // The CAS transform passes ONLY the target file. Searching it with the
    // whole-ledger id `base:1` finds nothing (b.bean has only occ 0) — the bug.
    expect(
      findEntrySlice(
        { "b.bean": files["b.bean"] },
        "b.bean",
        `${base}:1`,
        dupParse,
      ),
    ).toBeNull();
    // Searching with the LOCAL id `base` (occ 0) correctly finds it — the fix.
    const found = findEntrySlice(
      { "b.bean": files["b.bean"] },
      "b.bean",
      entryIdFor(base, 0),
      dupParse,
    );
    expect(found?.file).toBe("b.bean");
    expect(found?.startLine).toBe(0);
  });
});

describe("source scan follows include order, not alphabetical (#2)", () => {
  const dupTxn: DirectiveJson = {
    type: "transaction",
    date: "2024-01-01",
    flag: "*",
    narration: "coffee",
    tags: [],
    links: [],
    postings: [
      { account: "Expenses:Coffee", units: { number: "5", currency: "USD" } },
      { account: "Assets:Cash", units: { number: "-5", currency: "USD" } },
    ],
  };
  const blockText =
    '2024-01-01 * "coffee"\n  Expenses:Coffee   5 USD\n  Assets:Cash      -5 USD';
  // The reviewer's repro: z is INCLUDED first but sorts AFTER a. The WASM stream
  // numbers z→occ0, a→occ1 (include order). An alphabetical scan would invert it.
  const files: FileMap = {
    "main.bean": 'include "z.bean"\ninclude "a.bean"\n',
    "z.bean": `${blockText}\n`,
    "a.bean": `${blockText}\n`,
  };
  const dupParse = (t: string): DirectiveJson[] =>
    t === blockText ? [dupTxn] : [];
  const base = hashEntry(dupTxn);

  it("occ 0 resolves to the FIRST-INCLUDED file (z.bean), not alphabetically-first a.bean", () => {
    expect(findEntrySlice(files, "main.bean", base, dupParse)?.file).toBe(
      "z.bean",
    );
  });

  it("occ 1 resolves to the SECOND-INCLUDED file (a.bean)", () => {
    expect(
      findEntrySlice(files, "main.bean", `${base}:1`, dupParse)?.file,
    ).toBe("a.bean");
  });
});

describe("pushtag/poptag: block hash tracks file-level tag state (#1)", () => {
  // The reviewer's repro: two SEMANTICALLY-identical txns — the first gets #trip
  // from an enclosing `pushtag`, the second writes #trip explicitly. The WASM
  // full-parse gives both `tags: ["trip"]`, same hash H, ids H and H:1. An
  // isolated block parse of the FIRST loses the pushtag, so it hashes WITHOUT the
  // tag: pre-fix, only the explicit-tag block matched H (as occ 0), so H resolved
  // to the WRONG (second) entry and H:1 to null — silent data corruption on
  // edit/delete.
  const untaggedTxn: DirectiveJson = {
    type: "transaction",
    date: "2024-01-01",
    flag: "*",
    narration: "coffee",
    tags: [], // isolated block parse: pushtag not seen
    links: [],
    postings: [
      { account: "Expenses:Coffee", units: { number: "5", currency: "USD" } },
      { account: "Assets:Cash", units: { number: "-5", currency: "USD" } },
    ],
  };
  const taggedTxn: DirectiveJson = { ...untaggedTxn, tags: ["trip"] };

  const blockAText =
    '2024-01-01 * "coffee"\n  Expenses:Coffee   5 USD\n  Assets:Cash      -5 USD';
  const blockBText =
    '2024-01-01 * "coffee" #trip\n  Expenses:Coffee   5 USD\n  Assets:Cash      -5 USD';
  const files: FileMap = {
    "main.bean": `pushtag #trip\n${blockAText}\npoptag #trip\n${blockBText}\n`,
  };
  const parse = (t: string): DirectiveJson[] => {
    if (t === blockAText) return [untaggedTxn];
    if (t === blockBText) return [taggedTxn];
    return [];
  };
  // The id both entries share is the tag-INCLUSIVE hash (what the WASM emits).
  const base = hashEntry(taggedTxn);

  it("occ 0 resolves to the pushtag-tagged FIRST entry (was the second, pre-fix)", () => {
    const found = findEntrySlice(files, "main.bean", base, parse);
    expect(found?.startLine).toBe(1); // block A (under `pushtag #trip`)
    expect(found?.localOccurrence).toBe(0);
  });

  it("occ 1 resolves to the explicitly-tagged SECOND entry (was null, pre-fix)", () => {
    const found = findEntrySlice(files, "main.bean", `${base}:1`, parse);
    expect(found?.startLine).toBe(5); // block B (explicit #trip, after poptag)
    // The source text differs from block A (`#trip` is explicit here), so this
    // is the first occurrence of this exact source SHA in the file.
    expect(found?.localOccurrence).toBe(0);
  });

  it("poptag clears the tag so a later untagged entry is NOT spuriously matched", () => {
    // After `poptag #trip`, an untagged txn must hash WITHOUT #trip — so it does
    // not collide with the tagged base id.
    const filesWithTrailing: FileMap = {
      "main.bean": `pushtag #trip\n${blockAText}\npoptag #trip\n${blockAText}\n`,
    };
    // Only the pushtag-enclosed first copy matches the tagged base; the post-pop
    // untagged copy does not — so there is exactly one occurrence, not two.
    expect(
      findEntrySlice(filesWithTrailing, "main.bean", `${base}:1`, parse),
    ).toBeNull();
    expect(
      findEntrySlice(filesWithTrailing, "main.bean", base, parse)?.startLine,
    ).toBe(1);
  });
});

describe("sliceSha256 — Fava parity", () => {
  it("matches Python hashlib.sha256(entry_source) for every entry", () => {
    for (const entry of data.entries) {
      expect(sliceSha256(entry.slice)).toBe(entry.sha256);
    }
  });
});

describe("findEntrySliceBySourceSha — inventory-independent CAS relocation", () => {
  const sell =
    '2024-02-01 * "Sell"\n' +
    "  Assets:Broker  -5 HOOL {}\n" +
    "  Assets:Cash    600 USD\n" +
    "  Income:Gains";
  const sha = sliceSha256(sell);

  it("finds a lot-reducing source block after unrelated lines shift it", () => {
    const shifted = `; concurrent comment\n\n${sell}\n`;
    expect(
      findEntrySliceBySourceSha("sell.bean", shifted, sha, 0),
    ).toMatchObject({
      file: "sell.bean",
      slice: sell,
      startLine: 2,
      localOccurrence: 0,
    });
  });

  it("disambiguates byte-identical source blocks by local occurrence", () => {
    const duplicates = `${sell}\n\n${sell}\n`;
    expect(
      findEntrySliceBySourceSha("sell.bean", duplicates, sha, 1)?.startLine,
    ).toBe(5);
  });
});

describe("deleteSliceFromFile — Fava parity, minus one separator", () => {
  // Fava kept the blank lines on both sides of the deleted block; one of
  // them now goes with it, so its two adjacent blanks become one (w23/055).
  it("removes the block and the separator it leaves doubled", () => {
    const found = findEntrySlice(
      data.files,
      data.entryPoint,
      groceries.hash,
      parseBlock,
    )!;
    const newContent = deleteSliceFromFile(
      data.files["main.beancount"],
      found.startLine,
      found.endLine,
    );
    expect(newContent).toBe(
      data.delete_groceries.new_main_content.replace(
        "USD\n\n\n2024-02-01 balance",
        "USD\n\n2024-02-01 balance",
      ),
    );
  });
});

describe("replaceSliceInFile — Fava parity", () => {
  it("replaces the block with newContent + single trailing newline", () => {
    const found = findEntrySlice(
      data.files,
      data.entryPoint,
      groceries.hash,
      parseBlock,
    )!;
    const newContent = replaceSliceInFile(
      data.files["main.beancount"],
      found.startLine,
      found.endLine,
      data.update_groceries.new_content,
    );
    expect(newContent).toBe(data.update_groceries.new_main_content);
  });

  it("the updated entry's new sha256 matches Python (of the new content)", () => {
    expect(sliceSha256(data.update_groceries.new_content)).toBe(
      data.update_groceries.new_sha256,
    );
  });
});

describe("entryBalances — Fava parity", () => {
  it("computes before/after for a plain transaction", () => {
    const balances = entryBalances(data.fullDirectives, salary.hash);
    expect(balances).not.toBeNull();
    expect(balances!.before).toEqual(salary.before);
    expect(balances!.after).toEqual(salary.after);
  });

  it("computes before/after for the groceries transaction (running balance)", () => {
    const balances = entryBalances(data.fullDirectives, groceries.hash);
    expect(balances!.before).toEqual(groceries.before);
    expect(balances!.after).toEqual(groceries.after);
  });

  it("visualises at-cost lots as '{units} {cost, date}' for after", () => {
    const balances = entryBalances(data.fullDirectives, buyStock.hash);
    expect(balances!.before).toEqual(buyStock.before);
    expect(balances!.after).toEqual(buyStock.after);
    // Sanity: the HOOL lot renders with its booked cost + date.
    expect(balances!.after!["Assets:Brokerage"]).toEqual([
      "10 HOOL {100.00 USD, 2024-02-05}",
    ]);
  });

  it("returns after=null for a Balance directive", () => {
    const balances = entryBalances(data.fullDirectives, balanceEntry.hash);
    expect(balances).not.toBeNull();
    expect(balances!.before).toEqual(balanceEntry.before);
    expect(balances!.after).toBeNull();
  });

  it("returns null for a non-balance/non-transaction entry (e.g. Note)", () => {
    const balances = entryBalances(data.fullDirectives, noteEntry.hash);
    expect(balances).toBeNull();
  });

  it("returns null for an unknown hash", () => {
    const balances = entryBalances(
      data.fullDirectives,
      "deadbeefdeadbeefdeadbeefdeadbeef",
    );
    expect(balances).toBeNull();
  });
});

// w21/252: an edit in a CRLF file rewrote the entry with LF and left a blank
// line, and the checksum returned for it matched nothing a re-read served.
describe("replacing a slice keeps the file's line endings", () => {
  const crlf = [
    '2026-08-30 * "Veg" "Produce"',
    "  Expenses:Food  12.00 USD",
    "  Assets:Cash",
    "",
    '2026-08-31 * "Next"',
    "  Expenses:Food  1.00 USD",
    "  Assets:Cash",
    "",
  ].join("\r\n");

  const edited = [
    '2026-08-30 * "Veg" "Fresh produce"',
    "  Expenses:Food  12.00 USD",
    "  Assets:Cash",
  ];

  it("writes CRLF with no extra blank line when the editor sent LF and a trailing newline", () => {
    const [block] = splitIntoBlocks(crlf);
    const next = replaceSliceInFile(
      crlf,
      block.startLine,
      block.endLine,
      `${edited.join("\n")}\n`,
    );
    expect(next).toBe(
      [
        ...edited,
        "",
        '2026-08-31 * "Next"',
        "  Expenses:Food  1.00 USD",
        "  Assets:Cash",
        "",
      ].join("\r\n"),
    );
    // Every line ending is CRLF.
    expect(/(^|[^\r])\n/u.test(next)).toBe(false);
  });

  it("serves a checksum the next edit can present", () => {
    const [block] = splitIntoBlocks(crlf);
    const incoming = edited.join("\n");
    const next = replaceSliceInFile(
      crlf,
      block.startLine,
      block.endLine,
      incoming,
    );
    const [reread] = splitIntoBlocks(next);
    const stored = normalizeSliceReplacement(
      incoming,
      replacementLineEnding(crlf, block.startLine, block.endLine),
    );
    expect(sliceSha256(servedSliceText(stored))).toBe(sliceSha256(reread.text));
  });

  it("does the same for an LF file: a trailing newline adds no blank line", () => {
    const lf = [
      '2026-08-30 * "A"',
      "  Assets:Cash",
      "",
      '2026-08-31 * "B"',
      "  Assets:Cash",
      "",
    ].join("\n");
    const [block] = splitIntoBlocks(lf);
    const next = replaceSliceInFile(
      lf,
      block.startLine,
      block.endLine,
      '2026-08-30 * "A2"\n  Assets:Cash\n\n',
    );
    expect(next).toBe(
      [
        '2026-08-30 * "A2"',
        "  Assets:Cash",
        "",
        '2026-08-31 * "B"',
        "  Assets:Cash",
        "",
      ].join("\n"),
    );
    const [reread] = splitIntoBlocks(next);
    expect(
      sliceSha256(
        servedSliceText(
          normalizeSliceReplacement(
            '2026-08-30 * "A2"\n  Assets:Cash\n\n',
            "\n",
          ),
        ),
      ),
    ).toBe(sliceSha256(reread.text));
  });

  it("uses the replaced block's own ending in a mixed file", () => {
    const mixed = [
      '2026-08-30 * "A"\r',
      "  Assets:Cash\r",
      "",
      '2026-08-31 * "B"',
      "  Assets:Cash",
      "",
    ].join("\n");
    const blocks = splitIntoBlocks(mixed);
    expect(
      replacementLineEnding(mixed, blocks[0].startLine, blocks[0].endLine),
    ).toBe("\r\n");
    expect(
      replacementLineEnding(mixed, blocks[1].startLine, blocks[1].endLine),
    ).toBe("\n");
  });
});

// w23/055: deleting what an append wrote left its blank separators, so every
// add → delete cycle grew the file. These rebuild what the append writes.
describe("deleteSliceFromFile — add then delete restores the file", () => {
  const ORIGINAL =
    "2026-01-01 open Assets:Cash\n\n2026-01-02 open Expenses:Food\n";
  const TX1 = '2026-03-01 * "One"\n  Assets:Cash  -1 USD\n  Expenses:Food\n';
  const TX2 = '2026-03-02 * "Two"\n  Assets:Cash  -2 USD\n  Expenses:Food\n';
  const deleteBlocks = (text: string, blocks: string[]) => {
    // Bottom-to-top, as the delete transform applies them.
    const ranges = blocks
      .map((block) => {
        const before =
          text.slice(0, text.indexOf(block)).split("\n").length - 1;
        return [before, before + block.split("\n").length - 1] as const;
      })
      .sort((a, b) => b[0] - a[0]);
    return ranges.reduce(
      (content, [start, end]) => deleteSliceFromFile(content, start, end),
      text,
    );
  };

  it.each([
    ["one entry at the end", `${ORIGINAL}\n${TX1}\n`, [TX1]],
    ["two entries at the end", `${ORIGINAL}\n${TX1}\n${TX2}\n`, [TX1, TX2]],
    [
      "one entry between two",
      `2026-01-01 open Assets:Cash\n\n${TX1}\n2026-01-02 open Expenses:Food\n`,
      [TX1],
    ],
  ])("for %s", (_case, added, blocks) => {
    expect(deleteBlocks(added, blocks)).toBe(ORIGINAL);
  });

  it("keeps a comment directly above the entry", () => {
    const text = `2026-01-01 open Assets:Cash\n\n; why\n${TX1}\n2026-01-02 open Expenses:Food\n`;
    expect(deleteBlocks(text, [TX1])).toBe(
      "2026-01-01 open Assets:Cash\n\n; why\n\n2026-01-02 open Expenses:Food\n",
    );
  });

  it("drops a leading separator when the first entry goes", () => {
    expect(deleteBlocks(`${TX1}\n${ORIGINAL}`, [TX1])).toBe(ORIGINAL);
  });
});

// w21/813: Return after the last posting left an indent-only line, stored as
// a stray "  " line, and the checksum returned for the edit matched no read,
// so the entry looked removed. A column-0 comment beside the entry, and a
// one-line entry in a CRLF file, did the same.
describe("an edit with whitespace or a comment around the entry", () => {
  const lf = [
    '2026-10-20 * "Qa20261020 Cafe" "Lunch"',
    "  Expenses:Qa20261020:Food  12.00 USD",
    "  Assets:Qa20261020:Cash",
    "",
    '2026-10-21 * "Next"',
    "  Assets:Cash",
    "",
  ].join("\n");
  const entry = [
    '2026-10-20 * "Qa20261020 Cafe" "Lunch"',
    "  Expenses:Qa20261020:Food  13.00 USD",
    "  Assets:Qa20261020:Cash",
  ];
  /** The new file, and whether the returned checksum is a fresh read's. */
  const save = (fileText: string, incoming: string) => {
    const [block] = splitIntoBlocks(fileText);
    const next = replaceSliceInFile(
      fileText,
      block!.startLine,
      block!.endLine,
      incoming,
    );
    const stored = normalizeSliceReplacement(
      incoming,
      replacementLineEnding(fileText, block!.startLine, block!.endLine),
    );
    const served =
      servedReplacementSlice(
        next,
        block!.startLine,
        stored.split("\n").length,
      ) ?? servedSliceText(stored);
    const reread = splitIntoBlocks(next).find((candidate) =>
      candidate.text.startsWith("2026-10-20"),
    );
    return {
      next,
      matches: sliceSha256(served) === sliceSha256(reread!.text),
    };
  };

  it("stores no indent-only or blank line at either end", () => {
    for (const incoming of [
      `${entry.join("\n")}\n  `,
      `${entry.join("\n")}\n  \n  \n`,
      `\n  \n${entry.join("\n")}`,
    ]) {
      const { next, matches } = save(lf, incoming);
      expect([incoming, /\n[ \t]+\n/u.test(next)]).toEqual([incoming, false]);
      expect(next.startsWith(entry[0]!)).toBe(true);
      expect(matches).toBe(true);
    }
    // Spaces closing the last posting are its own and stay.
    expect(normalizeSliceReplacement("a\n  b  \n", "\n")).toBe("a\n  b  ");
  });

  it("returns the checksum a read serves beside a column-0 comment", () => {
    for (const incoming of [
      `; paid in cash\n${entry.join("\n")}`,
      `${entry.join("\n")}\n; paid in cash`,
    ]) {
      expect([incoming, save(lf, incoming).matches]).toEqual([incoming, true]);
    }
  });

  it("returns the checksum a read serves for a one-line CRLF entry", () => {
    const crlf = [
      "2026-10-20 open Assets:Cash",
      "",
      "2026-10-21 open Assets:Bank",
      "",
    ].join("\r\n");
    const [block] = splitIntoBlocks(crlf);
    const next = replaceSliceInFile(
      crlf,
      block!.startLine,
      block!.endLine,
      "2026-10-20 open Assets:Cash USD",
    );
    const stored = normalizeSliceReplacement(
      "2026-10-20 open Assets:Cash USD",
      "\r\n",
    );
    const [reread] = splitIntoBlocks(next);
    expect(
      sliceSha256(
        servedReplacementSlice(
          next,
          block!.startLine,
          stored.split("\n").length,
        ) ?? servedSliceText(stored),
      ),
    ).toBe(sliceSha256(reread!.text));
  });
});

// w21/845: a balance assertion checks the account and every subaccount.
describe("entryBalances for an assertion on a parent account", () => {
  const deposit: DirectiveJson = {
    type: "transaction",
    date: "2024-01-05",
    flag: "*",
    narration: "deposit",
    tags: [],
    links: [],
    postings: [
      {
        account: "Assets:Bank:Checking",
        units: { number: "100", currency: "USD" },
      },
      {
        account: "Equity:Opening",
        units: { number: "-100", currency: "USD" },
      },
    ],
  };
  const assertion: DirectiveJson = {
    type: "balance",
    date: "2024-01-10",
    account: "Assets:Bank",
    amount: { number: "100", currency: "USD" },
  };

  it("sums the subaccounts into the balance before", () => {
    const balances = entryBalances([deposit, assertion], hashEntry(assertion));
    expect(balances?.before["Assets:Bank"]).toEqual(["100 USD"]);
    expect(balances?.after).toBeNull();
  });

  it("does not take a sibling account that only shares a name prefix", () => {
    const sibling: DirectiveJson = {
      ...deposit,
      postings: [
        {
          account: "Assets:Banking",
          units: { number: "7", currency: "USD" },
        },
        deposit.type === "transaction" ? deposit.postings[1] : ({} as never),
      ],
    };
    const balances = entryBalances([sibling, assertion], hashEntry(assertion));
    expect(balances?.before["Assets:Bank"]).toEqual([]);
  });
});
