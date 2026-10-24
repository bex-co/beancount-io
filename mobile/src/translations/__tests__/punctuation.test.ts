import { localeModules, translationLocales } from "./locale-parity";

// w21/991: "38 %" and "73%" in one language, and three ASCII dots for an ellipsis.
describe("punctuation in the translations", () => {
  const strings = (locale: string): [string, string][] =>
    Object.entries(localeModules[locale]!).flatMap(([key, value]) =>
      typeof value === "string"
        ? [[key, value] as [string, string]]
        : Object.entries(value).map(
            ([form, text]) => [`${key}.${form}`, text] as [string, string],
          ),
    );

  it("writes a percent one way within a locale", () => {
    for (const locale of translationLocales()) {
      const separators = new Set<string>();
      for (const [, text] of strings(locale)) {
        for (const match of text.matchAll(/\{\{percent\}\}(.?)[%٪]/gu)) {
          separators.add(match[1] === "%" || match[1] === "٪" ? "" : match[1]!);
        }
      }
      expect([locale, [...separators].length <= 1]).toEqual([locale, true]);
    }
    // German, French and Slovak set the sign off with a no-break space.
    for (const locale of ["de", "fr", "sk"]) {
      expect(
        (localeModules[locale]!.breakdownRowShareSpending as string).includes(
          "{{percent}} %",
        ),
      ).toBe(true);
    }
  });

  it("ends no string in three ASCII dots", () => {
    for (const locale of translationLocales()) {
      const offenders = strings(locale)
        .filter(([, text]) => /[^.]\.\.\.$/u.test(text))
        .map(([key]) => key);
      expect([locale, offenders]).toEqual([locale, []]);
    }
  });
});
