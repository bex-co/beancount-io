import {
  shortNumber,
  groupThousands,
  formatSignedMoney,
  formatMoneyWithCurrency,
  formatSignedMoneyWithCurrency,
  formatShortMoneyWithCurrency,
  formatUnits,
} from "../number-utils";

describe("shortNumber", () => {
  it("formats values below one thousand, dropping the decimal when whole", () => {
    expect(shortNumber(0)).toBe("0");
    expect(shortNumber(12)).toBe("12");
    expect(shortNumber(999.4)).toBe("999.4");
  });

  it("applies suffixes for large magnitudes", () => {
    expect(shortNumber(1000)).toBe("1K");
    expect(shortNumber(1250)).toBe("1.3K");
    expect(shortNumber(1500000)).toBe("1.5M");
    expect(shortNumber(2000000)).toBe("2M");
    expect(shortNumber(3500000000)).toBe("3.5B");
  });

  it("preserves the negative sign for negative values", () => {
    expect(shortNumber(-50)).toBe("-50");
    expect(shortNumber(-2100)).toBe("-2.1K");
    expect(shortNumber(-3500000)).toBe("-3.5M");
  });

  it("handles numeric strings", () => {
    expect(shortNumber("1250")).toBe("1.3K");
    expect(shortNumber("999" as const)).toBe("999");
  });

  it("returns the original value when parsing fails", () => {
    expect(shortNumber("not-a-number")).toBe("not-a-number");
  });

  it("handles zero correctly", () => {
    expect(shortNumber(0)).toBe("0");
    expect(shortNumber("0")).toBe("0");
  });

  it("handles decimal values", () => {
    expect(shortNumber(123.45)).toBe("123.5");
    expect(shortNumber(567.89)).toBe("567.9");
  });

  it("formats thousands correctly", () => {
    expect(shortNumber(1000)).toBe("1K");
    expect(shortNumber(5000)).toBe("5K");
    expect(shortNumber(10000)).toBe("10K");
  });

  it("formats millions correctly", () => {
    expect(shortNumber(1000000)).toBe("1M");
    expect(shortNumber(5000000)).toBe("5M");
    expect(shortNumber(10000000)).toBe("10M");
  });

  it("formats billions correctly", () => {
    expect(shortNumber(1000000000)).toBe("1B");
    expect(shortNumber(5000000000)).toBe("5B");
    expect(shortNumber(10000000000)).toBe("10B");
  });

  it("handles very small positive numbers", () => {
    expect(shortNumber(0.1)).toBe("0.1");
    // Two significant digits below 1: one decimal read 0.01 as "0.0" and drew a
    // BTC chart's axis as 0.0, 0.0, 0.0 (w21/236).
    expect(shortNumber(0.01)).toBe("0.01");
    expect(shortNumber(0.042)).toBe("0.042");
    expect(shortNumber(0.25)).toBe("0.25");
    expect(shortNumber(0.0005)).toBe("0.0005");
  });

  it("handles very small negative numbers", () => {
    expect(shortNumber(-0.1)).toBe("-0.1");
    expect(shortNumber(-0.01)).toBe("-0.01");
  });

  it("handles empty string", () => {
    expect(shortNumber("")).toBe("");
  });

  it("handles boundary values", () => {
    expect(shortNumber(999)).toBe("999");
    expect(shortNumber(999999)).toBe("1.0M");
    expect(shortNumber(999999999)).toBe("1.0B");
  });

  it("promotes a value whose rounding reaches the next suffix", () => {
    expect(shortNumber(999.94)).toBe("999.9");
    expect(shortNumber(999.96)).toBe("1.0K");
    expect(shortNumber(999949)).toBe("999.9K");
    expect(shortNumber(999950)).toBe("1.0M");
    expect(shortNumber(-999999)).toBe("-1.0M");
    expect(shortNumber(999999999999)).toBe("1.0T");
  });

  it("keeps the largest suffix when there is nothing to promote to", () => {
    expect(shortNumber(999e15)).toBe("999Q");
    expect(shortNumber(1e18)).toBe("1000Q");
    expect(shortNumber(1234.5e15)).toBe("1234.5Q");
  });
});

