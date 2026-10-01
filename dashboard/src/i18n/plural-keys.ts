/**
 * Every translation key that exists only as plural variants (`key_one`,
 * `key_other`, …), which i18next resolves from `{ count }`.
 *
 * Listed here rather than derived from the catalogs because the catalogs are
 * typed as `Record<string, …>`, which erases their keys. `useTranslations`
 * reads this union to require `count` for these keys at compile time, and
 * `src/i18n/__tests__/plural.test.ts` fails when the catalogs gain or lose a
 * plural key this list does not match.
 */
export const PLURAL_BASE_KEYS = [
  "common.whatsNewUnread",
  "importer.accountMapping.aiSuccessDescription",
  "importer.accountMapping.missingAccountAlert",
  "importer.configure.importButton",
  "importer.finish.partialFailure",
  "importer.finish.successMessage",
  "page.overview.atCostCount",
  "page.overview.notInTotalCount",
  "page.overview.pricesNotUpdated",
] as const;

export type PluralBaseKey = (typeof PLURAL_BASE_KEYS)[number];
