import {
  detectRecurrence,
  formatLedgerDay,
  hasEnoughHistory,
  median,
  parseLedgerDay,
  type SeriesPoint,
} from "../screens/merchants-screen/selectors/detect-recurrence";

function monthlySeries(
  start: string,
  count: number,
  amount: number,
  currency = "USD",
): SeriesPoint[] {
  const startDay = parseLedgerDay(start);
  if (startDay === null) {
    throw new Error(`bad start ${start}`);
  }
  // ~30.4d steps approximate calendar months without depending on Date math
  // beyond the day helpers under test.
  const points: SeriesPoint[] = [];
  for (let i = 0; i < count; i++) {
    points.push({
      date: formatLedgerDay(startDay + Math.round(i * 30.4)),
      currency,
      amount,
    });
  }
  return points;
}

function pointsOn(
  dates: string[],
  amount: number,
  currency = "USD",
): SeriesPoint[] {
  return dates.map((date) => ({ date, currency, amount }));
}

describe("parseLedgerDay / formatLedgerDay", () => {
  it("round-trips YYYY-MM-DD without timezone shift", () => {
    expect(formatLedgerDay(parseLedgerDay("2024-01-31")!)).toBe("2024-01-31");
    expect(formatLedgerDay(parseLedgerDay("2024-02-29")!)).toBe("2024-02-29");
    expect(parseLedgerDay("2024-02-30")).toBe(null);
    expect(parseLedgerDay("not-a-date")).toBe(null);
  });
});

describe("median", () => {
  it("returns the middle value, or the mean of the two middle values", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(null);
  });
});

