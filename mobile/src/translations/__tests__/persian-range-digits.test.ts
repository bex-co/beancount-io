import { localeModules } from "./locale-parity";

// w21/1017: the period pills used Latin digits while every number around them
// was written in Persian digits.
describe("Persian range labels", () => {
  const fa = localeModules["fa"]! as Record<string, unknown>;
  const rangeKeys = Object.keys(fa).filter((key) =>
    /^range(Spoken)?[A-Z0-9]/.test(key),
  );

  it("finds the pill and spoken labels", () => {
    expect(rangeKeys.includes("range1M")).toBe(true);
    expect(rangeKeys.includes("rangeSpoken1Y")).toBe(true);
  });

  it("has no Latin digit in any of them", () => {
    const offenders = rangeKeys.filter((key) => /[0-9]/.test(String(fa[key])));
    expect(offenders).toEqual([]);
  });

  it("writes the one-month pill and its spoken form with Persian digits", () => {
    expect(fa["range1M"]).toBe("۱م");
    expect(fa["rangeSpoken1M"]).toBe("۱ ماه");
  });
});
