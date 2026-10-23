import fs from "fs";
import path from "path";
import { entryFlagBadge } from "../entry-row-flag";

// w21/746: only "!" was badged, so Fava's forecast entries (#) and a pad's
// padding (P) read as booked on Transactions.
describe("entryFlagBadge", () => {
  it("leaves a cleared entry unmarked", () => {
    expect(entryFlagBadge("*")).toBe(null);
    expect(entryFlagBadge(undefined)).toBe(null);
  });

  it("marks pending, forecast, padding and any other flag", () => {
    expect(entryFlagBadge("!")).toEqual({ kind: "pending" });
    expect(entryFlagBadge("#")).toEqual({ kind: "forecast" });
    expect(entryFlagBadge("P")).toEqual({ kind: "padding" });
    expect(entryFlagBadge("R")).toEqual({ kind: "other", flag: "R" });
  });

  it("is what the Transactions rows badge, with future rows Upcoming", () => {
    const read = (...parts: string[]) =>
      fs
        .readFileSync(path.join(__dirname, "..", ...parts), "utf8")
        .replace(/\s+/g, "");
    const row = read("index.tsx");
    expect(row.includes("entryFlagBadge(entry.flag)")).toBe(true);
    expect(row.includes('t("entryForecast")')).toBe(true);
    expect(row.includes('t("pad")')).toBe(true);
    expect(
      read("..", "transactions-screen.tsx").includes("upcomingAfter={today}"),
    ).toBe(true);
  });
});
