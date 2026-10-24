import fs from "fs";
import path from "path";

// w21/1000: the expand chevron is an 18 by 14 pt slot inside a row that opens
// Account detail; with 12 pt of slop it was about 42 by 38, and a near miss
// navigated away instead of toggling the group.
describe("the account table's expand chevron", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "account-table.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("has a 44 by 44 pt target, from its slot and glyph size", () => {
    expect(source.includes("constCHEVRON_SIZE=14;")).toBe(true);
    expect(source.includes("constINDENT_STEP=18;")).toBe(true);
    expect(
      source.includes(
        "constCHEVRON_HIT_SLOP={top:(iconActionSize-CHEVRON_SIZE)/2,bottom:(iconActionSize-CHEVRON_SIZE)/2,left:(iconActionSize-INDENT_STEP)/2,right:(iconActionSize-INDENT_STEP)/2,};",
      ),
    ).toBe(true);
  });

  it("uses that slop on the toggle", () => {
    expect(source.includes("hitSlop={CHEVRON_HIT_SLOP}")).toBe(true);
    expect(source.includes("hitSlop={{top:12")).toBe(false);
  });
});
