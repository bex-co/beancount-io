import fs from "fs";
import path from "path";
import { journalRowKeys, mergeJournalPage } from "../merge-journal-page";

// Offset paging repeats a row when an entry is added between pages; the lists
// appended it as-is, showing the same transaction twice (w21/035).
const row = (entry_hash: string) => ({ entry_hash });
const PAGE_1 = [
  "farmers",
  "city-bus",
  "whole-foods",
  "sushi",
  "blue-bottle",
].map(row);

describe("mergeJournalPage", () => {
  it("keeps one copy of a row a shifted page repeats, and says so", () => {
    const shifted = [
      "blue-bottle",
      "trader-joes",
      "landlord",
      "acme",
      "visa",
    ].map(row);
    // An entry was added since the first page: the total grew from 5 to 6.
    const { data, overlapped } = mergeJournalPage(PAGE_1, shifted, {
      loaded: 5,
      page: 6,
    });
    expect(data.map((r) => r.entry_hash)).toEqual([
      "farmers",
      "city-bus",
      "whole-foods",
      "sushi",
      "blue-bottle",
      "trader-joes",
      "landlord",
      "acme",
      "visa",
    ]);
    expect(overlapped).toBe(true);
  });

  it("appends an ordinary next page untouched", () => {
    const next = ["trader-joes", "landlord"].map(row);
    expect(mergeJournalPage(PAGE_1, next)).toEqual({
      data: [...PAGE_1, ...next],
      overlapped: false,
    });
  });

  it("keeps rows that carry no hash", () => {
    const { data, overlapped } = mergeJournalPage(
      [{ entry_hash: null }],
      [{ entry_hash: null }],
    );
    expect(data.length).toBe(2);
    expect(overlapped).toBe(false);
  });

  it("reloads from the top in both paged lists when the list moved", () => {
    const read = (...parts: string[]) =>
      fs.readFileSync(path.join(__dirname, "..", "..", "..", ...parts), "utf8");
    const transactions = read("transactions-screen", "transactions-screen.tsx");
    expect(transactions.includes("mergeJournalPage(")).toBe(true);
    expect(
      transactions.includes(
        "if (listMoved) void refetch().catch(() => undefined);",
      ),
    ).toBe(true);
    const merchant = read(
      "merchant-detail-screen",
      "merchant-detail-screen.tsx",
    );
    expect(merchant.includes("mergeJournalPage(")).toBe(true);
    expect(
      merchant.includes(
        "if (listMoved) void refetchJournal().catch(() => undefined);",
      ),
    ).toBe(true);
  });
});

// w21/419: two identical entries share an entry_hash, and dropping the twin read
// as "the list moved": every page reloaded from the top, forever.
describe("identical twins", () => {
  it("are both kept when the total did not change", () => {
    const loaded = ["a", "coffee"].map(row);
    const page = ["coffee", "b"].map(row);
    const { data, overlapped } = mergeJournalPage(loaded, page, {
      loaded: 4,
      page: 4,
    });
    expect(data.map((r) => r.entry_hash)).toEqual([
      "a",
      "coffee",
      "coffee",
      "b",
    ]);
    expect(overlapped).toBe(false);
  });

  it("do not make a page look shifted when the totals are not given", () => {
    const { overlapped } = mergeJournalPage(
      ["coffee"].map(row),
      ["coffee"].map(row),
    );
    expect(overlapped).toBe(false);
  });

  it("still dedupe a repeat when the list really moved", () => {
    const { data, overlapped } = mergeJournalPage(
      ["a", "coffee"].map(row),
      ["coffee", "b"].map(row),
      { loaded: 4, page: 5 },
    );
    expect(data.map((r) => r.entry_hash)).toEqual(["a", "coffee", "b"]);
    expect(overlapped).toBe(true);
  });

  it("get a key each", () => {
    const rows = ["a", "coffee", "coffee", "b", "coffee"].map(row);
    const keys = journalRowKeys(rows);
    expect(rows.map((r) => keys.get(r))).toEqual([
      "a",
      "coffee",
      "coffee#1",
      "b",
      "coffee#2",
    ]);
  });

  it("are keyed in both paged lists", () => {
    const read = (...parts: string[]) =>
      fs.readFileSync(path.join(__dirname, "..", "..", "..", ...parts), "utf8");
    expect(
      read("transactions-screen", "transactions-screen.tsx").includes(
        "rowKeys.get(item) ?? item.entry_hash",
      ),
    ).toBe(true);
    expect(
      read("merchant-detail-screen", "merchant-detail-screen.tsx").includes(
        "rowKeys.get(item) ?? item.entry_hash",
      ),
    ).toBe(true);
  });
});

// w21/913: a delete elsewhere skipped a row, and a reorder repeated one.
describe("mergeJournalPage when the list moved without a repeated row", () => {
  it("reloads when the total shrank, though no hash repeats", () => {
    const next = ["landlord", "acme"].map(row);
    const merged = mergeJournalPage(PAGE_1, next, { loaded: 7, page: 6 });
    expect(merged.overlapped).toBe(true);
  });

  const placed = (entry_hash: string, lineno: number) => ({
    entry_hash,
    meta: { filename: "main.bean", lineno },
  });

  it("reloads when a same-total page opens on the last loaded row again", () => {
    const loaded = [placed("a", 1), placed("b", 2)];
    const merged = mergeJournalPage(loaded, [placed("b", 2), placed("c", 3)], {
      loaded: 3,
      page: 3,
    });
    expect(merged.overlapped).toBe(true);
    expect(merged.data.map((r) => r.entry_hash)).toEqual(["a", "b", "c"]);
  });

  it("still pages through a true twin, which sits on another line", () => {
    const loaded = [placed("a", 1), placed("coffee", 2)];
    const merged = mergeJournalPage(
      loaded,
      [placed("coffee", 9), placed("c", 3)],
      { loaded: 4, page: 4 },
    );
    expect(merged.overlapped).toBe(false);
    expect(merged.data.length).toBe(4);
  });
});
