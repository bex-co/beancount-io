/**
 * Locale files are declared as `{ ...en, <overrides> }`, so every key exists in
 * every locale by construction and a runtime lookup can never reveal a missing
 * translation — an untranslated string just serves English. The meaningful
 * check is at the source level: each budget key must be explicitly declared in
 * each locale file, not merely inherited from the spread.
 */
import * as fs from "fs";
import * as path from "path";
import { en } from "../en";

const LOCALES = [
  "zh",
  "bg",
  "ca",
  "de",
  "es",
  "fa",
  "fr",
  "nl",
  "pt",
  "ru",
  "sk",
  "uk",
];

const NOT_TRANSLATABLE = [
  // Predate the feature (they label the journal's directive filter) and are
  // translated in their own right.
  "budget",
  "budgetEntries",
  // A literal Beancount account name — the same text in every language.
  "budgetAccountPlaceholder",
];

const budgetKeys = Object.keys(en).filter(
  (key) => key.startsWith("budget") && !NOT_TRANSLATABLE.includes(key),
);

const localeSource = (locale: string) =>
  fs.readFileSync(path.join(__dirname, "..", `${locale}.ts`), "utf8");

describe("budget translation parity", () => {
  it("finds the feature's translation keys in the base locale", () => {
    expect(budgetKeys.length > 20).toBeTruthy();
  });

  for (const locale of LOCALES) {
    it(`declares every budget key in ${locale}`, () => {
      const source = localeSource(locale);
      const missing = budgetKeys.filter(
        (key) => !new RegExp(`^\\s*${key}:`, "m").test(source),
      );
      expect(missing).toEqual([]);
    });
  }
});