describe("groupThousands", () => {
  it("groups the integer part and keeps two decimals", () => {
    expect(groupThousands(1234.5)).toBe("1,234.50");
    expect(groupThousands(1000000)).toBe("1,000,000.00");
    expect(groupThousands(12)).toBe("12.00");
  });

  it("uses absolute value (no sign)", () => {
    expect(groupThousands(-9876.54)).toBe("9,876.54");
  });

  it("rounds to two decimals", () => {
    expect(groupThousands(0.005)).toBe("0.01");
    expect(groupThousands(999.999)).toBe("1,000.00");
  });

  it("falls back to zero for non-finite input", () => {
    expect(groupThousands(NaN)).toBe("0.00");
    expect(groupThousands(Infinity)).toBe("0.00");
  });
});

describe("formatSignedMoney", () => {
  it("prefixes a minus sign and symbol for negatives", () => {
    expect(formatSignedMoney(-1234.5, "$")).toBe("-$1,234.50");
  });

  it("omits the sign for non-negative values", () => {
    expect(formatSignedMoney(1234.5, "$")).toBe("$1,234.50");
    expect(formatSignedMoney(0, "$")).toBe("$0.00");
  });

  it("works with multi-character symbols", () => {
    expect(formatSignedMoney(2500, "CN¥")).toBe("CN¥2,500.00");
  });

  it("prefixes a plus for non-negative values when includePlus is set", () => {
    expect(formatSignedMoney(1234.5, "$", true)).toBe("+$1,234.50");
    expect(formatSignedMoney(0, "$", true)).toBe("+$0.00");
  });

  it("still prefixes a minus for negatives when includePlus is set", () => {
    expect(formatSignedMoney(-1234.5, "$", true)).toBe("-$1,234.50");
  });
});

describe("formatSignedMoneyWithCurrency", () => {
  it("prefixes the symbol for a currency with a known symbol", () => {
    expect(formatSignedMoneyWithCurrency(1234.5, "USD")).toBe("$1,234.50");
    expect(formatSignedMoneyWithCurrency(-1234.5, "USD")).toBe("-$1,234.50");
  });

  it("resolves the CNY symbol via the special case", () => {
    expect(formatSignedMoneyWithCurrency(2500, "CNY")).toBe("¥2,500.00");
  });

  it("appends the currency code when no symbol is known (e.g. MUSD)", () => {
    // The Amazon ledger reports in MUSD, which currency-icons has no symbol for.
    expect(formatSignedMoneyWithCurrency(551620, "MUSD")).toBe(
      "551,620.00 MUSD",
    );
  });

  it("keeps the sign as a prefix when appending an unknown currency code", () => {
    expect(formatSignedMoneyWithCurrency(-100, "MUSD")).toBe("-100.00 MUSD");
    expect(formatSignedMoneyWithCurrency(0, "MUSD")).toBe("0.00 MUSD");
  });

  it("prefixes a plus for gain deltas of an unknown currency", () => {
    expect(formatSignedMoneyWithCurrency(551620, "MUSD", true)).toBe(
      "+551,620.00 MUSD",
    );
  });
});

describe("formatMoneyWithCurrency", () => {
  it("prefixes the symbol for a currency with a known symbol", () => {
    expect(formatMoneyWithCurrency(1234.5, "USD")).toBe("$1,234.50");
    expect(formatMoneyWithCurrency(2500, "CNY")).toBe("¥2,500.00");
  });

  it("appends the currency code when no symbol is known (e.g. MUSD)", () => {
    expect(formatMoneyWithCurrency(846425, "MUSD")).toBe("846,425.00 MUSD");
  });

  it("shows the absolute value with no sign (the caller owns the sign)", () => {
    // Balances/totals render unsigned; a negative value drops its sign.
    expect(formatMoneyWithCurrency(-544069, "USD")).toBe("$544,069.00");
    expect(formatMoneyWithCurrency(-544069, "MUSD")).toBe("544,069.00 MUSD");
  });
});

