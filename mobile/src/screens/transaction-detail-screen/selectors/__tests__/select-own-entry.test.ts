import fs from "fs";
import path from "path";
import { holdGeneratedEntry, selectOwnEntry } from "../select-own-entry";
import type { JournalTransaction } from "../../../transactions-screen/types";

// w21/444: opening another transaction over a padding entry's stash made the
// padding screen ask the server for a context it cannot give.
const entry = (entry_hash: string, flag: string) =>
  ({ entry_hash, flag, type: "Transaction" }) as unknown as JournalTransaction;
const padding = entry("pad-1", "P");
const ordinary = entry("txn-1", "*");
const other = entry("txn-2", "*");

describe("holding a generated entry", () => {
  it("keeps a padding entry once another transaction is stashed over it", () => {
    let held = holdGeneratedEntry(null, padding);
    expect(held).toBe(padding);
    // The stash now holds something else for this route (null for it).
    held = holdGeneratedEntry(held, null);
    expect(held).toBe(padding);
    expect(selectOwnEntry(null, held, "pad-1")).toBe(padding);
  });

  it("does not hold an editable entry, whose context is the fresher copy", () => {
    expect(holdGeneratedEntry(null, ordinary)).toBe(null);
    expect(selectOwnEntry(null, null, "txn-1")).toBe(null);
  });

  it("serves only the route's own entry", () => {
    expect(selectOwnEntry(null, padding, "pad-2")).toBe(null);
    expect(selectOwnEntry(ordinary, padding, "txn-1")).toBe(ordinary);
    expect(selectOwnEntry(null, null, "pad-1")).toBe(null);
    // A newer stash for this route replaces the held one.
    expect(holdGeneratedEntry(padding, other)).toBe(padding);
  });
});

describe("the detail screen", () => {
  const source = fs
    .readFileSync(
      path.join(__dirname, "..", "..", "transaction-detail-screen.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "");

  // w21/745: a held entry's context is read too (one written with flag R has
  // a source), and a NOT_FOUND for one never found is no deletion.
  it("shows a held entry, and reads its not-found as generated, not gone", () => {
    expect(
      source.includes(
        "useTransactionContext({entryHash,ledgerId},!entryHash);",
      ),
    ).toBe(true);
    expect(
      source.includes(
        "const{isGenerated,gone:entryGone}=selectEntrySource({entry,sourced,notFound:isEntryGone(error),});",
      ),
    ).toBe(true);
    expect(source.includes("if(ownEntry){returnownEntry;}")).toBe(true);
  });
});