describe("detectRecurrence", () => {
  it("classifies a clean monthly series", () => {
    const series = pointsOn(
      [
        "2024-01-15",
        "2024-02-15",
        "2024-03-15",
        "2024-04-15",
        "2024-05-15",
        "2024-06-15",
      ],
      -15.99,
    );
    const verdict = detectRecurrence(series, "2024-06-20");
    expect(verdict).not.toBe(null);
    expect(verdict!.cadence).toBe("monthly");
    expect(verdict!.typicalAmountByCurrency.USD).toBe(-15.99);
    expect(verdict!.isApproximate).toBe(false);
    // The bill's own day of the month, not last + 31 (w21/007).
    expect(verdict!.nextExpected).toBe("2024-07-15");
    expect(verdict!.isOverdue).toBe(false);
  });

  it("keeps month-length wobble (Jan 31 → Feb 28 → Mar 31) as monthly", () => {
    const series = pointsOn(
      [
        "2024-01-31",
        "2024-02-29",
        "2024-03-31",
        "2024-04-30",
        "2024-05-31",
        "2024-06-30",
      ],
      -1200,
    );
    const verdict = detectRecurrence(series, "2024-07-05");
    expect(verdict).not.toBe(null);
    expect(verdict!.cadence).toBe("monthly");
  });

  it("flags variable-amount utilities as approximate", () => {
    const series: SeriesPoint[] = [
      { date: "2024-01-10", currency: "USD", amount: -80 },
      { date: "2024-02-10", currency: "USD", amount: -95 },
      { date: "2024-03-10", currency: "USD", amount: -110 },
      { date: "2024-04-10", currency: "USD", amount: -90 },
      { date: "2024-05-10", currency: "USD", amount: -100 },
    ];
    const verdict = detectRecurrence(series, "2024-05-12");
    expect(verdict).not.toBe(null);
    expect(verdict!.cadence).toBe("monthly");
    expect(verdict!.isApproximate).toBe(true);
    expect(verdict!.typicalAmountByCurrency.USD).toBe(-95);
  });

  it("classifies a weekly series", () => {
    const series = pointsOn(
      [
        "2024-01-01",
        "2024-01-08",
        "2024-01-15",
        "2024-01-22",
        "2024-01-29",
        "2024-02-05",
      ],
      -12,
    );
    const verdict = detectRecurrence(series, "2024-02-06");
    expect(verdict).not.toBe(null);
    expect(verdict!.cadence).toBe("weekly");
    expect(verdict!.nextExpected).toBe("2024-02-12");
  });

  it("classifies a biweekly series", () => {
    const series = pointsOn(
      ["2024-01-01", "2024-01-15", "2024-01-29", "2024-02-12", "2024-02-26"],
      -40,
    );
    const verdict = detectRecurrence(series, "2024-02-27");
    expect(verdict).not.toBe(null);
    expect(verdict!.cadence).toBe("biweekly");
  });

  it("classifies a yearly series", () => {
    const series = pointsOn(
      ["2021-03-01", "2022-03-01", "2023-03-01", "2024-03-01"],
      -99,
    );
    const verdict = detectRecurrence(series, "2024-03-10");
    expect(verdict).not.toBe(null);
    expect(verdict!.cadence).toBe("yearly");
    expect(verdict!.nextExpected).toBe("2025-03-01");
  });

  it("classifies a quarterly series", () => {
    const series = pointsOn(
      ["2023-01-01", "2023-04-01", "2023-07-01", "2023-10-01", "2024-01-01"],
      -250,
    );
    const verdict = detectRecurrence(series, "2024-01-05");
    expect(verdict).not.toBe(null);
    expect(verdict!.cadence).toBe("quarterly");
  });

  it("accepts a wobbly-date monthly series within the dispersion budget", () => {
    // Gaps of 28–32 days stay inside the monthly band with low MAD.
    const series = pointsOn(
      [
        "2024-01-05",
        "2024-02-03", // 29
        "2024-03-05", // 31
        "2024-04-03", // 29
        "2024-05-05", // 32
        "2024-06-03", // 29
      ],
      -9.99,
    );
    const verdict = detectRecurrence(series, "2024-06-10");
    expect(verdict).not.toBe(null);
    expect(verdict!.cadence).toBe("monthly");
  });

  it("returns null for irregular (random-gap) series", () => {
    const series = pointsOn(
      [
        "2024-01-01",
        "2024-01-04",
        "2024-01-20",
        "2024-02-02",
        "2024-03-15",
        "2024-03-16",
      ],
      -20,
    );
    expect(detectRecurrence(series, "2024-03-20")).toBe(null);
  });

  it("returns null for a two-transaction payee", () => {
    const series = pointsOn(["2024-01-01", "2024-02-01"], -10);
    expect(detectRecurrence(series, "2024-02-15")).toBe(null);
  });

  it("returns null when today is an invalid date", () => {
    expect(detectRecurrence(monthlySeries("2024-01-01", 4, -10), "nope")).toBe(
      null,
    );
  });

  it("marks overdue past nextExpected plus grace (~1/4 cadence)", () => {
    const series = pointsOn(
      ["2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01"],
      -50,
    );
    // nextExpected 2024-05-01; grace ≈ 8 → overdue after May 9
    expect(detectRecurrence(series, "2024-05-05")!.isOverdue).toBe(false);
    expect(detectRecurrence(series, "2024-05-20")!.isOverdue).toBe(true);
  });

  it("collapses same-day duplicates for gap math but keeps amounts", () => {
    const series: SeriesPoint[] = [
      { date: "2024-01-01", currency: "USD", amount: -10 },
      { date: "2024-01-01", currency: "USD", amount: -10 },
      { date: "2024-02-01", currency: "USD", amount: -10 },
      { date: "2024-03-01", currency: "USD", amount: -10 },
      { date: "2024-04-01", currency: "USD", amount: -10 },
    ];
    const verdict = detectRecurrence(series, "2024-04-05");
    expect(verdict).not.toBe(null);
    expect(verdict!.cadence).toBe("monthly");
  });

  it("tracks typical amounts per currency independently", () => {
    const series: SeriesPoint[] = [
      { date: "2024-01-01", currency: "USD", amount: -10 },
      { date: "2024-01-01", currency: "EUR", amount: -8 },
      { date: "2024-02-01", currency: "USD", amount: -10 },
      { date: "2024-02-01", currency: "EUR", amount: -8 },
      { date: "2024-03-01", currency: "USD", amount: -10 },
      { date: "2024-03-01", currency: "EUR", amount: -8 },
      { date: "2024-04-01", currency: "USD", amount: -10 },
      { date: "2024-04-01", currency: "EUR", amount: -8 },
    ];
    const verdict = detectRecurrence(series, "2024-04-05");
    expect(verdict).not.toBe(null);
    expect(verdict!.typicalAmountByCurrency).toEqual({ USD: -10, EUR: -8 });
    expect(verdict!.isApproximate).toBe(false);
  });

  it("accepts an 8-day median as weekly but rejects a 9-day median", () => {
    const weekly = pointsOn(
      ["2024-01-01", "2024-01-09", "2024-01-17", "2024-01-25", "2024-02-02"],
      -5,
    );
    expect(detectRecurrence(weekly, "2024-02-03")!.cadence).toBe("weekly");

    const tooWide = pointsOn(
      ["2024-01-01", "2024-01-10", "2024-01-19", "2024-01-28", "2024-02-06"],
      -5,
    );
    expect(detectRecurrence(tooWide, "2024-02-07")).toBe(null);
  });

  it("returns null when cadence changes midway (high gap dispersion)", () => {
    // Weekly then monthly — MAD/median blows past 0.25.
    const series = pointsOn(
      [
        "2024-01-01",
        "2024-01-08",
        "2024-01-15",
        "2024-01-22",
        "2024-02-22",
        "2024-03-22",
        "2024-04-22",
      ],
      -20,
    );
    expect(detectRecurrence(series, "2024-04-25")).toBe(null);
  });

  it("treats the overdue grace boundary as exclusive of the grace end day", () => {
    const series = pointsOn(
      ["2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01"],
      -50,
    );
    const onTime = detectRecurrence(series, "2024-05-09");
    const overdue = detectRecurrence(series, "2024-05-10");
    // nextExpected 2024-05-01 (the 1st, not last + 31), grace 8 → boundary
    // is May 9 inclusive.
    expect(onTime!.isOverdue).toBe(false);
    expect(overdue!.isOverdue).toBe(true);
  });
});

