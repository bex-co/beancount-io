import {
  shortNumber,
  groupThousands,
  formatSignedMoney,
} from "../number-utils";

describe("shortNumber", () => {
  it("formats values below one thousand with a fixed decimal", () => {
    expect(shortNumber(0)).toBe("0.0");
    expect(shortNumber(12)).toBe("12.0");
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
    expect(shortNumber(-50)).toBe("-50.0");
    expect(shortNumber(-2100)).toBe("-2.1K");
    expect(shortNumber(-3500000)).toBe("-3.5M");
  });

  it("handles numeric strings", () => {
    expect(shortNumber("1250")).toBe("1.3K");
    expect(shortNumber("999" as const)).toBe("999.0");
  });

  it("returns the original value when parsing fails", () => {
    expect(shortNumber("not-a-number")).toBe("not-a-number");
  });

  it("handles zero correctly", () => {
    expect(shortNumber(0)).toBe("0.0");
    expect(shortNumber("0")).toBe("0.0");
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
    expect(shortNumber(0.01)).toBe("0.0");
  });

  it("handles very small negative numbers", () => {
    expect(shortNumber(-0.1)).toBe("-0.1");
    expect(shortNumber(-0.01)).toBe("-0.0");
  });

  it("handles empty string", () => {
    expect(shortNumber("")).toBe("");
  });

  it("handles boundary values", () => {
    expect(shortNumber(999)).toBe("999.0");
    expect(shortNumber(999999)).toBe("1000.0K");
    expect(shortNumber(999999999)).toBe("1000.0M");
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
