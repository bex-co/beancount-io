import type { BeancountError } from "@rustledger/wasm";
import type {
  LedgerAttributes,
  LedgerDocument,
  LedgerEvent,
} from "@/foundation/rustledger";
import type {
  AttributesPublic,
  BeancountErrorPublic,
  DocumentPublic,
  EntriesCountPerTypePublic,
  EventPublic,
} from "@/foundation/ledger-api-types";

/** Map engine {@link LedgerAttributes} → the fava `AttributesPublic` DTO. */
export function toAttributesPublic(
  attributes: LedgerAttributes,
): AttributesPublic {
  return {
    accounts: attributes.accounts,
    tags: attributes.tags,
    links: attributes.links,
    years: attributes.years,
    currencies: attributes.currencies,
    payees: attributes.payees,
  };
}

/**
 * Map rustledger `BeancountError[]` → the fava `BeancountErrorPublic[]` DTO,
 * carrying source location (`file`/`line`) when the error has one.
 */
export function toBeancountErrorsPublic(
  errors: BeancountError[],
): BeancountErrorPublic[] {
  return errors.map((error) => ({
    message: error.message,
    source:
      error.file && error.line !== null && error.line !== undefined
        ? { filename: error.file, lineno: error.line }
        : null,
  }));
}

// Fava's `EntriesByType` namedtuple field order (fava-slim group_entries.py).
// `getLedgerEntriesCountPerType` returns all 12 types in this order, capitalized,
// with a count of 0 when a type is absent — replicated here for parity.
const ENTRY_TYPE_ORDER: ReadonlyArray<readonly [string, string]> = [
  ["balance", "Balance"],
  ["close", "Close"],
  ["commodity", "Commodity"],
  ["custom", "Custom"],
  ["document", "Document"],
  ["event", "Event"],
  ["note", "Note"],
  ["open", "Open"],
  ["pad", "Pad"],
  ["price", "Price"],
  ["query", "Query"],
  ["transaction", "Transaction"],
];

/**
 * Map lowercase directive-type counts (from `entriesCountPerType`) to the fava
 * `EntriesCountPerTypePublic[]` DTO: all 12 types in namedtuple order,
 * capitalized, zero-filled.
 */
export function toEntriesCountPerTypePublic(
  counts: Record<string, number>,
): EntriesCountPerTypePublic[] {
  return ENTRY_TYPE_ORDER.map(([lower, capitalized]) => ({
    type: capitalized,
    number: counts[lower] ?? 0,
  }));
}

/** Map engine events → fava `EventPublic[]` (`value` → `description`). */
export function toEventsPublic(events: LedgerEvent[]): EventPublic[] {
  return events.map((event) => ({
    date: event.date,
    type: event.type,
    description: event.value,
  }));
}

/** Map engine documents → fava `DocumentPublic[]` (`path` → `filename`). */
export function toDocumentsPublic(
  documents: LedgerDocument[],
): DocumentPublic[] {
  return documents.map((document) => ({
    date: document.date,
    account: document.account,
    filename: document.path,
    tags: document.tags,
    links: document.links,
    meta: Object.fromEntries(
      Object.entries(document.meta)
        .filter(([key]) => key !== "filename" && key !== "lineno")
        .map(([key, value]) => [
          key,
          value !== null && typeof value === "object"
            ? `${value.number} ${value.currency}`
            : value,
        ]),
    ),
  }));
}