// A monthly bill was predicted at last payment + round(median gap): usually
// 31 days, so one to three days late, and a month-end bill rolled into the
// next month (w21/007).
describe("next expected date for a bill kept on one day of the month", () => {
  const next = (dates: string[]) =>
    detectRecurrence(pointsOn(dates, -30), "2026-10-20")!.nextExpected;

  it("lands on the bill's day of the month", () => {
    expect(next(["2026-07-25", "2026-08-25", "2026-09-25"])).toBe("2026-10-25");
    expect(next(["2026-01-10", "2026-02-10", "2026-03-10", "2026-04-10"])).toBe(
      "2026-05-10",
    );
    expect(next(["2025-11-01", "2025-12-01", "2026-01-01", "2026-02-01"])).toBe(
      "2026-03-01",
    );
  });

  it("clamps a month-end bill to a short month's last day", () => {
    expect(next(["2026-05-31", "2026-06-30", "2026-07-31", "2026-08-31"])).toBe(
      "2026-09-30",
    );
    expect(next(["2025-11-30", "2025-12-31", "2026-01-31"])).toBe("2026-02-28");
  });

  it("steps quarters by calendar months too", () => {
    expect(next(["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"])).toBe(
      "2026-03-31",
    );
  });

  it("keeps the day-count step for every-four-weeks payments", () => {
    // Same monthly gap band, but the day of the month drifts.
    expect(next(["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26"])).toBe(
      "2026-04-23",
    );
  });

  // w21/408: February's 28 days put two four-weekly payments on the same day
  // (02-02, 03-02), and 03-30 sat within three days of April's 2nd, so the
  // series read as "the 2nd" and Next came about five days late.
  it("keeps the day-count step for every-four-weeks payments that span February", () => {
    expect(next(["2026-02-02", "2026-03-02", "2026-03-30"])).toBe("2026-04-27");
    expect(next(["2026-01-05", "2026-02-02", "2026-03-02", "2026-03-30"])).toBe(
      "2026-04-27",
    );
  });

  it("still anchors a monthly bill that crosses February", () => {
    // One short gap among monthly ones is month-length wobble, not four weeks.
    expect(next(["2026-01-02", "2026-02-02", "2026-03-02", "2026-04-02"])).toBe(
      "2026-05-02",
    );
    expect(next(["2025-12-31", "2026-01-31", "2026-02-28", "2026-03-31"])).toBe(
      "2026-04-30",
    );
  });

  it("flags overdue from the corrected date", () => {
    const series = pointsOn(["2026-07-25", "2026-08-25", "2026-09-25"], -30);
    // Next 2026-10-25, grace 8 days → still on time on Nov 2, late on Nov 3.
    expect(detectRecurrence(series, "2026-11-02")!.isOverdue).toBe(false);
    expect(detectRecurrence(series, "2026-11-03")!.isOverdue).toBe(true);
  });
});

