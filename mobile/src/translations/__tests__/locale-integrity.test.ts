/**
 * English is the source of truth for translations, and this suite is what
 * makes that true rather than aspirational: every other locale must declare
 * exactly the base's keys — no missing, no extra — and must carry every
 * interpolation token the English value carries.
 *
 * Why declaration and not lookup: locale files spread the English base, so
 * `zh.someNewKey` returns the English string rather than undefined. The gap is
 * invisible at runtime and shows up only as a user reading English inside an
 * otherwise translated app.
 */
import {
  baseKeys,
  declaredKeys,
  keyReport,
  localeModules,
  localeSource,
  spreadsBase,
  tokenMismatches,
  translationLocales,
} from "./locale-parity";
import { KNOWN_GAPS } from "./known-gaps";

describe("locale integrity", () => {
  const locales = translationLocales();

  it("finds the locale files on disk", () => {
    expect(locales.length >= 12).toBeTruthy();
  });

  it("has an imported module for every locale file", () => {
    expect(Object.keys(localeModules).sort()).toEqual(locales);
  });

  it("reads the English base without losing keys to the source scan", () => {
    // The scan and the module must agree, or every count below is measuring
    // the scanner's blind spots instead of the translations. Quoted month keys
    // ("01".."12") were exactly such a blind spot.
    expect(declaredKeys(localeSource("en")).sort()).toEqual(baseKeys().sort());
  });

  it("lists no locale in KNOWN_GAPS that has no locale file", () => {
    const unknown = Object.keys(KNOWN_GAPS).filter(
      (locale) => !locales.includes(locale),
    );
    expect(unknown).toEqual([]);
  });

  it("defers no key that the English base no longer has", () => {
    // Renaming a key in `en` leaves its old name deferred forever, which reads
    // as "not translated yet" for a key nobody can translate.
    const base = new Set(baseKeys());
    const stale = Object.keys(KNOWN_GAPS).flatMap((locale) =>
      (KNOWN_GAPS[locale] ?? [])
        .filter((key) => !base.has(key))
        .map((key) => `${locale}.${key}`),
    );
    expect(stale).toEqual([]);
  });

  for (const locale of translationLocales()) {
    describe(locale, () => {
      it("declares every key of the English base, except its known gaps", () => {
        expect(keyReport(locale).missing).toEqual(KNOWN_GAPS[locale] ?? []);
      });

      it("declares no key the English base does not have", () => {
        expect(keyReport(locale).extra).toEqual([]);
      });

      it("declares no key twice", () => {
        expect(keyReport(locale).duplicated).toEqual([]);
      });

      it("still spreads the English base as a runtime fallback", () => {
        // Otherwise a locale could satisfy the key check by dropping the
        // spread and leaving users with missing-translation markers.
        expect(spreadsBase(localeSource(locale))).toBe(true);
      });

      it("keeps every interpolation token of the keys it declares", () => {
        expect(tokenMismatches(locale)).toEqual([]);
      });
    });
  }
});
