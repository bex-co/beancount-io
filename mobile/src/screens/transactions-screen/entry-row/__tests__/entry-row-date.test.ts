import fs from "fs";
import path from "path";
import { entryRowDateLine, entryRowUpcomingLine } from "../entry-row-date";

// w21/261: Home's and Reports' recent-entry cards drew rows with no date, so a
// pre-entered future payment looked as if it had already happened.
describe("entryRowDateLine", () => {
  const base = { today: "2026-10-21", locale: "en", upcomingLabel: "Upcoming" };

  it("dates a past row and joins its narration", () => {
    expect(
      entryRowDateLine({ ...base, date: "2026-10-05", secondary: null }),
    ).toBe("Oct 5, 2026");
    expect(
      entryRowDateLine({
        ...base,
        date: "2026-08-28",
        secondary: "Weekly produce",
      }),
    ).toBe("Aug 28, 2026 · Weekly produce");
  });

  it("marks a row dated after today as upcoming", () => {
    expect(
      entryRowDateLine({ ...base, date: "2026-11-01", secondary: "Rent" }),
    ).toBe("Nov 1, 2026 · Upcoming · Rent");
    // Today itself has happened.
    expect(
      entryRowDateLine({ ...base, date: "2026-10-21", secondary: null }),
    ).toBe("Oct 21, 2026");
  });

  it("reads the day of a dated-with-time string", () => {
    expect(
      entryRowDateLine({
        ...base,
        date: "2026-11-01T00:00:00Z",
        secondary: null,
      }),
    ).toBe("Nov 1, 2026 · Upcoming");
  });

  it("falls back to the narration when there is no usable date", () => {
    expect(entryRowDateLine({ ...base, date: undefined, secondary: "x" })).toBe(
      "x",
    );
    expect(entryRowDateLine({ ...base, date: "soon", secondary: null })).toBe(
      null,
    );
  });

  it("is what the Home and Reports cards ask the row for, and the label speaks", () => {
    const read = (...parts: string[]) =>
      fs
        .readFileSync(path.join(__dirname, "..", "..", "..", ...parts), "utf8")
        .replace(/\s+/g, "");
    for (const card of [
      ["home-screen", "components", "recent-transactions-card.tsx"],
      ["reports-screen", "components", "account-transactions-card.tsx"],
    ]) {
      const source = read(...card);
      expect(source.includes("dateToday={today}")).toBe(true);
      expect(source.includes("consttoday=useToday();")).toBe(true);
    }
    // The date line is the label's second part, so VoiceOver reads it.
    const row = read("transactions-screen", "entry-row", "index.tsx");
    expect(row.includes("secondary,amountStr,flagLabel")).toBe(true);
    expect(row.includes("entryRowDateLine({")).toBe(true);
  });
});

// w21/746: a forecast filled the Transactions tab with projected entries, none
// marked. Its rows have date headers, so only "Upcoming" is added.
describe("entryRowUpcomingLine", () => {
  const line = (date: string, secondary: string | null = "Weekly") =>
    entryRowUpcomingLine({
      date,
      today: "2026-10-23",
      upcomingLabel: "Upcoming",
      secondary,
    });

  it("marks an entry dated after today, before its narration", () => {
    expect(line("2026-12-29")).toBe("Upcoming · Weekly");
    expect(line("2026-12-29", null)).toBe("Upcoming");
  });

  it("leaves today's and past entries as they read", () => {
    expect(line("2026-10-23")).toBe("Weekly");
    expect(line("2026-10-01", null)).toBe(null);
  });
});