describe("hasEnoughHistory", () => {
  // A null detection meant both "too short" and "no pattern", so a manual
  // Recurring mark on two monthly payments read "Irregular" (w0/039).
  it("says two dated payments are too few to analyse", () => {
    const two = monthlySeries("2026-07-03", 2, -1800);
    expect(hasEnoughHistory(two)).toBe(false);
    expect(detectRecurrence(two, "2026-08-10")).toBe(null);
  });

  it("says three dated payments are enough, pattern or not", () => {
    expect(hasEnoughHistory(monthlySeries("2026-01-03", 3, -1800))).toBe(true);
    const scattered: SeriesPoint[] = [
      { date: "2026-01-01", currency: "USD", amount: -50 },
      { date: "2026-01-04", currency: "USD", amount: -50 },
      { date: "2026-03-29", currency: "USD", amount: -50 },
      { date: "2026-04-02", currency: "USD", amount: -50 },
    ];
    expect(hasEnoughHistory(scattered)).toBe(true);
    expect(detectRecurrence(scattered, "2026-05-01")).toBe(null);
  });

  it("counts distinct valid days, as detection does", () => {
    const sameDay: SeriesPoint[] = [
      { date: "2026-07-03", currency: "USD", amount: -10 },
      { date: "2026-07-03", currency: "EUR", amount: -9 },
      { date: "2026-08-03", currency: "USD", amount: -10 },
      { date: "not-a-date", currency: "USD", amount: -10 },
      { date: "2026-09-03", currency: "USD", amount: Number.NaN },
    ];
    expect(hasEnoughHistory(sameDay)).toBe(false);
    expect(hasEnoughHistory([])).toBe(false);
  });
});

// w21/167: a pre-entered future payment counted as paid, so a missed bill
// before it no longer read Overdue.
describe("detectRecurrence with a pre-entered payment", () => {
  const rent = (date: string): SeriesPoint => ({
    date,
    currency: "USD",
    amount: 1500,
  });

  it("stays Overdue for a missed month and names the payment as scheduled", () => {
    const verdict = detectRecurrence(
      [
        rent("2026-07-01"),
        rent("2026-08-01"),
        rent("2026-09-01"),
        rent("2026-11-01"),
      ],
      "2026-10-21",
    );
    expect(verdict?.cadence).toBe("monthly");
    expect(verdict?.nextExpected).toBe("2026-10-01");
    expect(verdict?.isOverdue).toBe(true);
    expect(verdict?.scheduled).toBe("2026-11-01");
  });

  it("expects the pre-entered month next when nothing was missed", () => {
    const verdict = detectRecurrence(
      [
        rent("2026-07-01"),
        rent("2026-08-01"),
        rent("2026-09-01"),
        rent("2026-10-01"),
        rent("2026-11-01"),
      ],
      "2026-10-21",
    );
    expect(verdict?.nextExpected).toBe("2026-11-01");
    expect(verdict?.isOverdue).toBe(false);
  });
});

