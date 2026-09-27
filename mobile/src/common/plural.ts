/**
 * Plural categories by each language's own rules.
 *
 * i18n-js ships one English-shaped pluralizer (`one` for 1, `other` otherwise),
 * which is wrong for every Slavic locale — Russian says "2 цены" but "5 цен" —
 * and needlessly asks Chinese for a `one` form it does not have. The CLDR rules
 * already live in `Intl.PluralRules`, so the app asks it instead.
 *
 * Import-free so the jest-lite runner can load it, and so the integrity suite
 * checks catalogs against the same rules the app renders with.
 */

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

const rulesCache = new Map<string, Intl.PluralRules | null>();

function rulesFor(locale: string): Intl.PluralRules | null {
  if (!rulesCache.has(locale)) {
    let rules: Intl.PluralRules | null = null;
    try {
      rules =
        typeof Intl !== "undefined" && typeof Intl.PluralRules === "function"
          ? new Intl.PluralRules(locale)
          : null;
    } catch {
      rules = null;
    }
    rulesCache.set(locale, rules);
  }
  return rulesCache.get(locale) ?? null;
}

/**
 * The category `count` takes in `locale`. Falls back to English's rule when the
 * runtime has no plural data for the locale, so a count still renders.
 */
export function pluralCategory(locale: string, count: number): PluralCategory {
  const rules = rulesFor(locale);
  if (rules) return rules.select(count) as PluralCategory;
  return count === 1 ? "one" : "other";
}

/**
 * The keys i18n-js should try, in order: the locale's category, then `other`,
 * so a catalog that has not grown the category yet still renders its `other`.
 */
export function pluralKeys(locale: string, count: number): string[] {
  const category = pluralCategory(locale, count);
  return category === "other" ? ["other"] : [category, "other"];
}

/** The form of `forms` that `count` takes in `locale`, else its `other`. */
export function pluralForm(
  locale: string,
  forms: { other: string } & Partial<Record<PluralCategory, string>>,
  count: number,
): string {
  const [category] = pluralKeys(locale, count);
  return forms[category as PluralCategory] ?? forms.other;
}

/** The slice of an i18n-js instance a pluralizer registers on. */
type Pluralizable = {
  pluralization: {
    register: (
      locale: string,
      pluralizer: (i18n: unknown, count: number) => string[],
    ) => void;
  };
};

/**
 * Registers each locale's own CLDR pluralizer (Russian 2 цены / 5 цен, Chinese
 * without a `one` form) in place of i18n-js's English-only default.
 */
export function registerPluralizers(
  i18n: Pluralizable,
  locales: readonly string[],
): void {
  for (const locale of locales) {
    i18n.pluralization.register(locale, (_i18n, count) =>
      pluralKeys(locale, count),
    );
  }
}

/** Every category `locale` distinguishes, as the catalog must provide them. */
function pluralCategoriesOf(locale: string): PluralCategory[] {
  const rules = rulesFor(locale);
  return rules
    ? (rules.resolvedOptions().pluralCategories as PluralCategory[])
    : ["one", "other"];
}

export type PluralCategoryMismatch = {
  key: string;
  missing: PluralCategory[];
  extra: string[];
};

/**
 * Plural values in `catalog` whose categories differ from what `locale`
 * distinguishes. Only object values are plural forms; strings are skipped.
 */
export function pluralCategoryMismatches(
  locale: string,
  catalog: Record<string, unknown>,
  keys: readonly string[] = Object.keys(catalog),
): PluralCategoryMismatch[] {
  const expected = pluralCategoriesOf(locale);
  const mismatches: PluralCategoryMismatch[] = [];
  for (const key of keys) {
    const value = catalog[key];
    if (value === null || typeof value !== "object") continue;
    const actual = Object.keys(value);
    const missing = expected.filter((category) => !actual.includes(category));
    const extra = actual.filter(
      (name) => !(expected as string[]).includes(name),
    );
    if (missing.length > 0 || extra.length > 0) {
      mismatches.push({ key, missing, extra });
    }
  }
  return mismatches;
}