describe("formatShortMoneyWithCurrency", () => {
  it("puts the sign before a known currency symbol", () => {
    expect(formatShortMoneyWithCurrency(-50, "USD")).toBe("-$50");
    expect(formatShortMoneyWithCurrency(50, "USD")).toBe("$50");
  });

  it("labels a currency without a symbol by its code", () => {
    expect(formatShortMoneyWithCurrency(400, "MUSD")).toBe("400 MUSD");
    expect(formatShortMoneyWithCurrency(-200, "MUSD")).toBe("-200 MUSD");
  });

  it("formats zero and suffixed magnitudes", () => {
    expect(formatShortMoneyWithCurrency(0, "USD")).toBe("$0");
    expect(formatShortMoneyWithCurrency(1500000, "USD")).toBe("$1.5M");
  });
});

describe("formatUnits", () => {
  it("keeps the recorded scale instead of rounding to cents", () => {
    expect(formatUnits(597.748, "RGAGX", 3)).toBe("597.748 RGAGX");
    expect(formatUnits(0.004, "ETH", 3)).toBe("0.004 ETH");
  });

  it("drops the decimal point for a whole-unit commodity", () => {
    expect(formatUnits(-54500, "IRAUSD", 0)).toBe("-54,500 IRAUSD");
  });

  it("signs the amount and never gives a commodity a money symbol", () => {
    expect(formatUnits(1.843, "RGAGX", 3, true)).toBe("+1.843 RGAGX");
    expect(formatUnits(-5, "VACHR", 0, true)).toBe("-5 VACHR");
    expect(formatUnits(2, "USD", 0)).toBe("2 USD");
  });

  it("rounds a float sum back to the recorded scale", () => {
    expect(formatUnits(1.843 + 3.685, "RGAGX", 3)).toBe("5.528 RGAGX");
  });

  it("clamps a scale toFixed would reject", () => {
    expect(formatUnits(1.5, "XYZ", 99)).toBe("1.50000000000000000000 XYZ");
  });
});