// w21/170: bills on the 1st and 15th read "Every 2 weeks", Next 2–3 days early.
describe("detectRecurrence twice a month", () => {
  const paid = (date: string): SeriesPoint => ({
    date,
    currency: "USD",
    amount: 120,
  });
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
  const lastDays = ["31", "28", "31", "30", "31", "30", "31", "31", "30"];

  it("reads the 1st and 15th as twice a month, next on the 1st", () => {
    const series = months.flatMap((m) => [
      paid(`2026-${m}-01`),
      paid(`2026-${m}-15`),
    ]);
    const verdict = detectRecurrence(series, "2026-10-21");
    expect(verdict?.cadence).toBe("semimonthly");
    expect(verdict?.nextExpected).toBe("2026-11-01");
    expect(verdict?.isOverdue).toBe(false);
  });

  it("follows the last day of the month, February included", () => {
    const series = [
      ...months
        .slice(0, 9)
        .flatMap((m, i) => [
          paid(`2026-${m}-15`),
          paid(`2026-${m}-${lastDays[i]}`),
        ]),
      paid("2026-10-15"),
    ];
    const verdict = detectRecurrence(series, "2026-10-21");
    expect(verdict?.cadence).toBe("semimonthly");
    expect(verdict?.nextExpected).toBe("2026-10-31");
  });

  // w21/458: one shifted, early or missing payment turned "Twice a month" into
  // "Every 2 weeks", with Next two or three days early.
  describe("with one payment off its day", () => {
    const dates = (change: (date: string) => string | null) =>
      months
        .flatMap((m) => [`2026-${m}-01`, `2026-${m}-15`])
        .map(change)
        .filter((date): date is string => date !== null);
    const verdictFor = (list: string[]) =>
      detectRecurrence(pointsOn(list, 120), "2026-10-20");

    it("stays twice a month with Next on the 1st, whichever one is off", () => {
      const variants = {
        "the 15th paid early": dates((d) =>
          d === "2026-02-15" ? "2026-02-13" : d,
        ),
        "the 1st paid on the 31st": dates((d) =>
          d === "2026-08-01" ? "2026-07-31" : d,
        ),
        "a payment missing": dates((d) => (d === "2026-05-15" ? null : d)),
        "the clean series": dates((d) => d),
      };
      for (const [name, list] of Object.entries(variants)) {
        const verdict = verdictFor(list);
        expect([name, verdict?.cadence]).toEqual([name, "semimonthly"]);
        expect([name, verdict?.nextExpected]).toEqual([name, "2026-11-01"]);
      }
    });

    it("gives up after two missing, and for a payment far from either day", () => {
      const twoMissing = dates((d) =>
        d === "2026-05-15" || d === "2026-07-01" ? null : d,
      );
      expect(verdictFor(twoMissing)?.cadence).not.toBe("semimonthly");
      const far = dates((d) => (d === "2026-04-15" ? "2026-04-22" : d));
      expect(verdictFor(far)?.cadence).not.toBe("semimonthly");
    });

    it("does not read a short 14-day run as twice a month", () => {
      const series = pointsOn(
        ["2024-01-01", "2024-01-15", "2024-01-29", "2024-02-12", "2024-02-26"],
        -40,
      );
      expect(detectRecurrence(series, "2024-02-27")?.cadence).toBe("biweekly");
    });

    // w21/799: one payment a day late read "Twice a month".
    it("keeps a biweekly series with a payment a day off", () => {
      const daycare = pointsOn(
        ["2026-01-30", "2026-02-13", "2026-02-27", "2026-03-13", "2026-03-28"],
        1850,
      );
      expect(detectRecurrence(daycare, "2026-04-01")?.cadence).toBe("biweekly");
      // Every start day of 2024–25, 4 to 6 payments, one shifted a day.
      const misread: string[] = [];
      const first = parseLedgerDay("2024-01-01")!;
      const last = parseLedgerDay("2025-12-31")!;
      for (let start = first; start <= last; start += 1) {
        for (const count of [4, 5, 6]) {
          for (let shifted = 0; shifted < count; shifted += 1) {
            for (const shift of [-1, 1]) {
              const days = Array.from(
                { length: count },
                (_, i) => start + i * 14 + (i === shifted ? shift : 0),
              );
              const verdict = detectRecurrence(
                pointsOn(days.map(formatLedgerDay), 1850),
                formatLedgerDay(days[count - 1]! + 1),
              );
              if (verdict?.cadence === "semimonthly") {
                misread.push(formatLedgerDay(start));
              }
            }
          }
        }
      }
      expect(misread.slice(0, 3)).toEqual([]);
    });

    it("keeps a 1st and 15th bill twice a month", () => {
      const days = ["01", "15"];
      const months = ["2026-03", "2026-04", "2026-05", "2026-06"];
      const series = pointsOn(
        months.flatMap((month) => days.map((day) => `${month}-${day}`)),
        900,
      );
      expect(detectRecurrence(series, "2026-06-20")?.cadence).toBe(
        "semimonthly",
      );
    });
  });

  it("keeps a monthly bill's day through a skipped month (w21/459)", () => {
    const onThe = (day: string, list: string[]) =>
      detectRecurrence(
        pointsOn(
          list.map((m) => `${m}-${day}`),
          50,
        ),
        "2026-02-20",
      );
    expect(
      onThe("01", ["2025-09", "2025-10", "2025-11", "2026-01", "2026-02"])
        ?.nextExpected,
    ).toBe("2026-03-01");
    expect(
      onThe("15", [
        "2025-08",
        "2025-09",
        "2025-11",
        "2025-12",
        "2026-01",
        "2026-02",
      ])?.nextExpected,
    ).toBe("2026-03-15");
    // The same series without the gap, for comparison.
    expect(
      onThe("01", [
        "2025-09",
        "2025-10",
        "2025-11",
        "2025-12",
        "2026-01",
        "2026-02",
      ])?.nextExpected,
    ).toBe("2026-03-01");
  });

  it("keeps a true 14-day cadence as every two weeks", () => {
    const start = parseLedgerDay("2026-06-05")!;
    const series = Array.from({ length: 10 }, (_, i) =>
      paid(formatLedgerDay(start + i * 14)),
    );
    expect(detectRecurrence(series, "2026-10-21")?.cadence).toBe("biweekly");
  });
});

