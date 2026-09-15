import fs from "fs";
import path from "path";

describe("Picker scroll worklet capture", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "components", "picker", "index.tsx"),
    "utf8",
  );

  it("captures a numeric itemCount instead of the items array in the scroll worklet", () => {
    // Icon-bearing items include React elements; capturing `items` serializes
    // FiberNodes and throws (w3/210). Only the primitive length may cross.
    expect(source.includes("const itemCount = items.length")).toBe(true);
    expect(
      source.includes("wheelIndexAtOffset(event.contentOffset.y, itemCount)"),
    ).toBe(true);
    expect(
      source.includes(
        "wheelIndexAtOffset(event.contentOffset.y, items.length)",
      ),
    ).toBe(false);
  });
});
