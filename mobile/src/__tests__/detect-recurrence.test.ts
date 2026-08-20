import {
  detectRecurrence,
  formatLedgerDay,
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
    expect(verdict!.nextExpected).toBe("2024-07-16");
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
    // median gap ≈ 30; nextExpected ≈ 2024-05-01; grace ≈ 8 → overdue after ~May 9
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
    const onTime = detectRecurrence(series, "2024-05-10");
    const overdue = detectRecurrence(series, "2024-05-11");
    // nextExpected ≈ 2024-05-02, grace ≈ 8 → boundary is May 10 inclusive.
    expect(onTime!.isOverdue).toBe(false);
    expect(overdue!.isOverdue).toBe(true);
  });
});