// w21/171: after a price rise the typical amount kept the old price.
describe("detectRecurrence after a price change", () => {
  const charge = (date: string, amount: number): SeriesPoint => ({
    date,
    currency: "USD",
    amount,
  });

  it("shows the new price, marked approximate", () => {
    const series = [
      ...["01", "02", "03", "04", "05", "06"].map((m) =>
        charge(`2026-${m}-05`, 10.99),
      ),
      ...["07", "08", "09", "10"].map((m) => charge(`2026-${m}-05`, 11.99)),
    ];
    const verdict = detectRecurrence(series, "2026-10-21");
    expect(verdict?.typicalAmountByCurrency.USD).toBe(11.99);
    expect(verdict?.isApproximate).toBe(true);
  });

  it("leaves a steady price as it was", () => {
    const series = ["05", "06", "07", "08", "09", "10"].map((m) =>
      charge(`2026-${m}-05`, 10.99),
    );
    const verdict = detectRecurrence(series, "2026-10-21");
    expect(verdict?.typicalAmountByCurrency.USD).toBe(10.99);
    expect(verdict?.isApproximate).toBe(false);
  });
});

// w21/335: detectRecurrence ignores pre-entered events, but hasEnoughHistory
// still counted them, so a manual Recurring mark read "Irregular" for a series
// too short to analyse.
describe("hasEnoughHistory with a pre-entered event", () => {
  const point = (date: string) => ({ date, currency: "USD", amount: -10 });

  it("does not count a future event as history", () => {
    const series = [
      point("2026-09-05"),
      point("2026-10-05"),
      point("2026-11-05"),
    ];
    expect(hasEnoughHistory(series)).toBe(true);
    expect(hasEnoughHistory(series, "2026-10-21")).toBe(false);
    // Agrees with the detector on what it analysed.
    expect(detectRecurrence(series, "2026-10-21")).toBe(null);
  });

  it("counts everything up to and including today", () => {
    const series = [
      point("2026-08-05"),
      point("2026-09-05"),
      point("2026-10-21"),
    ];
    expect(hasEnoughHistory(series, "2026-10-21")).toBe(true);
  });
});

