import fs from "fs";
import path from "path";
import { entryRowUpcomingLine } from "../../transactions-screen/entry-row/entry-row-date";

// w21/795: a rent pre-entered for November listed like the booked months
// below it, with no Upcoming line. The screen needs the native runtime; its
// wiring is checked on the source, and the line on the row's own helper.
describe("merchant detail's rows", () => {
  it("are told today, so a later one reads Upcoming", () => {
    const screen = fs
      .readFileSync(
        path.join(__dirname, "..", "merchant-detail-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      screen.includes(
        "<EntryRowentry={item}onPress={()=>handleEntryPress(item)}upcomingAfter={today}/>",
      ),
    ).toBe(true);
    expect(screen.includes("consttoday=useToday();")).toBe(true);
  });

  it("mark the Nov 1 rent and leave the booked months alone", () => {
    const line = (date: string) =>
      entryRowUpcomingLine({
        date,
        today: "2026-10-23",
        upcomingLabel: "Upcoming",
        secondary: "Rent",
      });
    expect(line("2026-11-01")).toBe("Upcoming · Rent");
    expect(line("2026-10-01")).toBe("Rent");
  });
});
