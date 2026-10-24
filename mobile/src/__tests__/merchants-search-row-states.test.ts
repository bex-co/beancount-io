import fs from "fs";
import path from "path";

// w21/898: "Search 0 merchants…" and a sort button sat above the load error and
// the empty state, where typing did nothing.
describe("Merchants search row", () => {
  const source = fs
    .readFileSync(
      path.join(__dirname, "../screens/merchants-screen/merchants-screen.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("is left out of the loading, error and blank states", () => {
    expect(
      source.includes(
        "ListHeaderComponent={isInitialLoading||error||showBlankEmpty?null:(",
      ),
    ).toBe(true);
  });
});