// w21/615: a monthly $10.99 bill with one ¥980 charge abroad is paid in dollars.
describe("detectRecurrence primary currency", () => {
  it("is the currency with the most charges, not the largest amount", () => {
    const series = [
      ...monthlySeries("2026-01-05", 8, 10.99),
      { date: "2026-04-20", currency: "JPY", amount: 980 },
    ];
    const verdict = detectRecurrence(series, "2026-09-01");
    expect(verdict?.primaryCurrency).toBe("USD");
    expect(verdict?.typicalAmountByCurrency.JPY).toBe(980);
  });

  it("follows the latest charge when the counts tie", () => {
    const series = [
      ...monthlySeries("2026-01-05", 4, 2000, "JPY"),
      ...monthlySeries("2026-05-05", 4, 18, "USD"),
    ];
    const verdict = detectRecurrence(series, "2026-09-01");
    expect(verdict?.primaryCurrency).toBe("USD");
  });

  // w21/797: rent paid in yen for six months, then in dollars after a move,
  // still read "¥120,000".
  it("is the currency the latest charges are paid in after a switch", () => {
    const series = [
      ...pointsOn(
        [
          "2026-01-01",
          "2026-02-01",
          "2026-03-01",
          "2026-04-01",
          "2026-05-01",
          "2026-06-01",
        ],
        120000,
        "JPY",
      ),
      ...pointsOn(
        ["2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"],
        2000,
        "USD",
      ),
    ];
    const verdict = detectRecurrence(series, "2026-10-23");
    expect(verdict?.primaryCurrency).toBe("USD");
    expect(verdict?.typicalAmountByCurrency.USD).toBe(2000);
  });

  // w21/798: varying yen charges put a "~" before a steady $10.99.
  it("is approximate only when the shown currency's amounts vary", () => {
    const usd = (months: string[], amount = 10.99) =>
      pointsOn(
        months.map((month) => `2026-${month}-05`),
        amount,
      );
    const steady = [
      ...usd(["01", "02", "03", "05", "06", "08", "09", "10"]),
      { date: "2026-04-05", currency: "JPY", amount: 980 },
      { date: "2026-07-05", currency: "JPY", amount: 1500 },
    ];
    const verdict = detectRecurrence(steady, "2026-10-23");
    expect([verdict?.primaryCurrency, verdict?.isApproximate]).toEqual([
      "USD",
      false,
    ]);
    const varying = [
      ...usd(["01", "02", "03", "05"], 10.99),
      ...usd(["06", "08", "09", "10"], 14.5),
      { date: "2026-04-05", currency: "JPY", amount: 980 },
      { date: "2026-07-05", currency: "JPY", amount: 1500 },
    ];
    expect(detectRecurrence(varying, "2026-10-23")?.isApproximate).toBe(true);
  });

  it("keeps the usual currency when one recent charge was abroad", () => {
    const series = [
      ...monthlySeries("2026-01-05", 8, 10.99),
      { date: "2026-09-10", currency: "JPY", amount: 980 },
    ];
    const verdict = detectRecurrence(series, "2026-09-20");
    expect(verdict?.primaryCurrency).toBe("USD");
  });
});
