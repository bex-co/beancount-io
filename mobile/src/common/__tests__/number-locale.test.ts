import { setNumberLocale } from "../number-locale";
import { labelRowAmount } from "../currency-util";
import {
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
