import fs from "fs";
import path from "path";

import { gutter } from "../../../common/theme/spacing";
import { selectedPillRevealOffset } from "../reveal-offset";

describe("TimeRangePills overflow reachability", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "index.tsx"),
    "utf8",
  );

  it("renders every row inside a horizontal scroller, including the default", () => {
    // A centred plain View put both end pills beyond the screen at maximum
    // accessibility text, with no way to reach them.
    expect(source.includes("if (!scrollable)")).toBe(false);
    expect(source.includes("<View style={styles.row}>")).toBe(false);
    expect(/<ScrollView[\s\S]*?horizontal/.test(source)).toBe(true);
  });

  it("keeps a fitting default row centred across the viewport", () => {
    expect(
      /fitRow: \{\s*flexGrow: 1,/.test(source) &&
        source.includes("scrollable ? styles.scrollRow : styles.fitRow"),
    ).toBe(true);
  });

  it("leaves a selected pill alone when it is already visible", () => {
    expect(selectedPillRevealOffset({ x: 120, width: 40 }, 360)).toBe(null);
    expect(selectedPillRevealOffset({ x: 0, width: 360 }, 360)).toBe(null);
  });

  it("scrolls an overflowing selection into view with a gutter before it", () => {
    // Six enlarged pills ~90pt wide: `ALL` starts at 450 in a 358pt row.
    expect(selectedPillRevealOffset({ x: 450, width: 90 }, 358)).toBe(
      450 - gutter,
    );
    // A selection straddling the right edge is also brought in.
    expect(selectedPillRevealOffset({ x: 300, width: 90 }, 358)).toBe(
      300 - gutter,
    );
  });

  it("never scrolls before the start of the row", () => {
    expect(selectedPillRevealOffset({ x: 4, width: 400 }, 358)).toBe(0);
  });

  it("waits for the viewport to be measured", () => {
    expect(selectedPillRevealOffset({ x: 450, width: 90 }, 0)).toBe(null);
  });
});
