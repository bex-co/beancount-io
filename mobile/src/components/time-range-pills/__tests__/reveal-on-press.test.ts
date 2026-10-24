import fs from "fs";
import path from "path";
import { pillScrollTarget } from "../reveal-offset";
import { gutter } from "../../../common/theme/spacing";

// w21/891: the chip strip scrolled the selection into view only on first paint,
// so tapping the cut-off "AL" chip at AX2 left the selection off-screen.
describe("pillScrollTarget", () => {
  it("scrolls a chip cut off at the trailing edge whole into view", () => {
    expect(pillScrollTarget({ x: 300, width: 90 }, 320, 0)).toBe(
      300 + 90 - 320 + gutter,
    );
  });

  it("brings a chip cut off at the leading edge back", () => {
    expect(pillScrollTarget({ x: 20, width: 90 }, 320, 80)).toBe(
      Math.max(0, 20 - gutter),
    );
  });

  it("judges against where the row is scrolled, and leaves a whole chip", () => {
    expect(pillScrollTarget({ x: 300, width: 90 }, 320, 100)).toBe(null);
    expect(pillScrollTarget({ x: 10, width: 60 }, 320, 0)).toBe(null);
  });

  it("does nothing before the row is measured", () => {
    expect(pillScrollTarget({ x: 300, width: 90 }, 0, 0)).toBe(null);
    expect(pillScrollTarget({ x: 300, width: 0 }, 320, 0)).toBe(null);
  });
});

describe("the chip strip", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("reveals a tapped chip and an externally set range, from where it is scrolled", () => {
    expect(
      source.includes("moveTo(option.key,true);revealPill(option.key);"),
    ).toBe(true);
    expect(
      source.includes(
        "useEffect(()=>{if(revealedRef.current)revealPill(value);",
      ),
    ).toBe(true);
    expect(
      source.includes("offsetRef.current=event.nativeEvent.contentOffset.x;"),
    ).toBe(true);
  });
});
