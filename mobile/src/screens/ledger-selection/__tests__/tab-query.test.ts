import fs from "fs";
import path from "path";

/**
 * Static guardrail: switching Browse ledgers tabs keeps the search query. The
 * field is shared by all three tabs, and moving from Your ledgers to Explore is
 * the ordinary way to widen a search that found nothing.
 */
describe("Browse ledgers tab switch", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "index.tsx"),
    "utf8",
  );

  it("changes only the tab, leaving the query and its debounced copy", () => {
    const start = source.indexOf("testID={`discovery-tab-${value}`}");
    const tab = source.slice(start, source.indexOf("</Pressable>", start));
    expect(start === -1).toBe(false);
    expect(tab.includes("onPress={() => setTab(value)}")).toBe(true);
    expect(tab.includes('setQuery("")')).toBe(false);
    expect(tab.includes('setDebounced("")')).toBe(false);
  });
});
