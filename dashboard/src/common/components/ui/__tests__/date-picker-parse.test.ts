import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { fr } from "date-fns/locale/fr";
import { de } from "date-fns/locale/de";
import { ja } from "date-fns/locale/ja";
import { zhCN } from "date-fns/locale/zh-CN";
import {
  ISO_PATTERN,
  getDisplayPattern,
  getPatternHint,
  parseStrictCalendarDate,
  rollingCalendarBounds,
} from "../date-picker-utils";

/**
 * One row per tested ordering. `typed` is the locale's own writing of
 * 15 June 2025; assertions pin the resulting date, never just success.
 *
 * NOTE on the milestone text: its example digits are transposed — it says a
 * French user types `12/09/2026` "for 9 December". Under day-first order
 * that string is 12 September (day 12, month 9); the day-first writing of
 * 9 December is `09/12/2026`. The vectors below use the correct digits and
 * additionally pin the milestone's literal string per locale.
 */
const LOCALES = [
  {
    name: "en",
    locale: enUS,
    pattern: "MM/dd/yyyy",
    hint: "MM/DD/YYYY",
    typed: "06/15/2025",
    rollover: "02/30/2025",
    partial: "06/15/202",
  },
  {
    name: "fr",
    locale: fr,
    pattern: "dd/MM/yyyy",
    hint: "DD/MM/YYYY",
    typed: "15/06/2025",
    rollover: "30/02/2025",
    partial: "15/06/202",
  },
  {
    name: "de",
    locale: de,
    pattern: "dd.MM.yyyy",
    hint: "DD.MM.YYYY",
    typed: "15.06.2025",
    rollover: "30.02.2025",
    partial: "15.06.202",
  },
  {
    name: "ja",
    locale: ja,
    pattern: "yyyy/MM/dd",
    hint: "YYYY/MM/DD",
    typed: "2025/06/15",
    rollover: "2025/02/30",
    partial: "2025/06/1",
  },
  {
    name: "zh",
    locale: zhCN,
    pattern: "yyyy-MM-dd",
    hint: "YYYY-MM-DD",
    typed: "2025-06-15",
    rollover: "2025-02-30",
    partial: "2025-06-1",
  },
] as const;

function iso(date: Date | undefined): string | undefined {
  return date === undefined ? undefined : format(date, "yyyy-MM-dd");
}

describe("getDisplayPattern", () => {
  it.each(LOCALES)("derives $pattern for $name", ({ locale, pattern }) => {
    expect(getDisplayPattern(locale)).toBe(pattern);
  });

  it("widens single-letter years so short years cannot round-trip", () => {
    // fr ships "dd/MM/y" and zh ships "yy-MM-dd" from date-fns; both must
    // come out requiring a full year.
    expect(getDisplayPattern(fr)).toBe("dd/MM/yyyy");
    expect(getDisplayPattern(zhCN)).toBe("yyyy-MM-dd");
  });

  it("derives hints that cannot drift from the parser", () => {
    for (const { pattern, hint } of LOCALES) {
      expect(getPatternHint(pattern)).toBe(hint);
    }
    expect(getPatternHint(ISO_PATTERN)).toBe("YYYY-MM-DD");
  });
});

describe("parseStrictCalendarDate", () => {
  it.each(LOCALES)(
    "reads $name input in $name order: $typed is 15 June 2025",
    ({ pattern, typed }) => {
      expect(iso(parseStrictCalendarDate(typed, pattern))).toBe("2025-06-15");
    },
  );

  it.each(LOCALES)("accepts the ISO fallback under $name", ({ pattern }) => {
    expect(iso(parseStrictCalendarDate("2025-06-15", pattern))).toBe(
      "2025-06-15",
    );
  });

  it("reads the milestone string per-locale instead of guessing", () => {
    // The milestone's literal `12/09/2026`: 9 December in month-first
    // English, 12 September in day-first French. Each locale applies only
    // its own pattern; neither reinterpretation is attempted.
    expect(iso(parseStrictCalendarDate("12/09/2026", "MM/dd/yyyy"))).toBe(
      "2026-12-09",
    );
    expect(iso(parseStrictCalendarDate("12/09/2026", "dd/MM/yyyy"))).toBe(
      "2026-09-12",
    );
  });

  it("produces 9 December from the French writing of 9 December", () => {
    expect(iso(parseStrictCalendarDate("09/12/2026", "dd/MM/yyyy"))).toBe(
      "2026-12-09",
    );
  });

  it.each(LOCALES)(
    "rejects empty, partial, invalid and rolled-over $name input (m24)",
    ({ pattern, rollover, partial }) => {
      expect(parseStrictCalendarDate("", pattern)).toBeUndefined();
      expect(parseStrictCalendarDate("0", pattern)).toBeUndefined();
      expect(parseStrictCalendarDate(partial, pattern)).toBeUndefined();
      expect(parseStrictCalendarDate("not-a-date", pattern)).toBeUndefined();
      expect(parseStrictCalendarDate(rollover, pattern)).toBeUndefined();
    },
  );

  it.each(LOCALES)("rejects two-digit years under $name", ({ pattern }) => {
    const shortYear = pattern
      .replace("yyyy", "YY")
      .replace("MM", "06")
      .replace("dd", "15")
      .replace("YY", "25");
    expect(parseStrictCalendarDate(shortYear, pattern)).toBeUndefined();
  });

  it("rejects input valid only under another locale ordering", () => {
    // Day-first strings under English, month-first strings under French:
    // legitimate dates elsewhere, invalid here — refused, never reinterpreted.
    expect(parseStrictCalendarDate("15/06/2025", "MM/dd/yyyy")).toBeUndefined();
    expect(parseStrictCalendarDate("06/15/2025", "dd/MM/yyyy")).toBeUndefined();
    expect(parseStrictCalendarDate("15.06.2025", "MM/dd/yyyy")).toBeUndefined();
    expect(parseStrictCalendarDate("06/15/2025", "dd.MM.yyyy")).toBeUndefined();
    expect(parseStrictCalendarDate("2025/06/15", "MM/dd/yyyy")).toBeUndefined();
  });

  it("accepts surrounding whitespace exactly like the bare input", () => {
    expect(iso(parseStrictCalendarDate("  06/15/2025  ", "MM/dd/yyyy"))).toBe(
      "2025-06-15",
    );
    expect(iso(parseStrictCalendarDate("  15/06/2025  ", "dd/MM/yyyy"))).toBe(
      "2025-06-15",
    );
  });
});

describe("rollingCalendarBounds", () => {
  it("spans 100 years before and after the anchor year", () => {
    const { startMonth, endMonth } = rollingCalendarBounds(
      new Date(2026, 11, 1),
    );
    expect(format(startMonth, "yyyy-MM-dd")).toBe("1926-01-01");
    expect(format(endMonth, "yyyy-MM-dd")).toBe("2126-12-31");
  });

  it("rolls when the displayed month moves into a future year", () => {
    const { startMonth, endMonth } = rollingCalendarBounds(
      new Date(2027, 0, 15),
    );
    expect(format(startMonth, "yyyy-MM-dd")).toBe("1927-01-01");
    expect(format(endMonth, "yyyy-MM-dd")).toBe("2127-12-31");
  });
});
