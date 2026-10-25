import fs from "fs";
import path from "path";

// w21/1010: switching tabs showed the previous tab's rows for one frame,
// because the new tab's load starts in an effect after paint. The screen now
// blanks rows whose tab does not match and shows the skeleton instead. A full
// VM render needs some twenty module stubs, so this follows the file's own
// w21/383 source-check precedent; the store half is covered by
// discovery-store.test.ts ("tracks which tab the rows belong to").
describe("a tab switch", () => {
  const src = fs
    .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("blanks rows from the previous tab", () => {
    expect(src.includes("consttabStale=state.loadedTab!==tab;")).toBe(true);
    expect(src.includes("constitems=tabStale||waitingForSearch?[]:")).toBe(
      true,
    );
  });

  it("shows the skeleton until the new tab's rows land", () => {
    expect(
      src.includes(
        "state.loading||state.refreshing||waitingForSearch||tabStale?(skeleton):(",
      ),
    ).toBe(true);
  });
});
