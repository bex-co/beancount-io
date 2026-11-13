/**
 * What making a private ledger public exposes, said once for every surface
 * (w23/241).
 *
 * The `private: false` preview is the one confirmation step an agent has before
 * it flips a ledger's visibility for a user, so its warning is the sentence the
 * agent shows. It used to say only "readable by anyone", where the dashboard's
 * confirmation names the ledger's transactions, balances, files and history. A
 * private ledger's git history is public with it: every earlier version of every
 * file, entries since deleted included, and the author name and email on every
 * commit (the service passes commit metadata through unredacted), so the owner
 * who confirms through an agent has to hear that too. Whether the service
 * should hide commit emails on a public ledger is a separate owner decision.
 */
export const PUBLIC_LEDGER_EXPOSURE =
  "its transactions, balances, files and full commit history, including every earlier version of each file and each commit's author name and email";

/** The preview's warning when a private ledger would become public. */
export const MAKE_PUBLIC_WARNING = `This would make the ledger public: anyone with the link, and search engines, would be able to read ${PUBLIC_LEDGER_EXPOSURE}.`;

/** The `private` field's own words for what `false` does, on every surface. */
export const MAKE_PUBLIC_FIELD = `false makes it public: ${PUBLIC_LEDGER_EXPOSURE} become readable by anyone with the link and by search engines`;
