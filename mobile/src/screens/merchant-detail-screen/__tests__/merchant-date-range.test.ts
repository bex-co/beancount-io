import { merchantDateRangeText } from "../selectors/merchant-date-range";

const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key}(${JSON.stringify(options)})` : key) as never;

describe("merchantDateRangeText", () => {
  it("spans two different days", () => {
    expect(
      merchantDateRangeText("2026-02-10", "2026-03-10", "2026-10-22", "en", t),
    ).toBe(
      'merchantDetailDateRange({"first":"Feb 10, 2026","last":"Mar 10, 2026"})',
    );
  });

  // w21/616: "Feb 10, 2026 – Feb 10, 2026" for a merchant with one payment.
  it("is one date for one day", () => {
    expect(
      merchantDateRangeText("2026-02-10", "2026-02-10", "2026-10-22", "en", t),
    ).toBe("Feb 10, 2026");
  });

  it("is one scheduled date for a lone pre-entered payment", () => {
    expect(
      merchantDateRangeText("2026-11-01", "2026-11-01", "2026-10-22", "en", t),
    ).toBe('merchantsScheduled({"date":"Nov 1, 2026"})');
  });

  it("marks only the last date of a span as scheduled", () => {
    expect(
      merchantDateRangeText("2026-09-01", "2026-11-01", "2026-10-22", "en", t),
    ).toBe(
      'merchantDetailDateRange({"first":"Sep 1, 2026","last":"merchantsScheduled({\\"date\\":\\"Nov 1, 2026\\"})"})',
    );
  });
});

// w21/761: with every entry pre-entered, the first date read as one made.
describe("a merchant whose entries are all scheduled", () => {
  const t = ((key: string, options?: Record<string, string>) =>
    key === "merchantsScheduled"
      ? `Scheduled ${options?.date}`
      : key === "merchantDetailDateRange"
        ? `${options?.first} – ${options?.last}`
        : key) as never;

  it("reads the whole span as scheduled", () => {
    expect(
      merchantDateRangeText("2026-10-25", "2026-10-31", "2026-10-23", "en", t),
    ).toBe("Scheduled Oct 25, 2026 – Oct 31, 2026");
    expect(
      merchantDateRangeText("2026-10-25", "2026-10-25", "2026-10-23", "en", t),
    ).toBe("Scheduled Oct 25, 2026");
  });

  it("keeps a made first date beside a scheduled last one", () => {
    expect(
      merchantDateRangeText("2026-10-01", "2026-10-31", "2026-10-23", "en", t),
    ).toBe("Oct 1, 2026 – Scheduled Oct 31, 2026");
  });
});
