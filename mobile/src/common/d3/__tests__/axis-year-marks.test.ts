import fs from "fs";
import path from "path";
import { withYearMarks } from "../axis-year-marks";

// w21/497: Budget 1Y had two "OCT" columns, and Reports ALL repeated months.
describe("withYearMarks", () => {
  const months = [
    "2025-10",
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
    "2026-10",
  ];
  const labels = ["OCT", "NOV", "DEC", "JAN", "FEB", "OCT"];

  it("marks the first column and each new year, so repeated months differ", () => {
    const marked = withYearMarks(labels, months);
    expect(marked).toEqual(["OCT 25", "NOV", "DEC", "JAN 26", "FEB", "OCT"]);
    // Budget 1Y's two Octobers are distinguishable.
    expect(marked[0] === marked[5]).toBe(false);
  });

  it("leaves a range within one year alone", () => {
    expect(withYearMarks(["JAN", "FEB"], ["2026-01", "2026-02"])).toEqual([
      "JAN",
      "FEB",
    ]);
  });

  it("leaves year labels and unreadable dates alone", () => {
    expect(
      withYearMarks(["2024", "2025"], ["2024-12-31", "2025-12-31"]),
    ).toEqual(["2024", "2025"]);
    expect(withYearMarks(["JAN", "FEB"], ["2025-12", "n/a"])).toEqual([
      "JAN 25",
      "FEB",
    ]);
  });

  it("reads the period-end dates a budget chart has (a 13-period window)", () => {
    const ends = [
      "2025-10-31",
      "2025-11-30",
      "2025-12-31",
      "2026-01-31",
      "2026-10-21",
    ];
    expect(withYearMarks(["OCT", "NOV", "DEC", "JAN", "OCT"], ends)).toEqual([
      "OCT 25",
      "NOV",
      "DEC",
      "JAN 26",
      "OCT",
    ]);
  });

  it("is what both charts label their columns with", () => {
    const read = (file: string) =>
      fs
        .readFileSync(path.join(__dirname, "../../..", file), "utf8")
        .replace(/\s+/g, "");
    expect(
      read("common/d3/income-expense-bar-chart.tsx").includes(
        "constcolumnLabels=withYearMarks(months.map((month)=>t(month.slice(5,7))),months,locale,);",
      ),
    ).toBe(true);
    const card = read("screens/budget-screen/components/budget-group-card.tsx");
    expect(
      card.includes("labels:withYearMarks(periodLabels,periodDates,locale),"),
    ).toBe(true);
    // The spoken summary names the years itself, from the unmarked labels.
    expect(card.includes("labels:periodLabels,dates:periodDates,")).toBe(true);
  });
});

// w21/884, w21/885: Persian mixed Latin and Persian digits within one label.
describe("year marks and counts in a language with its own digits", () => {
  const { localizeDigits } = require("../../date-format");
  const { selectedPeriodLabel } = require("../../series-util");

  it("writes a year mark in Persian digits, and an English one as before", () => {
    expect(
      withYearMarks(
        ["۱۲/۲۸", "۱/۴", "۱/۱۱"],
        ["2025-12-28", "2026-01-04", "2026-01-11"],
        "fa",
      ),
    ).toEqual(["۱۲/۲۸ ۲۵", "۱/۴ ۲۶", "۱/۱۱"]);
    expect(
      withYearMarks(["Dec", "Jan"], ["2025-12-01", "2026-01-01"], "en"),
    ).toEqual(["Dec 25", "Jan 26"]);
  });

  it("writes the selected month's year, and a count, in the language's digits", () => {
    expect(selectedPeriodLabel("اوت", "2026-08", "fa")).toBe("اوت ۲۰۲۶");
    expect(selectedPeriodLabel("AUG", "2026-08")).toBe("AUG 2026");
    expect(localizeDigits("2 قیمت", "fa")).toBe("۲ قیمت");
    expect(localizeDigits("2 prices", "en")).toBe("2 prices");
  });
});
