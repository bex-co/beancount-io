import type { DirectiveJson } from "@rustledger/wasm";
import { parseBcioOptions } from "@/foundation/rustledger/bcio-options";
import golden from "./bcio-options.golden.json";

/**
 * GOLDEN VALUES (bcio-options.golden.json) were produced by the REAL fava-slim +
 * beancount via the in-repo venv:
 *
 *   cd backend-cluster/beancount-ledger
 *   ./.venv/bin/python -c "
 *     from beancount import loader
 *     from fava.core.bcio_options import parse_bcio_options
 *     from fava.beans.abc import Custom
 *     from dataclasses import asdict
 *     entries, _e, _o = loader.load_string(SOURCE)
 *     opts, errs = parse_bcio_options([e for e in entries if isinstance(e, Custom)])
 *     print(asdict(opts))"
 *
 * i.e. exactly what the `getLedgerBcioOptions` endpoint returns as
 * `BcioOptionsPublic` (reports.py -> ledger.bcio_options).
 *
 * DIRECTIVE FIXTURES below are the REAL rustledger WASM parse of the same
 * sources, captured live via:
 *
 *   withLedger({ "main.bean": SOURCE }, "main.bean", l => l.getDirectives())
 *
 * then filtered to `type === "custom"`. rustledger emits each positional value
 * as a `TypedValueJson` (`{ type: "string", value }` for a quoted string,
 * `{ type: "amount", value: { number, currency } }` for `100.00 USD`, etc.).
 * Both halves are hard-coded here so the pure mapper is asserted against a
 * Fava-exact target without loading WASM under jest.
 */

/** rustledger custom directive for `custom "TYPE" "a" "b" ...` with string values. */
function customStrings(
  customType: string,
  date: string,
  ...strings: string[]
): DirectiveJson {
  return {
    type: "custom",
    date,
    custom_type: customType,
    values: strings.map((value) => ({ type: "string", value })),
  };
}

/** A non-custom directive, to prove it is ignored. */
const OPEN_DIRECTIVE: DirectiveJson = {
  type: "open",
  date: "2024-01-01",
  account: "Assets:Checking",
  currencies: ["USD"],
};

describe("parseBcioOptions", () => {
  it("returns Fava defaults when there are no bcio custom directives", () => {
    // Source: a plain ledger (open + a transaction), no beancountio-option.
    const result = parseBcioOptions([OPEN_DIRECTIVE]);
    expect(result).toEqual(golden.empty);
  });

  it("returns Fava defaults for an empty directive list", () => {
    expect(parseBcioOptions([])).toEqual(golden.empty);
  });

  it("parses the full set of string options (Fava-exact golden)", () => {
    const directives: DirectiveJson[] = [
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "default_file",
        "ledger.bean",
      ),
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "transaction_file",
        "txns/{year}.bean",
      ),
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "account_file",
        "accounts.bean",
      ),
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "price_file",
        "prices.bean",
      ),
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "balance_file",
        "balances.bean",
      ),
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "note_file",
        "notes.bean",
      ),
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "pad_file",
        "pads.bean",
      ),
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "budget_file",
        "budget.bean",
      ),
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "receipt_base_folder",
        "receipts",
      ),
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "receipt_storage",
        "s3",
      ),
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "document_file",
        "documents.bean",
      ),
      OPEN_DIRECTIVE,
    ];
    expect(parseBcioOptions(directives)).toEqual(golden.full);
  });

  it("normalizes hyphenated keys and ignores non-bcio custom directives", () => {
    // `transaction-file` / `account-file` (hyphens) plus a `fava-option` and a
    // `budget` custom (with an amount value) that must be ignored entirely.
    const budgetWithAmount: DirectiveJson = {
      type: "custom",
      date: "2020-01-01",
      custom_type: "budget",
      values: [
        { type: "string", value: "Expenses:Food" },
        { type: "string", value: "MONTHLY" },
        { type: "amount", value: { number: "100.00", currency: "USD" } },
      ],
    };
    const directives: DirectiveJson[] = [
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "transaction-file",
        "t/{month}.bean",
      ),
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "account-file",
        "acc.bean",
      ),
      customStrings("fava-option", "2020-01-01", "language", "en"),
      budgetWithAmount,
      OPEN_DIRECTIVE,
    ];
    expect(parseBcioOptions(directives)).toEqual(golden.partial);
  });

  it("skips unknown option keys (field stays at default)", () => {
    const directives: DirectiveJson[] = [
      customStrings("beancountio-option", "2000-01-01", "bogus_file", "x.bean"),
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "default_file",
        "root.bean",
      ),
      OPEN_DIRECTIVE,
    ];
    expect(parseBcioOptions(directives)).toEqual(golden.unknown);
  });

  it("applies last-wins for duplicate keys", () => {
    const directives: DirectiveJson[] = [
      customStrings(
        "beancountio-option",
        "2000-01-01",
        "default_file",
        "first.bean",
      ),
      customStrings(
        "beancountio-option",
        "2001-01-01",
        "default_file",
        "second.bean",
      ),
      OPEN_DIRECTIVE,
    ];
    expect(parseBcioOptions(directives)).toEqual(golden.dup);
  });

  it("treats a missing value as the empty string (matches Python)", () => {
    // `custom "beancountio-option" "default_file"` with no value -> "".
    const directives: DirectiveJson[] = [
      customStrings("beancountio-option", "2000-01-01", "default_file"),
      OPEN_DIRECTIVE,
    ];
    expect(parseBcioOptions(directives)).toEqual(golden.missing);
  });

  it("skips a known key whose value is a non-string (amount)", () => {
    // `custom "beancountio-option" "default_file" 100.00 USD` -> Python raises
    // NotAStringBcioOptionError, so default_file keeps its default.
    const directives: DirectiveJson[] = [
      {
        type: "custom",
        date: "2000-01-01",
        custom_type: "beancountio-option",
        values: [
          { type: "string", value: "default_file" },
          { type: "amount", value: { number: "100.00", currency: "USD" } },
        ],
      },
      OPEN_DIRECTIVE,
    ];
    expect(parseBcioOptions(directives)).toEqual(golden.nonstring_value);
  });
});
