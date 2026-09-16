import fs from "fs";
import path from "path";

const LAYOUT = fs.readFileSync(
  path.join(__dirname, "..", "..", "app", "(app)", "_layout.tsx"),
  "utf8",
);

describe("cold deep-link back navigation", () => {
  it("anchors the authenticated stack on tabs for cold links", () => {
    expect(LAYOUT.includes('anchor: "(tabs)"')).toBe(true);
  });

  it("falls back to Home when there is no back history", () => {
    expect(LAYOUT.includes("router.canGoBack()")).toBe(true);
    expect(LAYOUT.includes('router.replace("/(app)/(tabs)")')).toBe(true);
  });
});
