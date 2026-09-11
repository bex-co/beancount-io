import { describe, it, expect } from "vitest";
import { formatNumber } from "../format-number";

describe("formatNumber", () => {
  it("uses the supplied locale for thousands separators", () => {
    expect(formatNumber(80149.807, true, "en")).toBe("80,149.807");
    // ICU spells the French group separator with a narrow no-break space whose
    // exact code point moves between versions; the decimal comma does not.
    expect(formatNumber(80149.807, true, "fr")).toMatch(/^80.149,807$/);
  });

  it("ignores the runtime default locale", () => {
    // The regression this guards: `toLocaleString()` with no locale formats
    // with the browser's preference, so a server render and a French browser's
    // hydration disagree and React throws away the server-rendered report.
    const original = Number.prototype.toLocaleString;
    Number.prototype.toLocaleString = function (
      this: number,
      locale?: Intl.LocalesArgument,
      options?: Intl.NumberFormatOptions,
    ) {
      return original.call(this, locale ?? "fr", options);
    };
    try {
      expect(formatNumber(80149.807, true, "en")).toBe("80,149.807");
    } finally {
      Number.prototype.toLocaleString = original;
    }
  });

  it("omits separators when renderCommas is false, regardless of locale", () => {
    expect(formatNumber(1234567.89, false, "fr")).toBe("1234567.89");
    expect(formatNumber(1234567, false, "fr")).toBe("1234567");
  });

  it("strips trailing zeros without separators", () => {
    expect(formatNumber(1.5, false, "en")).toBe("1.5");
    expect(formatNumber(1.004, false, "en")).toBe("1");
  });
});
