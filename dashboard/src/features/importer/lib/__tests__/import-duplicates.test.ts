import { describe, expect, it } from "vitest";
import type { JournalTransaction } from "@/common/types/journal";
import { findLikelyDuplicates } from "../import-duplicates";

/** The note's two-row file, and the ledger after importing it once (w2/122). */
const ROWS = [
  { id: "a", date: "2026-09-02", amountDecimal: "-3.25" },
  { id: "b", date: "2026-09-03", amountDecimal: "-2.75" },
];

const booked = (
  date: string,
  number: string,
  account = "Assets:Cash",
  currency = "USD",
) =>
  ({
    date,
    postings: [
      { account, units: { number, currency } },
      { account: "Expenses:Food", units: { number: "1", currency } },
    ],
  }) as unknown as JournalTransaction;

describe("findLikelyDuplicates", () => {
  it("flags both rows of a file imported a second time", () => {
    const existing = [
      booked("2026-09-02", "-3.25"),
      booked("2026-09-03", "-2.75"),
    ];
    expect(findLikelyDuplicates(ROWS, existing, "Assets:Cash", "USD")).toEqual(
      new Set(["a", "b"]),
    );
  });

  it("matches an amount however it is spelled", () => {
    expect(
      findLikelyDuplicates(
        ROWS,
        [booked("2026-09-02", "-3.250")],
        "Assets:Cash",
        "USD",
      ),
    ).toEqual(new Set(["a"]));
  });

  it("needs the same day, source account, amount and currency", () => {
    for (const existing of [
      booked("2026-09-01", "-3.25"),
      booked("2026-09-02", "-3.24"),
      booked("2026-09-02", "-3.25", "Assets:Bank"),
      booked("2026-09-02", "-3.25", "Assets:Cash", "EUR"),
      booked("2026-09-02", "3.25"),
    ]) {
      expect(
        findLikelyDuplicates(ROWS, [existing], "Assets:Cash", "USD"),
      ).toEqual(new Set());
    }
  });

  it("matches one for one, so a second identical row stays new", () => {
    const rows = [
      { id: "first", date: "2026-09-02", amountDecimal: "-3.25" },
      { id: "second", date: "2026-09-02", amountDecimal: "-3.25" },
    ];
    expect(
      findLikelyDuplicates(
        rows,
        [booked("2026-09-02", "-3.25")],
        "Assets:Cash",
        "USD",
      ),
    ).toEqual(new Set(["first"]));
  });
});
