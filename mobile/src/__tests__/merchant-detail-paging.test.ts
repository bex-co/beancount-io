import fs from "fs";
import path from "path";

// w21/952: the list stopped at 500 rows (25 pages) with no notice, and the
// page counter, which only went up, lowered that cap after every edit.
describe("Merchant detail's paging", () => {
  const source = fs
    .readFileSync(
      path.join(
        __dirname,
        "../screens/merchant-detail-screen/merchant-detail-screen.tsx",
      ),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("has no page cap, so every row up to the total loads", () => {
    expect(source.includes("MAX_PAGES")).toBe(false);
    expect(source.includes("pagesFetchedRef")).toBe(false);
    expect(
      source.includes(
        "consthasMore=rawEntries.length<total&&stalledAtRef.current!==rawEntries.length;",
      ),
    ).toBe(true);
  });

  it("stops on a page with nothing new, and starts again when the list reloads", () => {
    expect(
      source.includes(
        "if(!gained&&!listMoved)stalledAtRef.current=rawEntries.length;",
      ),
    ).toBe(true);
    // Pull to refresh clears it; a reload to another length differs from it.
    expect(source.includes("stalledAtRef.current=null;")).toBe(true);
  });
});
