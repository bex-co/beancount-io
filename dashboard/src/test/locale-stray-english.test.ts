import { describe, expect, it } from "vitest";
import * as locales from "@/i18n/locales";
import {
  ADJACENCY_IS_DAMAGE,
  LOCALE_SCRIPTS,
  hasGluedLatin,
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
const KNOWN_DEVIATIONS: ReadonlyArray<{
  note: string;
  locale: string;
  keys: readonly string[];
}> = [
  {
    // The remaining Russian catalogs, outside the two w4/149 repaired.
    note: "w4/153",
    locale: "ru",
    keys: [
      "common.balanceSheet",
      "common.incomeStatement",
      "seo.welcome.description",
      "userSettings.accountDeleted",
      "userSettings.changeUsername",
      "userSettings.deleteAccountDialogDescription",
      "userSettings.deleteAccountQuestion",
      "userSettings.deleteKey",
      "userSettings.deleteSshKey",
      "userSettings.manageActiveSession",
      "userSettings.manageSubscription",
      "userSettings.userProfile",
      "page.trialBalance.equityHierarchy",
      "page.trialBalance.expensesHierarchy",
      "page.trialBalance.incomeHierarchy",
      "page.trialBalance.liabilitiesHierarchy",
      "page.overview.liabilitiesDistribution",
      "page.overview.starButton.unstarSuccess",
      "page.documents.documents",
      "page.documents.noDocumentsFound",
      "page.errors.errors",
      "page.events.events",
      "page.events.noEventsFoundForLedger",
      "page.holdings.holdingsByAccount",
      "page.holdings.holdingsByCostCurrency",
      "page.holdings.holdingsByCurrency",
      "page.holdings.queryResult",
      "page.statistics.accountLastEntries",
      "page.statistics.lastEntryDate",
      "page.bql.queryResult",
    ],
  },
  {
    note: "w4/156",
    locale: "bg",
    keys: ["seo.welcome.description", "page.overview.starButton.unstarSuccess"],
  },
  { note: "w4/156", locale: "fa", keys: ["seo.welcome.description"] },
  {
    note: "w4/156",
    locale: "ko",
    keys: ["page.overview.starButton.starSuccess"],
  },
  {
    note: "w4/156",
    locale: "zh",
    keys: [
      "page.accountReport.accountBalance",
      "page.accountReport.accountJournal",
      "page.accountReport.title",
      "page.accountReport.noJournalEntriesForAccount",
      "page.overview.starButton.starSuccess",
      "page.overview.starButton.unstarSuccess",
      "page.holdings.noDataReturnedFromQuery",
      "page.statistics.noDataAvailableForQuery",
      "page.bql.noDataReturnedFromQuery",
    ],
  },
];

function deviationsFor(locale: string): Set<string> {
  return new Set(
    KNOWN_DEVIATIONS.filter((d) => d.locale === locale).flatMap((d) => d.keys),
  );
}

const SCANNED = Object.keys(LOCALE_SCRIPTS);

describe("no locale ships a half-translated message", () => {
  it.each(SCANNED)(
    "%s leaves no English word stranded in its own script",
    (locale) => {
      const script = LOCALE_SCRIPTS[locale]!;
      const known = deviationsFor(locale);
      const offenders: string[] = [];
      for (const [key, message] of Object.entries(ALL[locale] ?? {})) {
        if (known.has(key)) continue;
        const stray = strayEnglishWords(message, script);
        if (stray.length) {
          offenders.push(`${locale}/${key}: ${message} -> ${stray.join(", ")}`);
        }
      }
      expect(offenders).toEqual([]);
    },
  );

  it.each(SCANNED.filter((l) => ADJACENCY_IS_DAMAGE.has(l)))(
    "%s never glues Latin straight onto Cyrillic",
    (locale) => {
      // In a space-separated script this is always damage: `Документs` and
      // `Файлs` are words in neither language. Japanese, Korean and Chinese
      // are excluded because they write `Beancountについて` without a space.
      const known = deviationsFor(locale);
      const offenders = Object.entries(ALL[locale] ?? {})
        .filter(([key, message]) => !known.has(key) && hasGluedLatin(message))
        .map(([key, message]) => `${locale}/${key}: ${message}`);
      expect(offenders).toEqual([]);
    },
  );

  it("keeps every known deviation real, so the list shrinks as they are fixed", () => {
    // A key listed here that is already clean would quietly excuse a future
    // regression on that key.
    const stale: string[] = [];
    for (const { locale, keys, note } of KNOWN_DEVIATIONS) {
      const script = LOCALE_SCRIPTS[locale]!;
      for (const key of keys) {
        const message = ALL[locale]?.[key];
        if (message === undefined) {
          stale.push(`${note} ${locale}/${key}: key no longer exists`);
          continue;
        }
        const damaged =
          strayEnglishWords(message, script).length > 0 ||
          (ADJACENCY_IS_DAMAGE.has(locale) && hasGluedLatin(message));
        if (!damaged) stale.push(`${note} ${locale}/${key}: already clean`);
      }
    }
    expect(stale).toEqual([]);
  });

  it("names a tracking note for every deviation", () => {
    for (const { note } of KNOWN_DEVIATIONS) {
      expect(note).toMatch(/^w\d+\/(m\d+\/)?\d+$/);
    }
  });

  it("scans Ukrainian, which w4/m24 repaired, with no deviations at all", () => {
    expect(deviationsFor("uk").size).toBe(0);
  });
});
