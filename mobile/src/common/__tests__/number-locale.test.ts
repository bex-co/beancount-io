import fs from "fs";
import path from "path";
import { percentSign, setNumberLocale } from "../number-locale";
import { labelRowAmount } from "../currency-util";
import { formatChangePercent } from "../d3/change-percent";
import {
  formatPercentWhole,
  formatExactUnits,
  formatMoneyWithCurrency,
  formatShortMoneyWithCurrency,
  formatSignedMoneyWithCode,
  formatSignedMoneyWithCurrency,
  formatUnits,
  groupThousands,
} from "../number-utils";

// w21/882: a chart's ticks followed the app language while the amounts beside
// them were always English, so a German reader met "1,5 Tsd. €" over "€1,500.50".
describe("full amounts in the app language", () => {
  afterEach(() => setNumberLocale("en"));

  it("keeps English and Chinese as they were", () => {
    for (const locale of ["en", "zh"]) {
      setNumberLocale(locale);
      expect(formatMoneyWithCurrency(1500.5, "EUR")).toBe("€1,500.50");
      expect(formatSignedMoneyWithCurrency(-1500.5, "USD")).toBe("-$1,500.50");
    }
  });

  it("writes German with a decimal comma and the euro after", () => {
    setNumberLocale("de");
    expect(formatMoneyWithCurrency(1500.5, "EUR")).toBe("1.500,50 €");
    expect(formatSignedMoneyWithCurrency(-1234567.5, "EUR")).toBe(
      "-1.234.567,50 €",
    );
    expect(groupThousands(1234.5)).toBe("1.234,50");
  });

  it("agrees with the axis beside it on separators and symbol position", () => {
    setNumberLocale("de");
    const tick = formatShortMoneyWithCurrency(1500, "EUR", "de");
    const amount = formatMoneyWithCurrency(1500, "EUR");
    expect(tick).toBe("1,5 Tsd. €");
    expect(amount.endsWith(" €")).toBe(true);
    expect(amount.includes(",")).toBe(true);
  });

  it("keeps the currency before the number where the language does", () => {
    setNumberLocale("nl");
    expect(formatMoneyWithCurrency(1500.5, "EUR")).toBe("€1.500,50");
    setNumberLocale("pt");
    expect(formatSignedMoneyWithCurrency(-2500, "USD")).toBe("-$2.500,00");
  });

  it("uses a narrow no-break space in French and no-break spaces in Russian", () => {
    setNumberLocale("fr");
    expect(formatMoneyWithCurrency(1234567.89, "EUR")).toBe("1 234 567,89 €");
    setNumberLocale("ru");
    expect(formatMoneyWithCurrency(1234567.89, "EUR")).toBe("1 234 567,89 €");
  });

  it("leaves a four-digit whole ungrouped where the language does", () => {
    setNumberLocale("es");
    expect(formatMoneyWithCurrency(1500.5, "EUR")).toBe("1500,50 €");
    expect(formatMoneyWithCurrency(15000.5, "EUR")).toBe("15.000,50 €");
  });

  it("writes Persian digits and separators, keeping a zero a zero", () => {
    setNumberLocale("fa");
    expect(formatMoneyWithCurrency(1500.5, "USD")).toBe("$۱٬۵۰۰٫۵۰");
    expect(formatSignedMoneyWithCurrency(-0.001, "USD")).toBe("$۰٫۰۰");
  });

  it("localizes the code-labelled forms: units, exact units, row labels", () => {
    setNumberLocale("de");
    expect(formatUnits(1234.5, "RGAGX", 3)).toBe("1.234,500 RGAGX");
    expect(formatExactUnits("-1234.50", "BTC")).toBe("-1.234,50 BTC");
    expect(formatSignedMoneyWithCode(-1234.5, "CAD")).toBe("-1.234,50 CAD");
    expect(labelRowAmount("1,234.50", "USD")).toBe("1.234,50 $");
    expect(labelRowAmount("1,234.50", "CAD")).toBe("1.234,50 CAD");
  });
});

// w22/042: Reports' category shares printed a Latin "100%" under Persian-digit
// amounts, and the chart change row ended in a Latin "%" after Persian digits;
// the translated sentences already wrote "٪" (w21/991).
describe("percentages in the app language", () => {
  afterEach(() => setNumberLocale("en"));

  it("keeps the percent sign everywhere but Persian", () => {
    for (const locale of ["en", "zh", "de", "es", "fr", "ru", "uk"]) {
      setNumberLocale(locale);
      expect(percentSign()).toBe("%");
    }
    setNumberLocale("fa");
    expect(percentSign()).toBe("\u066a");
  });

  it("writes a whole share in the language's digits and sign", () => {
    expect(formatPercentWhole(100)).toBe("100%");
    setNumberLocale("de");
    expect(formatPercentWhole(38)).toBe("38%");
    setNumberLocale("fa");
    expect(formatPercentWhole(100)).toBe("۱۰۰٪");
    expect(formatPercentWhole(0)).toBe("۰٪");
  });

  it("writes the chart change row's percentage the same way", () => {
    expect(formatChangePercent(0.63).text).toBe("+0.63%");
    setNumberLocale("de");
    expect(formatChangePercent(-12.5).text).toBe("-12,50%");
    setNumberLocale("fa");
    expect(formatChangePercent(0.63).text).toBe("+۰٫۶۳٪");
    expect(formatChangePercent(-1234.5).text).toBe("-۱٬۲۳۴٫۵۰٪");
  });

  it("is what the Reports breakdown row prints, not a literal percent sign", () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "..",
        "screens",
        "reports-screen",
        "components",
        "category-breakdown.tsx",
      ),
      "utf8",
    );
    expect(source.includes("formatPercentWhole(printed)")).toBe(true);
    expect(source.includes("`${printed}%`")).toBe(false);
  });
});
