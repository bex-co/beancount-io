/**
 * Locale-aware plurals for translation catalogs.
 *
 * i18next already resolves `key_one` / `key_few` / `key_many` / `key_other`
 * from `t(key, { count })` through `Intl.PluralRules`. What it cannot do is
 * tell a catalog which variants a language needs: English has `one` and
 * `other`, Russian `one`, `few`, `many` and `other`, Chinese only `other`. A
 * plural message is therefore a family of `key_<category>` entries, and
 * {@link findFlatPluralIssues} checks each family against `Intl.PluralRules`.
 */

const PLURAL_CATEGORIES = [
  "zero",
  "one",
  "two",
  "few",
  "many",
  "other",
] as const;

type PluralCategory = (typeof PLURAL_CATEGORIES)[number];

/** The `_<category>` suffix i18next appends to a plural message's key. */
export const PLURAL_SUFFIX = new RegExp(`_(${PLURAL_CATEGORIES.join("|")})$`);

/** The cardinal categories `language` distinguishes, per `Intl.PluralRules`. */
export function pluralCategories(language: string): PluralCategory[] {
  return new Intl.PluralRules(language).resolvedOptions()
    .pluralCategories as PluralCategory[];
}

type PluralIssue = {
  language: string;
  key: string;
  missing: PluralCategory[];
  extra: PluralCategory[];
};

/**
 * Every plural family in one language's flattened resources whose categories
 * differ from the ones that language uses: a missing `few` in Russian
 * mistranslates 2–4, and a `one` in Chinese is a form nothing will ever
 * select. A family is the `key_<category>` entries sharing a `key_other`.
 * Empty when the catalog is sound.
 */
export function findFlatPluralIssues(
  language: string,
  resources: Record<string, string>,
): PluralIssue[] {
  const families = new Map<string, Set<PluralCategory>>();
  for (const key of Object.keys(resources)) {
    const match = PLURAL_SUFFIX.exec(key);
    if (!match) continue;
    const base = key.slice(0, match.index);
    if (!(`${base}_other` in resources)) continue;
    const present = families.get(base) ?? new Set();
    present.add(match[1] as PluralCategory);
    families.set(base, present);
  }
  const expected = pluralCategories(language);
  return [...families].flatMap(([key, present]) => {
    const missing = expected.filter((c) => !present.has(c));
    const extra = PLURAL_CATEGORIES.filter(
      (c) => present.has(c) && !expected.includes(c),
    );
    return missing.length === 0 && extra.length === 0
      ? []
      : [{ language, key, missing, extra }];
  });
}
