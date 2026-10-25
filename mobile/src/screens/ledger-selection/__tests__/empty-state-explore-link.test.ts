import fs from "fs";
import path from "path";

// w21/1009: the empty Your ledgers tab reads "Explore public ledgers to get
// started" but offered no way to do so; only the Starred tab's empty state
// linked to Explore. A full VM render of this screen needs some twenty module
// stubs for a one-condition fix, so this follows the file's own w21/383
// precedent and pins the branch in source instead: with no error and no
// query, the yours and starred empty states render the Explore pressable,
// and explore does not link to itself.
describe("the Browse empty states", () => {
  const src = fs
    .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("the yours and starred tabs link to Explore", () => {
    expect(
      src.includes(
        '!state.error&&(tab==="starred"||tab==="yours")&&!query.trim()',
      ),
    ).toBe(true);
    expect(src.includes('onPress={()=>setTab("explore")}')).toBe(true);
  });

  it("the explore tab does not link to itself", () => {
    expect(src.includes('tab==="explore"&&!query.trim()?(')).toBe(false);
  });
});
