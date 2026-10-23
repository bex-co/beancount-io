import { selectSourceSlice } from "../select-source-slice";

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
