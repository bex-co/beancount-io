import type { DirectiveJson } from "@rustledger/wasm";
import {
  formatFiscalYearEnd,
  parseFavaOptions,
} from "@/foundation/rustledger/fava-options";
import golden from "./fava-options.golden.json";

/**
 * GOLDEN VALUES (fava-options.golden.json) were produced by the REAL fava-slim +
 * beancount via the in-repo venv:
 *
 *   cd backend-cluster/beancount-ledger
 *   ./.venv/bin/python -c "
 *     from beancount import loader
 *     from fava.core.fava_options import parse_options
 *     from fava.beans.abc import Custom
 *     entries, _e, _o = loader.load_string(SOURCE)
 *     opts, _errs = parse_options([e for e in entries if isinstance(e, Custom)])
 *     # -> project onto the FavaOptionsPublic subset (reports.py)"
 *
 * i.e. exactly what the `getLedgerFavaOptions` endpoint returns as
 * `FavaOptionsPublic` (reports.py -> ledger.fava_options).
 *
 * DIRECTIVE FIXTURES below mirror the REAL rustledger WASM parse of the same
 * sources: rustledger emits each positional value as a `TypedValueJson`
 * (`{ type: "string", value }` for a quoted string, `{ type: "amount", value: {
 * number, currency } }` for `100.00 USD`, etc.). Both halves are hard-coded here
 * so the pure mapper is asserted against a Fava-exact target without loading WASM
 * under jest.
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

describe("parseFavaOptions", () => {
  it("returns Fava defaults when there are no fava custom directives", () => {
    expect(parseFavaOptions([OPEN_DIRECTIVE])).toEqual(golden.empty);
  });

  it("returns Fava defaults for an empty directive list", () => {
    expect(parseFavaOptions([])).toEqual(golden.empty);
  });

  it("parses the full set of options (Fava-exact golden)", () => {
    const directives: DirectiveJson[] = [
      customStrings(
        "fava-option",
        "2016-01-01",
        "account-journal-include-children",
        "false",
      ),
      customStrings("fava-option", "2016-01-01", "auto-reload", "true"),
      customStrings(
        "fava-option",
        "2016-01-01",
        "collapse-pattern",
        "Assets:.*",
      ),
      customStrings(
        "fava-option",
        "2016-01-01",
        "collapse-pattern",
        "Expenses:Food",
      ),
      customStrings(
        "fava-option",
        "2016-01-01",
        "conversion-currencies",
        "USD EUR CAD",
      ),
      customStrings("fava-option", "2016-01-01", "currency-column", "80"),
      customStrings(
        "fava-option",
        "2016-01-01",
        "default-page",
        "balance_sheet/",
      ),
      customStrings("fava-option", "2016-01-01", "fiscal-year-end", "04-01"),
      customStrings("fava-option", "2016-01-01", "indent", "4"),
      customStrings(
        "fava-option",
        "2016-01-01",
        "invert-income-liabilities-equity",
        "true",
      ),
      customStrings("fava-option", "2016-01-01", "language", "de"),
      customStrings("fava-option", "2016-01-01", "locale", "en_US"),
      customStrings(
        "fava-option",
        "2016-01-01",
        "show-accounts-with-zero-balance",
        "false",
      ),
      customStrings(
        "fava-option",
        "2016-01-01",
        "show-accounts-with-zero-transactions",
        "false",
      ),
      customStrings(
        "fava-option",
        "2016-01-01",
        "show-closed-accounts",
        "true",
      ),
      customStrings("fava-option", "2016-01-01", "sidebar-show-queries", "10"),
      customStrings("fava-option", "2016-01-01", "unrealized", "MyUnrealized"),
      customStrings("fava-option", "2016-01-01", "upcoming-events", "14"),
      customStrings(
        "fava-option",
        "2016-01-01",
        "uptodate-indicator-grey-lookback-days",
        "30",
      ),
      customStrings("fava-option", "2016-01-01", "use-external-editor", "true"),
      OPEN_DIRECTIVE,
    ];
    expect(parseFavaOptions(directives)).toEqual(golden.full);
  });

  it("skips unknown keys, bad ints, invalid FYE, missing values; last-wins on dup; ignores non-fava customs", () => {
    // A `budget` custom (with an amount value) and a `beancountio-option` custom
    // must be ignored entirely. `language` is set to an unvalidated value ("zz").
    const budgetWithAmount: DirectiveJson = {
      type: "custom",
      date: "2016-01-01",
      custom_type: "budget",
      values: [
        { type: "account", value: "Expenses:Food" },
        { type: "string", value: "MONTHLY" },
        { type: "amount", value: { number: "100.00", currency: "USD" } },
      ],
    };
    const directives: DirectiveJson[] = [
      customStrings("fava-option", "2016-01-01", "bogus-option", "x"),
      customStrings("fava-option", "2016-01-01", "currency-column", "notanint"),
      customStrings("fava-option", "2016-01-01", "fiscal-year-end", "13-40"),
      customStrings("fava-option", "2016-01-01", "indent"),
      customStrings("fava-option", "2016-01-01", "sidebar-show-queries", "3"),
      customStrings("fava-option", "2016-01-01", "sidebar-show-queries", "7"),
      customStrings(
        "beancountio-option",
        "2016-01-01",
        "default_file",
        "main.bean",
      ),
      budgetWithAmount,
      customStrings("fava-option", "2016-01-01", "language", "zz"),
    ];
    expect(parseFavaOptions(directives)).toEqual(golden.mixed);
  });

  it("skips a known key whose value is a non-string (amount)", () => {
    // `custom "fava-option" "currency-column" 100.00 USD` -> Python raises
    // NotAStringOptionError, so currency_column keeps its default.
    const directives: DirectiveJson[] = [
      {
        type: "custom",
        date: "2016-01-01",
        custom_type: "fava-option",
        values: [
          { type: "string", value: "currency-column" },
          { type: "amount", value: { number: "100.00", currency: "USD" } },
        ],
      },
      OPEN_DIRECTIVE,
    ];
    expect(parseFavaOptions(directives)).toEqual(golden.nonstring);
  });

  it("rejects 02-29 as a fiscal year end (2001 is non-leap) -> default", () => {
    const directives: DirectiveJson[] = [
      customStrings("fava-option", "2016-01-01", "fiscal-year-end", "02-29"),
    ];
    expect(parseFavaOptions(directives)).toEqual(golden.fye_feb29);
  });

  it("accepts 02-28 as a fiscal year end", () => {
    const directives: DirectiveJson[] = [
      customStrings("fava-option", "2016-01-01", "fiscal-year-end", "02-28"),
    ];
    expect(parseFavaOptions(directives)).toEqual(golden.fye_feb28);
  });

  it("parses a single conversion currency into a one-element list", () => {
    const directives: DirectiveJson[] = [
      customStrings(
        "fava-option",
        "2016-01-01",
        "conversion-currencies",
        "USD",
      ),
    ];
    expect(parseFavaOptions(directives)).toEqual(golden.conv_single);
  });
});

describe("formatFiscalYearEnd (#3 — feeds the MM-DD back to the time filter)", () => {
  it("zero-pads month and day", () => {
    expect(formatFiscalYearEnd({ month: 6, day: 30 })).toBe("06-30");
    expect(formatFiscalYearEnd({ month: 12, day: 31 })).toBe("12-31");
  });

  it("round-trips a ledger's fiscal-year-end back to its MM-DD string", () => {
    const directives: DirectiveJson[] = [
      customStrings("fava-option", "2016-01-01", "fiscal-year-end", "06-30"),
    ];
    const parsed = parseFavaOptions(directives).fiscal_year_end;
    expect(formatFiscalYearEnd(parsed)).toBe("06-30");
  });

  it("defaults to 12-31 when no fiscal-year-end is declared", () => {
    const parsed = parseFavaOptions([]).fiscal_year_end;
    expect(formatFiscalYearEnd(parsed)).toBe("12-31");
  });
});
