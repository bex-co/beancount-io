/**
 * Locale-aware plurals for translation catalogs.
 *
 * i18next already resolves `key_one` / `key_few` / `key_many` / `key_other`
 * from `t(key, { count })` through `Intl.PluralRules`. What it cannot do is
 * tell a catalog which variants a language needs: English has `one` and
 * `other`, Russian `one`, `few`, `many` and `other`, Chinese only `other`. A
 * plural message is therefore written as one form per category the language
 * uses, checked against `Intl.PluralRules`, and expanded into the suffixed keys
 * i18next looks up.
 */

export const PLURAL_CATEGORIES = [
  "zero",
  "one",
  "two",
  "few",
  "many",
  "other",
] as const;

export type PluralCategory = (typeof PLURAL_CATEGORIES)[number];

/** One message per plural category a language uses; `other` is always one. */
export type PluralForms = Partial<Record<PluralCategory, string>> & {
  other: string;
};

/** The cardinal categories `language` distinguishes, per `Intl.PluralRules`. */
export function pluralCategories(language: string): PluralCategory[] {
  return new Intl.PluralRules(language).resolvedOptions()
    .pluralCategories as PluralCategory[];
}

export function isPluralForms(value: unknown): value is PluralForms {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { other?: unknown }).other === "string"
  );
}

/** `key` expanded into the suffixed keys i18next resolves with `count`. */
export function expandPlural(
  key: string,
  forms: PluralForms,
): Record<string, string> {
  return Object.fromEntries(
    PLURAL_CATEGORIES.flatMap((category) => {
      const message = forms[category];
      return message === undefined ? [] : [[`${key}_${category}`, message]];
    }),
  );
}

export type PluralIssue = {
  language: string;
  key: string;
  missing: PluralCategory[];
  extra: PluralCategory[];
};

/**
 * Every plural message whose forms differ from the categories its language
 * uses: a missing `few` in Russian mistranslates 2–4, and a `one` in Chinese
 * is a form nothing will ever select. Empty when the catalog is sound.
 */
export function findPluralIssues(
  catalog: Record<string, Record<string, unknown>>,
): PluralIssue[] {
  return Object.entries(catalog).flatMap(([language, messages]) => {
    const expected = pluralCategories(language);
    return Object.entries(messages).flatMap(([key, value]) => {
      if (!isPluralForms(value)) return [];
      const present = PLURAL_CATEGORIES.filter(
        (category) => value[category] !== undefined,
      );
      const missing = expected.filter((c) => !present.includes(c));
      const extra = present.filter((c) => !expected.includes(c));
      return missing.length === 0 && extra.length === 0
        ? []
        : [{ language, key, missing, extra }];
    });
  });
}

const PLURAL_SUFFIX = new RegExp(`^(.*)_(${PLURAL_CATEGORIES.join("|")})$`);

/**
 * {@link findPluralIssues} over one language's flattened resources, where a
 * plural message is a family of `key_<category>` entries sharing an `_other`.
 */
export function findFlatPluralIssues(
  language: string,
  resources: Record<string, string>,
): PluralIssue[] {
  const families = new Map<string, PluralForms>();
  for (const [key, message] of Object.entries(resources)) {
    const match = PLURAL_SUFFIX.exec(key);
    if (!match || !(`${match[1]}_other` in resources)) continue;
    const forms = families.get(match[1]) ?? { other: "" };
    forms[match[2] as PluralCategory] = message;
    families.set(match[1], forms);
  }
  return findPluralIssues({ [language]: Object.fromEntries(families) });
}
