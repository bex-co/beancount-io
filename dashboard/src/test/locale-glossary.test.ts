import { describe, expect, it } from "vitest";
import * as locales from "@/i18n/locales";
import { IDENTICAL_BY_DESIGN } from "./locale-scan";

/**
 * Each language names a ledger one way. German says "Hauptbuch" and Chinese
 * "账本" across the dashboard, yet the plan-limit message read "Ledger-Limit
 * … weitere Ledger" and "分类账" beside them (w0/050), and German's star toasts
 * said "Ledger" too. A second word for the product's central object reads as
 * a second thing.
 */

const ALL = locales as unknown as Record<string, Record<string, string>>;

/** The word each language must not use for a ledger, beside the one it does. */
const AVOIDED: Record<string, { term: RegExp; use: string }> = {
  // "Ledger" as a word or in a compound ("Ledger-Limit", "Star-Ledger").
  de: { term: /(?<![A-Za-z])Ledger(?![a-z])/, use: "Hauptbuch" },
  zh: { term: /分类账/, use: "账本" },
};

describe("one word for a ledger per language", () => {
  it.each(Object.entries(AVOIDED))("%s", (locale, { term, use }) => {
    const offenders = Object.entries(ALL[locale] ?? {})
      // A proper name such as "Open Ledger" is allowlisted as identical.
      .filter(([key]) => !(`${locale}/${key}` in IDENTICAL_BY_DESIGN))
      .filter(([, message]) => term.test(message))
      .map(([key, message]) => `${key}: ${message} (use "${use}")`);
    expect(offenders).toEqual([]);
  });

  it("has the catalogs it checks", () => {
    for (const locale of Object.keys(AVOIDED)) {
      expect(Object.keys(ALL[locale] ?? {}).length).toBeGreaterThan(1000);
    }
  });
});

it("uses Saldenbilanz across the German trial balance surfaces", () => {
  const german = locales.de;
  for (const key of [
    "common.trialBalance",
    "page.trialBalance.overviewTitle",
    "common.relatedLinks.trialBalance",
    "common.pageDescription.trialBalance",
    "seo.ledgerTrialBalance.title",
    "seo.ledgerTrialBalance.description",
  ] as const) {
    expect(german[key], key).toContain("Saldenbilanz");
  }
});
