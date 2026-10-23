import { selectSourceSlice, sourceKind } from "../select-source-slice";

// w21/660: the amortize source has a slice but no parsed entry.
describe("selectSourceSlice", () => {
  it("returns the written text when the entry did not parse", () => {
    expect(
      selectSourceSlice(
        { slice: '2026-06-01 * "QA Insurer"\n  A  1 USD\n' },
        false,
      ),
    ).toBe('2026-06-01 * "QA Insurer"\n  A  1 USD');
  });

  it("leaves a parsed entry to the normal detail", () => {
    expect(selectSourceSlice({ slice: "2026-06-01 *" }, true)).toBe(null);
  });

  it("has nothing to show without text", () => {
    expect(selectSourceSlice({ slice: "  " }, false)).toBe(null);
    expect(selectSourceSlice(null, false)).toBe(null);
  });
});

// w21/841: a padding entry's source is a pad line, not a transaction.
describe("sourceKind", () => {
  it("places a transaction by its flag or txn", () => {
    for (const head of [
      '2026-06-01 * "x"',
      '2026-06-01 ! "x"',
      "2026-06-01 txn",
      '2026-06-01 P "x"',
    ]) {
      expect(sourceKind(head)).toBe("transaction");
    }
  });

  it("names any other directive by its label key", () => {
    expect(sourceKind("2026-10-21 pad Assets:Cash Equity:Opening")).toBe("pad");
    expect(sourceKind("2026-10-21 open Assets:Cash")).toBe("open");
    expect(sourceKind('2026-10-21 custom "budget" X')).toBe("custom");
  });

  it("returns null for text it cannot place", () => {
    expect(sourceKind("; a comment")).toBe(null);
    expect(sourceKind("2026-10-21 unknown thing")).toBe(null);
  });
});
