import fs from "fs";
import path from "path";
import { selectHeroBadges } from "../select-hero-badges";

const labels = {
  pending: "Pending",
  forecast: "Forecast",
  pad: "Pad",
  upcoming: "Upcoming",
};
const marks = (flag: string | undefined, date: string, today = "2026-10-23") =>
  selectHeroBadges({ flag, date }, today, labels).map(
    (badge) => `${badge.tone}:${badge.text}`,
  );

// w21/777: the row read "Forecast · Upcoming" and the detail it opened showed
// only the date, as a booked transaction does.
describe("selectHeroBadges", () => {
  it("marks a planned entry as its row does", () => {
    expect(marks("#", "2026-10-30")).toEqual([
      "neutral:Forecast",
      "neutral:Upcoming",
    ]);
  });

  it("marks nothing on a booked past entry", () => {
    expect(marks("*", "2026-10-01")).toEqual([]);
    expect(marks(undefined, "2026-10-23")).toEqual([]);
  });

  it("warns for a pending entry and notes any other flag", () => {
    expect(marks("!", "2026-10-01")).toEqual(["warning:Pending"]);
    expect(marks("P", "2026-10-01")).toEqual(["neutral:Pad"]);
    expect(marks("%", "2026-10-01")).toEqual(["neutral:%"]);
  });

  it("calls a booked entry dated after today upcoming, and today's not", () => {
    expect(marks("*", "2026-10-24")).toEqual(["neutral:Upcoming"]);
    expect(marks("*", "2026-10-23")).toEqual([]);
    expect(marks("*", "2026-10-24T00:00:00")).toEqual(["neutral:Upcoming"]);
  });

  it("is what the detail hero draws", () => {
    const screen = fs.readFileSync(
      path.join(__dirname, "..", "..", "transaction-detail-screen.tsx"),
      "utf8",
    );
    expect(screen.includes("heroBadges.map(")).toBe(true);
    expect(screen.includes('entry.flag === "!"')).toBe(false);
  });
});
