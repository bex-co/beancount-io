import { enUS, faIR } from "date-fns/locale";
import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "../format-relative-time";

/**
 * date-fns spells ages with ASCII digits in every locale, so Persian read
 * "11 روز پیش" beside Persian dates and amounts (w2/125).
 */
describe("formatRelativeTime", () => {
  const elevenDaysAgo = Date.now() - 11 * 24 * 60 * 60 * 1000;

  it("writes Persian ages in Persian digits", () => {
    const text = formatRelativeTime(elevenDaysAgo, faIR);
    expect(text).toContain("۱۱");
    expect(text).not.toMatch(/[0-9]/);
  });

  it("leaves English unchanged", () => {
    expect(formatRelativeTime(elevenDaysAgo, enUS)).toBe("11 days ago");
  });
});
