import { formatLedgerMonth } from "../../common/date-format";
import { translationLocales } from "./locale-parity";

// w21/584: translations that said something else than the English they stand for.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const catalogOf = (locale: string) => require(`../${locale}`)[locale];

describe("translation meaning fixes", () => {
  it("zh: the amount hint says the sign button switches positive and negative, not income and expense", () => {
    const hint: string = catalogOf("zh").postingAmountHint;
    expect(hint.includes("收支")).toBe(false);
    expect(hint.includes("正数和负数")).toBe(true);
  });

  it("sk: an unconfirmed write is 'not confirmed', not 'refused'", () => {
    const text: string = catalogOf("sk").ledgerWriteUnconfirmed;
    expect(text.startsWith("Server nepotvrdil uloženie.")).toBe(true);
    expect(text.includes("neprijal")).toBe(false);
  });
});

// w21/850: the caption opens the holdings sheet even when it holds only unpriced
// or excluded holdings, with no price date, so the hint cannot promise dates.
describe("valuationDetailsHint", () => {
  it("never promises price dates, in any language", () => {
    expect(catalogOf("en").valuationDetailsHint).toBe(
      "Shows the holdings behind this total",
    );
    expect(/date/i.test(catalogOf("en").valuationDetailsHint)).toBe(false);
    for (const locale of translationLocales()) {
      const hint: string = catalogOf(locale).valuationDetailsHint;
      expect(hint.length > 0).toBe(true);
    }
  });
});

// w22/013: Reports says which month it shows through, with the month filled in
// as `formatLedgerMonth` writes it: month plus year, which ICU gives in the
// standalone (nominative) form, "жовтень 2026 р." and "október 2026". Ukrainian
// "до" and Slovak "do" take the genitive, so "до жовтень" read as a grammar
// error in the app's own sentence. Only the day-bearing date forms decline.
describe("reportsThroughLatestMonth", () => {
  const through = (locale: string) =>
    (catalogOf(locale).reportsThroughLatestMonth as string).replace(
      "{{month}}",
      formatLedgerMonth("2026-10", locale),
    );

  it("puts the month where no preposition governs its case, in Ukrainian and Slovak", () => {
    for (const locale of ["uk", "sk"]) {
      const text: string = catalogOf(locale).reportsThroughLatestMonth;
      expect(/: \{\{month\}\}\.?$/.test(text)).toBe(true);
    }
    expect(through("uk")).toBe(
      "Показано останній місяць із записами: жовтень 2026 р.",
    );
    expect(through("sk")).toBe(
      "Zobrazuje sa posledný mesiac so záznamami: október 2026.",
    );
  });

  it("never doubles the sentence's closing period, which a month like 'р.' already ends", () => {
    // Seen on the simulator: "жовтень 2026 р.." when the sentence added its own.
    for (const locale of translationLocales()) {
      expect(through(locale).includes("..")).toBe(false);
    }
  });

  it("still carries the month in every language, and leaves English as it was", () => {
    expect(catalogOf("en").reportsThroughLatestMonth).toBe(
      "Showing through {{month}}, the latest month with entries.",
    );
    for (const locale of translationLocales()) {
      expect(
        catalogOf(locale).reportsThroughLatestMonth.includes("{{month}}"),
      ).toBe(true);
    }
  });
});