// w21/070: a JPY ledger read "円1,500.00" — currency-icons' 円 as a prefix and
// cents on a currency with no minor unit.
describe("money at its currency's minor unit", () => {
  it("shows the yen and won whole, with the ¥ sign", () => {
    expect(formatMoneyWithCurrency(1500, "JPY")).toBe("¥1,500");
    expect(formatSignedMoneyWithCurrency(1500, "JPY", true)).toBe("+¥1,500");
    expect(formatMoneyWithCurrency(50000, "KRW")).toBe("₩50,000");
    expect(formatShortMoneyWithCurrency(1500, "JPY")).toBe("¥1.5K");
  });

  it("gives three-decimal dinars their third place", () => {
    const kwd = formatSignedMoneyWithCurrency(-12.345, "KWD");
    expect(kwd.startsWith("-")).toBe(true);
    expect(kwd.endsWith("12.345")).toBe(true);
  });

  // w21/698: an Arabic-script symbol turned the whole figure right-to-left, so
  // "-د.ك1,234.500" drew its minus at the far end, as `1,234.500ك.د-`.
  it("keeps an Arabic-script symbol in its own right-to-left isolate", () => {
    const rli = (symbol: string) => `\u2067${symbol}\u2069`;
    expect(formatSignedMoneyWithCurrency(-1234.5, "KWD")).toBe(
      `-${rli("د.ك")}1,234.500`,
    );
    expect(formatSignedMoneyWithCurrency(0, "KWD", true)).toBe(
      `+${rli("د.ك")}0.000`,
    );
    expect(formatMoneyWithCurrency(1234.5, "AED")).toBe(
      `${rli("د.إ")}1,234.50`,
    );
    // Written after the number where the language does, still isolated.
    expect(formatShortMoneyWithCurrency(-1500, "KWD", "de")).toBe(
      `-1,5 Tsd. ${rli("د.ك")}`,
    );
    // The hero rolls its digits: the sign and symbol stay one run, isolated.
    const {
      rollingGlyphs,
    } = require("../../components/amount-text/rolling-glyphs");
    expect(
      rollingGlyphs(formatSignedMoneyWithCurrency(-1.5, "KWD"))[0],
    ).toEqual({ key: "s5", text: `-${rli("د.ك")}` });
  });

  it("drops the stray periods currency-icons gives BHD, OMR, SDG and MAD", () => {
    const rli = (symbol: string) => `\u2067${symbol}\u2069`;
    expect(formatSignedMoneyWithCurrency(-1, "BHD")).toBe(
      `-${rli("د.ب")}1.000`,
    );
    expect(formatSignedMoneyWithCurrency(-1, "OMR")).toBe(
      `-${rli("ر.ع")}1.000`,
    );
    expect(formatSignedMoneyWithCurrency(-1, "SDG")).toBe(`-${rli("ج.س")}1.00`);
    expect(formatSignedMoneyWithCurrency(-1, "MAD")).toBe(`-${rli("د.م")}1.00`);
  });

  it("leaves two-decimal currencies and custom commodities alone", () => {
    expect(formatMoneyWithCurrency(1234.5, "USD")).toBe("$1,234.50");
    expect(formatMoneyWithCurrency(1234.5, "MUSD")).toBe("1,234.50 MUSD");
    expect(formatMoneyWithCurrency(10, "CNY")).toBe("¥10.00");
  });
});

// w21/125: a dust balance arrived as "5e-7" and read "0 BTC".
describe("amountScale with exponent notation", () => {
  const { amountScale } = require("../number-utils");
  it("moves the point by the exponent", () => {
    expect(amountScale("5e-7")).toBe(7);
    expect(amountScale("1.5e-7")).toBe(8);
    expect(amountScale("1.25E+2")).toBe(0);
    expect(amountScale("0.0000005")).toBe(7);
    expect(formatUnits(Number("5e-7"), "BTC", amountScale("5e-7"))).toBe(
      "0.0000005 BTC",
    );
  });
});

// w21/177: compact amounts used English K/M/B in every language.
describe("compact amounts in the app's language", () => {
  it("abbreviates as each language does", () => {
    expect(formatShortMoneyWithCurrency(1500, "USD", "de")).toBe("1,5 Tsd. $");
    expect(formatShortMoneyWithCurrency(305e9, "USD", "de")).toBe("305 Mrd. $");
    expect(formatShortMoneyWithCurrency(1500, "USD", "ru")).toBe("1,5 тыс. $");
    expect(formatShortMoneyWithCurrency(-2.5e6, "USD", "fr")).toBe("-2,5 M $");
    expect(formatShortMoneyWithCurrency(1500, "USD", "zh")).toBe("$1.5千");
  });

  it("leaves English as it was", () => {
    expect(formatShortMoneyWithCurrency(1500, "USD")).toBe("$1.5K");
    expect(formatShortMoneyWithCurrency(1500, "USD", "en")).toBe("$1.5K");
    expect(formatShortMoneyWithCurrency(305e9, "USD", "en")).toBe("$305B");
  });

  it("labels a currency with no symbol by its code", () => {
    expect(formatShortMoneyWithCurrency(1500, "MUSD", "de")).toBe(
      "1,5 Tsd. MUSD",
    );
  });

  it("falls back to English for an unknown language", () => {
    expect(formatShortMoneyWithCurrency(1500, "USD", "xx")).toBe("$1.5K");
  });
});
