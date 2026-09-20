import { describe, expect, it } from "vitest";
import * as locales from "@/i18n/locales";
import {
  SCANNED_LOCALES,
  UNCLASSIFIED_LOCALES,
  type ScannedLocale,
  strayEnglishWords,
} from "./locale-scan";

/**
 * A translation pass that replaces a leading token and leaves the rest in
 * English has now been repaired three times — Catalan (w4/m14), Russian
 * (w4/149) and Ukrainian (w4/m24). Each was found by accident while chasing
 * something else. This guard looks for it in every locale whose script is not
 * Latin, so a fourth cannot ship unnoticed.
 */

const ALL = locales as unknown as Record<string, Record<string, string>>;

/**
 * Damage that exists on `main` today, listed key by key so that repairing one
 * forces this list to shrink. Each group names the note that owns the work;
 * nothing is hidden in the allowlist, which is only for Latin that belongs in
 * a translated string.
 */
const KNOWN_DEVIATIONS: Partial<
  Record<ScannedLocale, { note: string; keys: readonly string[] }>
> = {
  // Empty, and that is the point: every scanned locale is clean as of
  // w4/153 (Russian), w4/155 (the OAuth keys) and w4/156 (Bulgarian,
  // Persian, Korean and Chinese). The shape stays so that a locale which
  // cannot be repaired immediately is recorded key by key against the note
  // that owns it, rather than hidden in the allowlist.
};

const isKnown = (locale: ScannedLocale, key: string) =>
  KNOWN_DEVIATIONS[locale]?.keys.includes(key) ?? false;

const SCANNED = Object.keys(SCANNED_LOCALES) as ScannedLocale[];

describe("no locale ships a half-translated message", () => {
  it.each(SCANNED)(
    "%s leaves no English word stranded in its own script",
    (locale) => {
      const offenders: string[] = [];
      for (const [key, message] of Object.entries(ALL[locale] ?? {})) {
        if (isKnown(locale, key)) continue;
        const stray = strayEnglishWords(message, locale);
        if (stray.length) {
          offenders.push(`${locale}/${key}: ${message} -> ${stray.join(", ")}`);
        }
      }
      expect(offenders).toEqual([]);
    },
  );

  it("keeps every known deviation real, so the list shrinks as they are fixed", () => {
    // A key listed here that is already clean would quietly excuse a future
    // regression on that key.
    const stale: string[] = [];
    for (const [locale, { note, keys }] of Object.entries(KNOWN_DEVIATIONS) as [
      ScannedLocale,
      { note: string; keys: readonly string[] },
    ][]) {
      for (const key of keys) {
        const message = ALL[locale]?.[key];
        if (message === undefined) {
          stale.push(`${note} ${locale}/${key}: key no longer exists`);
          continue;
        }
        const damaged = strayEnglishWords(message, locale).length > 0;
        if (!damaged) stale.push(`${note} ${locale}/${key}: already clean`);
      }
    }
    expect(stale).toEqual([]);
  });

  it("classifies every supported language as scannable or Latin-script", () => {
    // A new non-Latin locale added to SUPPORTED_LANGUAGES would otherwise go
    // unscanned with nothing failing.
    expect(UNCLASSIFIED_LOCALES).toEqual([]);
  });

  it("withholds an allowlisted term's exemption when it is glued to the script", () => {
    // The exemption exists for terms standing as their own word. `Банк` and
    // `Bank` side by side is the defect, and stripping `Bank` first would hide
    // it — the reason the rule is inside the predicate rather than a second
    // pass over the same catalogs.
    expect(strayEnglishWords("Банк Bank", "uk")).toEqual([]);
    // The Latin run is what is reported; the Cyrillic prefix is what makes it
    // damage rather than an exempt term.
    expect(strayEnglishWords("БанкBank", "uk")).toEqual(["Bank"]);
    // Japanese writes brand names against its script with no space, so there
    // the exemption still holds.
    expect(strayEnglishWords("Beancountについて", "ja")).toEqual([]);
  });

  it.each(Object.keys(SCANNED_LOCALES) as ScannedLocale[])(
    "carries no deviation for %s — every scanned locale is clean",
    (locale) => {
      expect(KNOWN_DEVIATIONS[locale]).toBeUndefined();
    },
  );
});
