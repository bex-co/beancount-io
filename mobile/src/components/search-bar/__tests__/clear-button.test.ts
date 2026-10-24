import fs from "fs";
import path from "path";
import { en } from "../../../translations/en";

// w21/467: `clearButtonMode` is an iOS-only prop, so on Android a search could
// only be left by deleting it character by character. The component needs the
// native runtime, so the wiring is checked on its source.
describe("the search bar's clear button", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("is drawn whenever there is text, on both platforms", () => {
    expect(source.includes("value.length>0?(<TouchableOpacity")).toBe(true);
    expect(source.includes('onPress={()=>onChangeText("")}')).toBe(true);
    expect(source.includes('accessibilityLabel={t("clearSearch")}')).toBe(true);
    expect(source.includes('accessibilityRole="button"')).toBe(true);
  });

  it("replaces the iOS-only control instead of doubling it", () => {
    expect(source.includes("clearButtonMode")).toBe(false);
  });

  it("is labelled, in every language", () => {
    expect(en.clearSearch).toBe("Clear search");
    const dir = path.join(__dirname, "../../../translations");
    const missing = fs
      .readdirSync(dir)
      .filter((name) => /^[a-z]{2}\.ts$/.test(name))
      .filter(
        (name) =>
          !fs
            .readFileSync(path.join(dir, name), "utf8")
            .includes("clearSearch:"),
      );
    expect(missing).toEqual([]);
  });
});

// w21/999: the ✕ was about 34 pt and its slop covered the gap to the Filters
// button, so a tap just right of it opened Filters. Width is layout, which a
// neighbour cannot overlap; height is slop.
describe("the search bar's clear button target", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("is a 44 pt wide box, and 44 pt tall with the slop", () => {
    expect(source.includes("clear:{minWidth:iconActionSize,")).toBe(true);
    expect(
      source.includes(
        "constCLEAR_HIT_SLOP={top:(iconActionSize-CLEAR_ICON_SIZE)/2,bottom:(iconActionSize-CLEAR_ICON_SIZE)/2,};",
      ),
    ).toBe(true);
    expect(source.includes("hitSlop={CLEAR_HIT_SLOP}")).toBe(true);
    expect(source.includes("hitSlop={8}")).toBe(false);
  });
});
