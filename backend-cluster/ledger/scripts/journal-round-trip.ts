/**
 * The journal round trip (w23/m43): what the journal returns for a directive
 * can be written back through the typed entry path and read again unchanged.
 *
 * An agent that edits a ledger through `addLedgerEntries` starts from the
 * journal's JSON. The fixture holds every directive type the typed path writes,
 * each with string-valued metadata chosen to be awkward (a quote, a backslash,
 * a number- and a date-shaped string). Each journal row is mapped onto the
 * typed input, rendered by the real `entryInputToText` and loaded again by the
 * live engine; the second journal must equal the first, entry hash included.
 * Dropping a type's metadata from the renderer, or from any layer ahead of it,
 * fails here naming the directive type that lost it.
 *
 * Run by `verify-rustledger.ts` (live engine; not a jest test).
 */
import { deepStrictEqual } from "node:assert";
import { entryInputToText } from "@/foundation/rustledger";
import type { LedgerEntryInput } from "@/foundation/ledger-api-types/ledger-entry-input";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { singleFileRepoFactory } from "./single-file-repo";

/** Every directive type the typed entry path writes (not a transaction). */
const TYPES = [
  "Open",
  "Close",
  "Commodity",
  "Price",
  "Balance",
  "Note",
  "Event",
  "Document",
  "Pad",
] as const;

const FIXTURE = [
  "2026-01-01 open Assets:Cash USD",
  '  source: "bank"',
  '  ref: "00123"',
  "2026-01-01 open Equity:Opening USD",
  "2026-01-01 commodity USD",
  '  name: "US \\"dollar\\""',
  "2026-01-01 commodity AAPL",
  '  asset-class: "stock"',
  "2026-01-02 price AAPL 190.50 USD",
  '  feed: "a\\\\b"',
  '2026-01-03 note Assets:Cash "hello"',
  '  by: "me"',
  '2026-01-04 event "location" "Paris"',
  '  tz: "CET"',
  '2026-01-05 document Assets:Cash "docs/receipt.pdf" #q1 #scan ^batch-7 ^batch-8',
  '  kind: "receipt"',
  "2026-01-06 pad Assets:Cash Equity:Opening",
  '  why: "opening"',
  "2026-01-07 balance Assets:Cash 10 USD",
  '  checked: "2026-01-31"',
  "2026-12-31 close Assets:Cash",
  '  closed-by: "audit"',
  "",
].join("\n");

type Row = Record<string, unknown> & {
  directive_type: string;
  date: string;
  meta: Record<string, string> | null;
};

async function journalOf(source: string): Promise<Row[]> {
  const journal = new LedgerJournalService(
    singleFileRepoFactory(source) as never,
    {} as never,
  );
  const { data } = await journal.getJournal({
    ledgerId: "synthetic/round-trip",
    userId: undefined,
  });
  // The pad's own padding transaction is the engine's, not an entry to write.
  return (data as unknown as Row[]).filter((row) =>
    (TYPES as readonly string[]).includes(row.directive_type),
  );
}

/** The typed input an agent builds from one journal row. */
function toInput(row: Row): LedgerEntryInput {
  const base = { date: row.date, ...(row.meta ? { meta: row.meta } : {}) };
  const text = (key: string) => row[key] as string;
  const amount = (key: string) =>
    row[key] as { number: string; currency: string };
  switch (row.directive_type) {
    case "Open":
      return {
        type: "open",
        entry: {
          ...base,
          account: text("account"),
          currencies: row.currencies as string[],
        },
      };
    case "Close":
      return { type: "close", entry: { ...base, account: text("account") } };
    case "Commodity":
      return {
        type: "commodity",
        entry: { ...base, currency: text("currency") },
      };
    case "Price":
      return {
        type: "price",
        entry: { ...base, currency: text("currency"), amount: amount("amount") },
      };
    case "Balance":
      return {
        type: "balance",
        entry: { ...base, account: text("account"), amount: amount("amount") },
      };
    case "Note":
      return {
        type: "note",
        entry: { ...base, account: text("account"), content: text("comment") },
      };
    case "Event":
      return {
        type: "event",
        entry: { ...base, type: text("type"), description: text("description") },
      };
    case "Document":
      return {
        type: "document",
        entry: {
          ...base,
          account: text("account"),
          filename: text("filename"),
          // Tags and links read back as the same sets once rendered (w23/238).
          ...(Array.isArray(row.tags) ? { tags: row.tags as string[] } : {}),
          ...(Array.isArray(row.links) ? { links: row.links as string[] } : {}),
        },
      };
    case "Pad":
      return {
        type: "pad",
        entry: {
          ...base,
          account: text("account"),
          sourceAccount: text("source_account"),
        },
      };
    default:
      throw new Error(`no typed input for a ${row.directive_type} row`);
  }
}

/** Rows in a stable order, so two journals compare by content. */
const sorted = (rows: Row[]) =>
  [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

export async function verifyJournalRoundTrip(): Promise<void> {
  const original = await journalOf(FIXTURE);
  for (const type of TYPES) {
    if (!original.some((row) => row.directive_type === type && row.meta)) {
      throw new Error(`the round-trip fixture has no ${type} with metadata`);
    }
  }

  // Oldest first, as the journal lists newest first.
  const rewritten = [...original]
    .reverse()
    .map((row) => entryInputToText(toInput(row)))
    .join("");
  const again = await journalOf(rewritten);

  for (const type of TYPES) {
    const pick = (rows: Row[]) =>
      sorted(rows.filter((row) => row.directive_type === type));
    try {
      deepStrictEqual(pick(again), pick(original));
    } catch (error) {
      throw new Error(
        `a ${type} directive does not survive the journal round trip:\n${(error as Error).message}\n--- rendered ---\n${rewritten}`,
      );
    }
  }
  console.log(
    `✓ every typed directive's metadata survives the journal round trip (${TYPES.join(", ")}) (w23/m43)`,
  );
}
