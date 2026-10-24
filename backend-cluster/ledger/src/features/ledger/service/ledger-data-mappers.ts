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
  ManagedPriceSourcePublic,
  PostingsPerAccountPublic,
} from "@/foundation/ledger-api-types";
import type { ManagedPriceSource } from "@/foundation/managed-prices";

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
 *
 * `code` travels with the message because a consumer that has to tell an
 * unbalanced transaction from any other validation failure would otherwise
 * regex the prose, and a reworded engine message would silently change how
 * the error is classified (w2/013). The engine's own `hint` rides along for
 * the same reason. `severity` keeps a warning from passing for an error: the
 * engine marks a one-posting entry or closing an account with a balance as
 * warnings while `bean-check` passes, and every client counted them (w21/188).
 *
 * Listed by file and line, those without a location last: the engine appends
 * them phase by phase, so an option error on line 2 came after a plugin error
 * on line 27 (w21/901). The sort is stable, so errors on one line keep the
 * engine's order.
 */
export function toBeancountErrorsPublic(
  errors: BeancountError[],
): BeancountErrorPublic[] {
  const located = (error: BeancountError) =>
    !!error.file && error.line !== null && error.line !== undefined;
  const ordered = [...errors].sort((left, right) => {
    if (located(left) !== located(right)) return located(left) ? -1 : 1;
    if (!located(left)) return 0;
    return (
      (left.file! < right.file! ? -1 : left.file! > right.file! ? 1 : 0) ||
      left.line! - right.line!
    );
  });
  return ordered.map((error) => ({
    message: error.message,
    source:
      error.file && error.line !== null && error.line !== undefined
        ? { filename: error.file, lineno: error.line }
        : null,
    code: error.code ?? null,
    hint: error.hint ?? null,
    severity: error.severity === "warning" ? "warning" : "error",
  }));
}

/**
 * The client-facing status record: everything but `effectiveDates`, which is
 * the engine-side matcher's input (one date per feed point), not status.
 */
export function toManagedPricesPublic(
  sources: ManagedPriceSource[],
): ManagedPriceSourcePublic[] {
  return sources.map(
    ({ effectiveDates: _effectiveDates, ...status }) => status,
  );
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

/**
 * Map per-account posting counts to a sorted `{account, count}` array,
 * omitting zero-count accounts (opened-but-never-posted have no rows).
 */
export function toPostingsPerAccountPublic(
  counts: Map<string, number>,
): PostingsPerAccountPublic[] {
  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([account, count]) => ({ account, count }));
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
