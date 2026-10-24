import fs from "fs";
import path from "path";
import { en } from "../../../translations/en";

// w21/978: every ledger error was mounted at once; a bad import can make thousands.
describe("Notifications' ledger errors", () => {
  const source = fs
    .readFileSync(
      path.join(__dirname, "..", "notifications-screen.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("are drawn a page at a time, with a button for the next page", () => {
    expect(source.includes("constERRORS_PAGE=50;")).toBe(true);
    expect(source.includes("useState(ERRORS_PAGE)")).toBe(true);
    expect(source.includes("errors.slice(0,shownErrors).map(")).toBe(true);
    expect(source.includes("errors.map(")).toBe(false);
    expect(source.includes("{shownErrors<errors.length?(<Pressable")).toBe(
      true,
    );
    expect(source.includes("setShownErrors((count)=>count+ERRORS_PAGE)")).toBe(
      true,
    );
  });

  it("show how many the next page holds", () => {
    expect(en.notificationsShowMoreErrors).toBe("Show more ({{count}})");
    expect(
      source.includes("count:Math.min(ERRORS_PAGE,errors.length-shownErrors,)"),
    ).toBe(true);
  });
});
