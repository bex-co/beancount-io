import type { DirectiveJson, TypedValueJson } from "@rustledger/wasm";
import BigNumber from "bignumber.js";
import type {
  CustomValueInput,
  LedgerEntryInput,
} from "@/foundation/ledger-api-types/ledger-entry-input";
import { directiveToText } from "@/foundation/rustledger/journal-serialize";

/**
 * Render a structured `LedgerEntryInput` to the exact beancount text the Python
 * ledger service's `entries.addBulkEntries` would append — parity for
 * `fava.beans.create.*` → `fava.file.format_entries`.
 *
 * The Python path builds a beancount directive per input (`build_directive` in
 * `server/app/api/entries.py`) and serializes each with
 * `fava.file.format_entries`, which is `fava.beans.str.to_string(entry) + "\n"`
 * per directive. `to_string` in turn runs beancount's `EntryPrinter`
 * (`beancount.parser.printer.format_entry`, prefix `"  "`) and then
 * `fava.core.misc.align` to currency column 61, with a trailing per-line
 * rstrip.
 *
 * Rather than re-port that printer + align pipeline, this module maps the input
 * onto the equivalent rustledger `DirectiveJson` shape and delegates the render
 * to the sibling, golden-validated `directiveToText` (which is a faithful port
 * of `to_string(entry, _indent=2)`), then appends the single `"\n"` that
 * `format_entries` adds after each entry. The result is byte-identical to
 * `format_entries([directive])` for one directive — verified in the test against
 * golden output captured from the real Python `fava.file.format_entries`.
 *
 * Number formatting: freshly built directives carry no ledger-wide
 * `DisplayContext`, so beancount's `DEFAULT_DISPLAY_CONTEXT` renders each number
 * as its own source string (no thousands separators, no re-scaling to a
 * ledger-common precision). Ordinary decimal source (including trailing scale
 * like `1.2300`) is emitted verbatim. Scientific notation from JS
 * `Number#toString` / wire numbers (`1e-8`) is expanded to an ordinary decimal
 * via BigNumber so rustledger-WASM can parse the generated text — matching
 * Python Decimal → `format_entries` behavior.
 */

// --- input → DirectiveJson mapping ---------------------------------------

/**
 * The numbers a structured write accepts: an optional sign, digits with an
 * optional fraction, and an optional exponent `toBeancountNumber` expands.
 * Bank spellings (`(12.50)`, `-1,234.56`, `$4.50`) are the client's to
 * normalize; written as typed they would break the ledger file.
 */
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/** The engine's Decimal holds 28 digits: more is an error, or a changed value. */
const MAX_DECIMAL_DIGITS = 28;

/**
 * Whether the number fits the engine's 28 digits, as it will be written. At 29
 * or more it raises `P0012` on the posting, which a client saw as "multiple
 * postings with missing amounts", and a fraction past 28 places is cut off
 * (`0.000…1` became `0`) (w21/997).
 */
function fitsEngineDecimal(raw: string): boolean {
  const exponent = /[eE]([+-]?\d+)$/.exec(raw);
  if (exponent && Math.abs(Number(exponent[1])) > 100) return false;
  const match = /^[+-]?(\d*)(?:\.(\d*))?$/.exec(toBeancountNumber(raw));
  if (!match) return false;
  const whole = match[1].replace(/^0+/, "");
  const fraction = match[2] ?? "";
  return (
    whole.length + fraction.length <= MAX_DECIMAL_DIGITS &&
    fraction.length <= MAX_DECIMAL_DIGITS
  );
}

export function isDecimalNumber(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value) && fitsEngineDecimal(String(value));
  }
  return (
    typeof value === "string" &&
    DECIMAL_NUMBER.test(value) &&
    fitsEngineDecimal(value)
  );
}

/**
 * Beancount source rejects scientific notation and a bare leading `.`. Keep
 * ordinary decimals (including trailing zeros) byte-identical; expand only
 * finite exponent forms, and write `.5` as `0.5`, which the decimal check
 * accepts and the lexer could not read (w23/043).
 */
function toBeancountNumber(value: string | number): string {
  const raw = (typeof value === "number" ? String(value) : value).replace(
    /^([+-]?)\./,
    "$10.",
  );
  if (!/[eE]/.test(raw)) return raw;
  const amount = new BigNumber(raw);
  if (!amount.isFinite()) return raw;
  return amount.toFixed();
}

/**
 * Map a wire custom value onto the engine's `TypedValueJson`. The wire tags by
 * `kind` and the engine by `type`, and the two name things differently — the
 * wire's `text` is the engine's quoted `string`, and the wire's flat `amount`
 * (`number` + `currency` siblings) nests under `value` here. Numbers are
 * normalized through `toBeancountNumber` like every other numeric mapping.
 */
function toTypedValue(value: CustomValueInput): TypedValueJson {
  switch (value.kind) {
    case "account":
      return { type: "account", value: value.value };
    case "text":
      return { type: "string", value: value.value };
    case "number":
      return { type: "number", value: toBeancountNumber(value.value) };
    case "amount":
      return {
        type: "amount",
        value: {
          number: toBeancountNumber(value.number),
          currency: value.currency,
        },
      };
  }
}

