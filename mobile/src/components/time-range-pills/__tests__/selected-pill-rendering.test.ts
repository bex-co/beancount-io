import fs from "fs";
import path from "path";

/**
 * Static guardrail: a selected pill renders fully or not at all. The fill's
 * visibility was a flag set only after a layout lookup, while the active
 * label turned white from `value` alone, so a missed layout left white text
 * on the card with no fill behind it.
 */
describe("TimeRangePills selection rendering", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "index.tsx"),
    "utf8",
  );

  it("derives the fill's visibility from its measured width", () => {
    expect(source.includes("opacity: width.value > 0 ? 1 : 0")).toBe(true);
    expect(source.includes("const opacity = useSharedValue")).toBe(false);
  });

  it("whitens the active label only once the fill is placed", () => {
    expect(
      source.includes("active && indicatorPlaced && styles.labelActive"),
    ).toBe(true);
    expect(source.includes("active && styles.labelActive")).toBe(false);
  });
});
