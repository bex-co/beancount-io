import type { DirectiveJson } from "@rustledger/wasm";
import { entryIdFor, hashEntry } from "../entry-hash";
import {
  inheritDirectiveSourceId,
  seedDirectiveSourceIds,
} from "../plugins/provenance";
import { resolveEntryIdAtSource } from "../updated-entry-id";

function txn(narration: string, amount: string): DirectiveJson {
  return {
    type: "transaction",
    date: "2024-03-01",
    flag: "*",
    narration,
    tags: [],
    links: [],
    postings: [
      { account: "Expenses:Food", units: { number: amount, currency: "USD" } },
      { account: "Assets:Cash", units: { number: `-${amount}`, currency: "USD" } },
    ],
  } as DirectiveJson;
}

describe("resolveEntryIdAtSource", () => {
  it("returns the entry whose block starts inside the replaced range", () => {
    const before = txn("coffee", "3.50");
    const edited = txn("coffee", "4.25");
    const after = txn("lunch", "12.00");
    const directives = [before, edited, after];
    // The edited block is 3 lines long and sits at 0-based line 4.
    const sourceDetails = {
      [hashEntry(before)]: { filename: "main.bean", lineno: 1 },
      [hashEntry(edited)]: { filename: "main.bean", lineno: 5 },
      [hashEntry(after)]: { filename: "main.bean", lineno: 9 },
    };

    expect(
      resolveEntryIdAtSource(
        { directives, sourceDetails },
        { file: "main.bean", startLine: 4, lineCount: 3 },
      ),
    ).toBe(hashEntry(edited));
  });

  it("ignores blocks in other files at the same lines", () => {
    const edited = txn("coffee", "4.25");
    const other = txn("coffee", "4.25");
    const directives = [other, edited];
    const base = hashEntry(edited);
    const sourceDetails = {
      [entryIdFor(base, 0)]: { filename: "other.bean", lineno: 1 },
      [entryIdFor(base, 1)]: { filename: "main.bean", lineno: 1 },
    };

    expect(
      resolveEntryIdAtSource(
        { directives, sourceDetails },
        { file: "main.bean", startLine: 0, lineCount: 3 },
      ),
    ).toBe(entryIdFor(base, 1));
  });

  it("picks the first dated block when the new content holds several", () => {
    const first = txn("coffee", "4.25");
    const second = txn("tea", "2.00");
    const directives = [first, second];
    const sourceDetails = {
      [hashEntry(first)]: { filename: "main.bean", lineno: 11 },
      [hashEntry(second)]: { filename: "main.bean", lineno: 15 },
    };

    expect(
      resolveEntryIdAtSource(
        { directives, sourceDetails },
        { file: "main.bean", startLine: 10, lineCount: 7 },
      ),
    ).toBe(hashEntry(first));
  });

  it("maps a plugin-rewritten entry to its public (post-plugin) ID", () => {
    const source = txn("rent", "100.00");
    const rewritten = txn("rent (amortized)", "50.00");
    seedDirectiveSourceIds([source]);
    inheritDirectiveSourceId(source, rewritten);
    const sourceDetails = {
      [hashEntry(source)]: { filename: "main.bean", lineno: 3 },
    };

    expect(
      resolveEntryIdAtSource(
        { directives: [rewritten], sourceDetails },
        { file: "main.bean", startLine: 2, lineCount: 3 },
      ),
    ).toBe(hashEntry(rewritten));
  });

  it("returns undefined when nothing dated parsed inside the range", () => {
    const only = txn("coffee", "4.25");
    const sourceDetails = {
      [hashEntry(only)]: { filename: "main.bean", lineno: 1 },
    };

    expect(
      resolveEntryIdAtSource(
        { directives: [only], sourceDetails },
        { file: "main.bean", startLine: 20, lineCount: 1 },
      ),
    ).toBeUndefined();
    expect(
      resolveEntryIdAtSource(
        { directives: [only] },
        { file: "main.bean", startLine: 0, lineCount: 1 },
      ),
    ).toBeUndefined();
  });
});
