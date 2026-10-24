import fs from "fs";
import path from "path";

// w21/998: the pills are drawn 28 pt tall with nothing around them, so a tap a
// little above or below one missed it.
describe("the range pills' touch target", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("is 44 pt tall, from the drawn height and the slop", () => {
    expect(
      source.includes(
        "constPILL_HIT_SLOP={top:(44-PILL_HEIGHT)/2,bottom:(44-PILL_HEIGHT)/2,};",
      ),
    ).toBe(true);
    expect(source.includes("constPILL_HEIGHT=PILL_PADDING_V*2+16;")).toBe(true);
    expect(source.includes("constPILL_PADDING_V=6;")).toBe(true);
  });

  it("is set on the pill itself", () => {
    expect(source.includes("style={styles.pill}hitSlop={PILL_HIT_SLOP}")).toBe(
      true,
    );
  });
});
