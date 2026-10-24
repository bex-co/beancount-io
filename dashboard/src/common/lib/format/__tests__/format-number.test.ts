import { describe, it, expect } from "vitest";
import {
  currencyMinorDigits,
  formatNumber,
  fractionDigitsOf,
} from "../format-number";

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

describe("formatNumber with a currency (w0/010)", () => {
  it("writes an ISO currency at its minor-unit precision", () => {
    expect(formatNumber(4559.8, true, "en", "USD")).toBe("4,559.80");
    expect(formatNumber(109529.339, true, "en", "USD")).toBe("109,529.34");
    expect(formatNumber(-2095.6, true, "en", "USD")).toBe("-2,095.60");
    expect(formatNumber(1200, true, "en", "JPY")).toBe("1,200");
    expect(formatNumber(1.2345, true, "en", "KWD")).toBe("1.235");
  });

  it("lets render_commas change grouping only, not precision", () => {
    expect(formatNumber(48471.38532, true, "en", "USD")).toBe("48,471.39");
    expect(formatNumber(48471.38532, false, "en", "USD")).toBe("48471.39");
  });

  it("keeps source-driven formatting for non-ISO commodities", () => {
    expect(formatNumber(1346.683, true, "en", "MUSD")).toBe("1,346.683");
    expect(formatNumber(64, true, "en", "VHT")).toBe("64");
    expect(formatNumber(-13, true, "en", "VACHR")).toBe("-13");
    expect(formatNumber(0.5, true, "en", "BTC")).toBe("0.5");
  });

  it("never prints a negative zero for a sub-cent residue", () => {
    expect(formatNumber(-0.003, true, "en", "USD")).toBe("0.00");
    expect(formatNumber(-0.005, true, "en", "USD")).toBe("-0.01");
  });

  it("is unchanged without a currency", () => {
    expect(formatNumber(4559.8, true, "en")).toBe("4,559.8");
  });
});

describe("formatNumber with source fraction digits (w4/m45)", () => {
  it("keeps every digit a non-ISO source decimal carried", () => {
    expect(formatNumber(4.00995, true, "en", "ETH", 5)).toBe("4.00995");
    expect(formatNumber(4.00995, false, "en", "ETH", 5)).toBe("4.00995");
    expect(formatNumber(-4.00995, true, "en", "ETH", 5)).toBe("-4.00995");
    expect(formatNumber(0.0004, true, "en", "BTC", 4)).toBe("0.0004");
    expect(formatNumber(1234.56789, true, "en", "ETH", 5)).toBe("1,234.56789");
    expect(formatNumber(1234.56789, false, "en", "ETH", 5)).toBe("1234.56789");
    expect(formatNumber(1234.56789, true, "fr", "ETH", 5)).toMatch(
      /^1.234,56789$/,
    );
  });

  it("rounds computed residue to the recorded precision", () => {
    expect(formatNumber(0.1 + 0.2, true, "en", "ETH", 1)).toBe("0.3");
    expect(formatNumber(0.00039999999999999996, true, "en", "BTC", 4)).toBe(
      "0.0004",
    );
  });

  it("never drops below the cash fallback's own digits", () => {
    // Fewer source digits than the fallback shows change nothing, in either
    // render_commas mode, so every existing caller formats as before.
    for (const value of [0.16, 68033, 1.2345, 22.580645, -0.5]) {
      for (const digits of [0, 1, 2]) {
        expect(formatNumber(value, true, "en", "BTC", digits)).toBe(
          formatNumber(value, true, "en", "BTC"),
        );
        expect(formatNumber(value, false, "en", "BTC", digits)).toBe(
          formatNumber(value, false, "en", "BTC"),
        );
      }
    }
    expect(formatNumber(1.2345, true, "en", "BTC")).toBe("1.235");
    expect(formatNumber(1.2345, false, "en", "BTC")).toBe("1.23");
  });

  it("leaves an ISO currency at its minor units", () => {
    expect(formatNumber(68033, true, "en", "USD", 5)).toBe("68,033.00");
    expect(formatNumber(4.00995, true, "en", "USD", 5)).toBe("4.01");
    expect(formatNumber(1234.5, true, "en", "JPY", 3)).toBe("1,235");
  });
});

describe("formatNumber with an exact decimal string (w4/m52)", () => {
  it("formats a balance a double cannot hold, digit for digit", () => {
    // 2^53 + 1: as a number this is 9007199254740992.
    expect(formatNumber("9007199254740993", true, "en", "USD")).toBe(
      "9,007,199,254,740,993.00",
    );
    expect(formatNumber("9007199254740993", false, "en", "USD")).toBe(
      "9007199254740993.00",
    );
    expect(formatNumber("-9007199254740993.5", true, "de", "EUR")).toBe(
      "-9.007.199.254.740.993,50",
    );
  });

  it("keeps a commodity's source digits and the ungrouped '.' separator", () => {
    expect(formatNumber("12345678901234.00995", true, "en", "ETH", 5)).toBe(
      "12,345,678,901,234.00995",
    );
    expect(formatNumber("12345678901234.00995", false, "de", "ETH", 5)).toBe(
      "12345678901234.00995",
    );
  });

  it("formats ordinary amounts as the number would, without a negative zero", () => {
    expect(formatNumber("4559.8", true, "en", "USD")).toBe(
      formatNumber(4559.8, true, "en", "USD"),
    );
    expect(formatNumber("-0.001", true, "en", "USD")).toBe("0.00");
  });
});

describe("formatNumber with more than 20 source places (w4/1001)", () => {
  it("keeps a tiny decimal string nonzero, digit for digit", () => {
    const tiny = "0.000000000000000000000001";
    expect(formatNumber(tiny, true, "en", "NEAR", fractionDigitsOf(tiny))).toBe(
      tiny,
    );
    expect(
      formatNumber(tiny, false, "en", "NEAR", fractionDigitsOf(tiny)),
    ).toBe(tiny);
  });

  it("still caps a double at 20 places", () => {
    expect(formatNumber(1e-24, true, "en", "NEAR", 24)).toBe("0");
  });
});

// w21/993: CLDR's cash digits rounded HUF, COP, IDR and PKR to whole units.
describe("ISO 4217 minor units", () => {
  it("keeps the cents of the currencies CLDR rounds to whole units", () => {
    expect(formatNumber("1234.56", true, "en", "HUF")).toBe("1,234.56");
    for (const code of ["COP", "IDR", "PKR", "AFN", "ALL", "YER"]) {
      expect(currencyMinorDigits(code)).toBe(2);
    }
  });

  it("keeps three digits for the dinar, and none for yen and won", () => {
    expect(formatNumber("1234.567", true, "en", "IQD")).toBe("1,234.567");
    expect(currencyMinorDigits("JPY")).toBe(0);
    expect(currencyMinorDigits("KRW")).toBe(0);
    expect(currencyMinorDigits("USD")).toBe(2);
    expect(currencyMinorDigits("KWD")).toBe(3);
  });

  it("leaves a commodity that is not an ISO currency alone", () => {
    expect(currencyMinorDigits("BTC")).toBe(undefined);
  });
});
