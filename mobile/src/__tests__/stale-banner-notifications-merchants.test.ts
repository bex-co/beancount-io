import fs from "fs";
import path from "path";
import { isShowingStaleDataFromQueries } from "../common/apollo/stale-data";

// w21/860: after a failed refresh Notifications kept saying "Ledger is healthy"
// and Merchants kept its cached rows, neither with the banner every other data
// screen shows.
const read = (...parts: string[]) =>
  fs
    .readFileSync(path.join(__dirname, "..", ...parts), "utf8")
    .replace(/\s+/g, "");

describe("the stale-data banner on Notifications and Merchants", () => {
  it("shows for cached data with a failed refresh, not for a first-load failure", () => {
    expect(
      isShowingStaleDataFromQueries([
        { data: [], error: new Error("offline") },
      ]),
    ).toBe(true);
    expect(
      isShowingStaleDataFromQueries([
        { data: undefined, error: new Error("offline") },
      ]),
    ).toBe(false);
  });

  it("renders on Notifications, and does not claim health from stale data", () => {
    const screen = read(
      "screens",
      "notifications-screen",
      "notifications-screen.tsx",
    );
    expect(screen.includes("{showStale?<StaleDataBanner/>:null}")).toBe(true);
    expect(
      screen.includes("errorCount===0&&errorsStale?null:errorCount===0?"),
    ).toBe(true);
    expect(screen.includes("{data:commitsData,error:commitsError}")).toBe(true);
  });

  it("renders on Merchants over the rollup's own read", () => {
    const screen = read("screens", "merchants-screen", "merchants-screen.tsx");
    expect(screen.includes("{data:rollupData,error:rollupError}")).toBe(true);
    expect(screen.includes("{showStale?<StaleDataBanner/>:null}")).toBe(true);
  });
});
