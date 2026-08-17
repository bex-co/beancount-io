/**
 * Shared body of the per-feature translation-parity suites.
 *
 * Locale files are declared as `{ ...en, <overrides> }`, so every key exists in
 * every locale by construction and a runtime lookup can never reveal a missing
 * translation — an untranslated string just serves English. The meaningful
 * check is at the source level: a feature's keys must be explicitly declared in
 * each locale file, not merely inherited from the spread.
 *
 * The locale list is **derived from the directory**, not written down. It used
 * to be maintained in three places — this file's two callers plus
 * `SUPPORTED_LOCALES` in `../index.ts` — which meant adding a language and
 * forgetting one of them left a suite silently checking twelve locales while
 * the app shipped thirteen.
 *
 * Not named `*.test.ts`, so the runner treats it as a helper rather than a
 * suite of its own. Imports are relative because the unit-test runner does not
 * resolve the `@/` alias for value modules.
 */
import * as fs from "fs";
import * as path from "path";
import { en } from "../en";

const TRANSLATIONS_DIR = path.join(__dirname, "..");

/**
 * Every locale that overrides the English base — i.e. every `<code>.ts` in the
 * translations directory except the base itself and the barrel.
 */
export const translationLocales = (): string[] =>
  fs
    .readdirSync(TRANSLATIONS_DIR)
    .filter((entry) => entry.endsWith(".ts"))
    .map((entry) => entry.slice(0, -".ts".length))
    .filter((locale) => locale !== "en" && locale !== "index")
    .sort();

const localeSource = (locale: string) =>
  fs.readFileSync(path.join(TRANSLATIONS_DIR, `${locale}.ts`), "utf8");

interface LocaleParityOptions {
  /**
   * Keys matching the prefix that are deliberately not translated — a literal
   * account name, or a key that predates the feature and is owned elsewhere.
   */
  except?: string[];
  /** Guards against a prefix that silently matches nothing. */
  minKeys?: number;
}

/**
 * Declare a suite asserting every `<prefix>*` key of the English base is
 * explicitly declared in every other locale file.
 */
export const expectLocaleParity = (
  prefix: string,
  { except = [], minKeys = 1 }: LocaleParityOptions = {},
): void => {
  const keys = Object.keys(en).filter(
    (key) => key.startsWith(prefix) && !except.includes(key),
  );

  describe(`${prefix} translation parity`, () => {
    it("finds the feature's translation keys in the base locale", () => {
      expect(keys.length >= minKeys).toBeTruthy();
    });

    for (const locale of translationLocales()) {
      it(`declares every ${prefix} key in ${locale}`, () => {
        const source = localeSource(locale);
        const missing = keys.filter(
          (key) => !new RegExp(`^\\s*${key}:`, "m").test(source),
        );
        expect(missing).toEqual([]);
      });
    }
  });
};
