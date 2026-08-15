/**
 * Locale files are declared as `{ ...en, <overrides> }`, so every key exists in
 * every locale by construction and a runtime lookup can never reveal a missing
 * translation — an untranslated string just serves English. The meaningful
 * check is at the source level: each account-picker key must be explicitly
 * declared in each locale file, not merely inherited from the spread.
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

const pickerKeys = Object.keys(en).filter((key) =>
  key.startsWith("accountPicker"),
);

const localeSource = (locale: string) =>
  fs.readFileSync(path.join(__dirname, "..", `${locale}.ts`), "utf8");

describe("account picker translation parity", () => {
  it("finds the feature's translation keys in the base locale", () => {
    expect(pickerKeys.length > 0).toBeTruthy();
  });

  for (const locale of LOCALES) {
    it(`declares every account-picker key in ${locale}`, () => {
      const source = localeSource(locale);
      const missing = pickerKeys.filter(
        (key) => !new RegExp(`^\\s*${key}:`, "m").test(source),
      );
      expect(missing).toEqual([]);
    });
  }
});
