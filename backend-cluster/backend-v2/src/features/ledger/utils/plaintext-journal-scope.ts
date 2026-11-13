/**
 * What the plaintext journal holds, said once for every surface (w23/239).
 *
 * The ledger service's `plaintextExportDirectives` keeps a ledger's
 * transactions, balance assertions and pads and nothing else, and the
 * dashboard's Export journal uses the same text. Until it was written down, the
 * published descriptions read as "the journal text", and a caller who took it
 * for a copy of the ledger lost its prices (so every market valuation), its
 * commodity declarations, events, custom directives, closes and the real open
 * dates. The ledger package's `plaintext-export-directives.test.ts` pins that
 * scope; change it there and this sentence must change with it.
 */
export const PLAINTEXT_JOURNAL_SCOPE =
  "The text holds the ledger's transactions, balance assertions and pads only, with no open, close, commodity, price, event, note, document or custom directives, so it is not a copy of the ledger: read the ledger's source files or its archive for that.";
