import type { DirectiveJson } from "@rustledger/wasm";
import { paddingCurrencyErrors } from "../pad-currencies";

/**
 * w31/014: rustledger never checks the padding it generates against the
 * accounts' `open` currencies, so a pad from an account opened for another
 * currency loaded clean. bean-check 3.2.3 reports "Invalid currency EUR for
 * account 'Equity:Opening-Balances'" on the pad's line.
 */
const SOURCE = `2026-09-01 open Equity:Opening-Balances USD
2026-09-01 open Assets:EurBank EUR
2026-09-03 pad Assets:EurBank Equity:Opening-Balances
2026-09-04 balance Assets:EurBank 250.00 EUR
`;
const files = { "main.bean": SOURCE };
const open = (account: string, ...currencies: string[]): DirectiveJson => ({
  type: "open",
  date: "2026-09-01",
  account,
  currencies,
});
const pad: DirectiveJson = {
  type: "pad",
  date: "2026-09-03",
  account: "Assets:EurBank",
  source_account: "Equity:Opening-Balances",
};
const padding = (number: string, currency: string): DirectiveJson => ({
  type: "transaction",
  date: "2026-09-03",
  flag: "P",
  narration: "(Padding)",
  tags: [],
  links: [],
  postings: [
    { account: "Assets:EurBank", units: { number, currency } },
    {
      account: "Equity:Opening-Balances",
      units: { number: `-${number}`, currency },
    },
  ],
});
const found = (errors: ReturnType<typeof paddingCurrencyErrors>) =>
  errors.map((error) => [error.code, error.line, error.message]);

describe("paddingCurrencyErrors", () => {
  it("refuses a source account's padding leg in a currency it is not opened for", () => {
    const errors = paddingCurrencyErrors(
      [
        open("Equity:Opening-Balances", "USD"),
        open("Assets:EurBank", "EUR"),
        pad,
      ],
      [padding("250.00", "EUR")],
      files,
    );
    expect(errors).toEqual([
      {
        message: "Invalid currency EUR for account 'Equity:Opening-Balances'",
        code: "E5002",
        phase: "validate",
        hint: null,
        file: "main.bean",
        line: 3,
        column: 1,
        end_line: null,
        end_column: null,
        severity: "error",
      },
    ]);
  });

  // bean-check also refuses the padded leg, beside the engine's own error for
  // the balance directive's currency.
  it("refuses the padded leg too, once per posting", () => {
    const errors = paddingCurrencyErrors(
      [
        open("Equity:Opening-Balances", "EUR"),
        open("Assets:EurBank", "EUR"),
        pad,
      ],
      [padding("100", "USD")],
      files,
    );
    expect(found(errors)).toEqual([
      ["E5002", 3, "Invalid currency USD for account 'Assets:EurBank'"],
      [
        "E5002",
        3,
        "Invalid currency USD for account 'Equity:Opening-Balances'",
      ],
    ]);
  });

  it("refuses only the currency the account does not allow", () => {
    const errors = paddingCurrencyErrors(
      [open("Equity:Opening-Balances", "EUR"), open("Assets:EurBank"), pad],
      [padding("100", "USD"), padding("10", "EUR")],
      files,
    );
    expect(found(errors)).toEqual([
      [
        "E5002",
        3,
        "Invalid currency USD for account 'Equity:Opening-Balances'",
      ],
    ]);
  });

  it("accepts padding in an allowed currency or into an unconstrained account", () => {
    expect(
      paddingCurrencyErrors(
        [
          open("Equity:Opening-Balances", "EUR", "USD"),
          open("Assets:EurBank"),
          pad,
        ],
        [padding("250.00", "EUR")],
        files,
      ),
    ).toEqual([]);
    expect(
      paddingCurrencyErrors([pad], [padding("250.00", "EUR")], files),
    ).toEqual([]);
  });

  it("finds nothing to check without padding", () => {
    expect(
      paddingCurrencyErrors(
        [open("Equity:Opening-Balances", "USD"), pad],
        [],
        files,
      ),
    ).toEqual([]);
  });
});
