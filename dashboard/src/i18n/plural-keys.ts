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
  "aiAgent.checkedFiles",
  "aiAgent.editApproval.appliedOperations",
  "aiAgent.ranQueries",
  "aiAgent.usedTools",
  "commits.loadedOlder",
  "common.moreItemsLoaded",
  "common.whatsNewUnread",
  "importer.accountMapping.aiSuccessDescription",
  "importer.accountMapping.missingAccountAlert",
  "importer.configure.currencyConflict",
  "importer.configure.importButton",
  "importer.finish.partialFailure",
  "importer.finish.successMessage",
  "importer.preview.errorsCount",
  "importer.preview.validCount",
  "journal.hideEntryPostings",
  "journal.showEntryPostings",
  "journal.visibleEntryPostings",
  "page.gallery.ledgersFound",
  "page.overview.atCostCount",
  "page.overview.notInTotalCount",
  "page.overview.pricesNotUpdated",
  "plaid.accountMapping.toast.acceptedAllDescription",
  "plaid.management.toast.syncAllBanksPart",
  "plaid.management.toast.syncAllSkipped",
  "plaid.management.toast.syncAllTransactionsPart",
  "plaid.transactionReview.deleteConfirmDescription",
  "plaid.transactionReview.description",
  "plaid.transactionReview.hiddenSelectedNotice",
  "plaid.transactionReview.missingAccountsAlert",
  "plaid.transactionReview.toast.missingTargetAccountsDescription",
  "plaid.transactionReview.toast.transactionsDeletedDescription",
  "userSettings.collaboratorsPerLedger",
  "userSettings.includedLedgers",
  "userProfile.followersCount",
] as const;

export type PluralBaseKey = (typeof PLURAL_BASE_KEYS)[number];