/**
 * Meta on the transaction input is `Record<string, string>`; beancount renders
 * each value as a quoted string via `write_metadata`. rustledger's
 * `MetaValueJson` string arm carries the same, so a plain copy is faithful.
 */
function toDirective(input: LedgerEntryInput): DirectiveJson {
  switch (input.type) {
    case "transaction": {
      const { entry } = input;
      return {
        type: "transaction",
        date: entry.date,
        flag: entry.flag,
        // Absent (not empty-string) mirrors the wire shape `directiveToText`
        // consumes: `EntryPrinter.Transaction` only appends the payee/narration
        // strings that are truthy.
        ...(entry.payee ? { payee: entry.payee } : {}),
        ...(entry.narration ? { narration: entry.narration } : {}),
        tags: entry.tags ?? [],
        links: entry.links ?? [],
        postings: entry.postings.map((posting) => ({
          account: posting.account,
          // An omitted amount stays omitted: the plaintext printer renders
          // the posting elided, exactly as the user wrote it (w2/m26).
          ...(posting.units
            ? {
                units: {
                  number: toBeancountNumber(posting.units.number),
                  currency: posting.units.currency,
                },
              }
            : {}),
          ...(posting.price
            ? {
                price: {
                  number: toBeancountNumber(posting.price.number),
                  currency: posting.price.currency,
                },
              }
            : {}),
          // A typed cost is always a simple per-unit lot (`{100 USD [,
          // date] [, "label"]}`); total/compound costs stay raw-text-only.
          ...(posting.cost
            ? {
                cost: {
                  number: {
                    kind: "per_unit",
                    value: toBeancountNumber(posting.cost.number),
                  },
                  currency: posting.cost.currency,
                  ...(posting.cost.date ? { date: posting.cost.date } : {}),
                  ...(posting.cost.label ? { label: posting.cost.label } : {}),
                },
              }
            : {}),
          ...(posting.flag ? { flag: posting.flag } : {}),
          // Posting tags/links have no engine representation (PostingJson
          // carries neither); they ride a render-side extension the
          // sibling renderer reads back (w23/m6/t003). The built
          // directive is render-intermediate only — projections
          // bean-check the appended text, so the engine never sees it.
          ...(posting.tags ? { tags: [...posting.tags] } : {}),
          ...(posting.links ? { links: [...posting.links] } : {}),
          ...(posting.meta ? { meta: { ...posting.meta } } : {}),
        })),
        ...(entry.meta ? { meta: { ...entry.meta } } : {}),
      };
    }
    case "commodity":
      return {
        type: "commodity",
        date: input.entry.date,
        currency: input.entry.currency,
      };
    case "price": {
      const { entry } = input;
      return {
        type: "price",
        date: entry.date,
        currency: entry.currency,
        amount: {
          number: toBeancountNumber(entry.amount.number),
          currency: entry.amount.currency,
        },
      };
    }
    case "note":
      return {
        type: "note",
        date: input.entry.date,
        account: input.entry.account,
        comment: input.entry.content,
      };
    case "balance":
      return {
        type: "balance",
        date: input.entry.date,
        account: input.entry.account,
        amount: {
          number: toBeancountNumber(input.entry.amount.number),
          currency: input.entry.amount.currency,
        },
      };
    case "open":
      return {
        type: "open",
        date: input.entry.date,
        account: input.entry.account,
        currencies: input.entry.currencies ?? [],
      };
    case "close":
      return {
        type: "close",
        date: input.entry.date,
        account: input.entry.account,
      };
    case "custom": {
      const { entry } = input;
      return {
        type: "custom",
        date: entry.date,
        custom_type: entry.type,
        values: (entry.values ?? []).map(toTypedValue),
      };
    }
    // NOTE: the bulk-entries contract has no `budget` entry type — a budget
    // arrives as `custom` above. This case is reachable only from in-process
    // callers that build the union directly.
    case "budget": {
      const { entry } = input;
      const values: TypedValueJson[] = [
        { type: "account", value: entry.account },
        { type: "string", value: entry.interval },
        {
          type: "amount",
          value: {
            number: toBeancountNumber(entry.amount.number),
            currency: entry.amount.currency,
          },
        },
      ];
      return {
        type: "custom",
        date: entry.date,
        custom_type: "budget",
        values,
      };
    }
    case "document": {
      const { entry } = input;
      return {
        type: "document",
        date: entry.date,
        account: entry.account,
        path: entry.filename,
        ...(entry.tags ? { tags: entry.tags } : {}),
        ...(entry.links ? { links: entry.links } : {}),
      };
    }
    case "event":
      return {
        type: "event",
        date: input.entry.date,
        event_type: input.entry.type,
        value: input.entry.description,
      };
  }
}

/**
 * Render one `LedgerEntryInput` to the exact beancount text
 * `fava.file.format_entries([directive])` produces for it: the directive body
 * (alignment, quoting/escaping, sorted `#tag`/`^link`, cost/price, metadata,
 * custom values including the budget case) followed by the trailing blank line
 * that `format_entries` appends after every entry.
 *
 * The orchestrator groups inputs by target file and concatenates each group's
 * `entryInputToText` outputs onto the file's existing contents.
 */
export function entryInputToText(input: LedgerEntryInput): string {
  // The caller's meta values are strings by contract: written as given.
  return `${directiveToText(toDirective(input), { literalStringMeta: true })}\n`;
}
