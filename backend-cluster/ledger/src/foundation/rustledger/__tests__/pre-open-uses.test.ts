import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { reportPreOpenUses } from "../pre-open-uses";

/**
 * w23/067: a posting dated before its account's open was reported as
 * "Account … was never opened" when its amount was interpolated, and a
 * balance, pad, note, document or close before the open read the same or
 * "unknown account". The errors are scripted as the engine returns them
 * (WASM-free); `yarn verify:rustledger` checks the live engine.
 */
const open = (account: string, date = "2020-01-01"): DirectiveJson => ({
  type: "open",
  date,
  account,
  currencies: [],
});
const engineError = (
  message: string,
  line: number | null,
  file: string | null = "main.bean",
): BeancountError => ({
  message,
  code: "E1001",
  phase: "validate",
  hint: null,
  file,
  line,
  column: line === null ? null : 1,
  end_line: null,
  end_column: null,
  severity: "error",
});
const source = [
  "2020-01-01 open Assets:Live USD",
  "2020-01-01 open Equity:Init USD",
  "",
  '2019-01-01 * "early"',
  "  Assets:Live 1 USD",
  "  Equity:Init",
  "",
  "2019-06-01 balance Assets:Live 0 USD",
  "2019-06-01 pad Assets:Live Equity:Init",
  '2019-06-01 note Assets:Live "hi"',
  '2020-02-01 * "unknown"',
  "  Assets:Nope 1 USD",
  "  Equity:Init",
  "",
].join("\n");
const files = { "main.bean": source };
const directives = [open("Assets:Live"), open("Equity:Init")];
const messages = (errors: BeancountError[]) =>
  errors.map((error) => [error.line, error.message]);

describe("reportPreOpenUses", () => {
  it("names the open date for every use the engine called never opened", () => {
    expect(
      messages(
        reportPreOpenUses(
          [
            engineError("Account Equity:Init was never opened", 4),
            engineError(
              "Account Assets:Live used on 2019-01-01 but not opened until 2020-01-01",
              4,
            ),
            engineError("Account Assets:Live was never opened", 8),
            engineError("Pad target account Assets:Live was never opened", 9),
            engineError(
              "Invalid reference to unknown account 'Assets:Live'",
              10,
            ),
          ],
          directives,
          files,
        ),
      ),
    ).toEqual([
      [
        4,
        "Account Equity:Init used on 2019-01-01 but not opened until 2020-01-01",
      ],
      [
        4,
        "Account Assets:Live used on 2019-01-01 but not opened until 2020-01-01",
      ],
      [
        8,
        "Account Assets:Live used on 2019-06-01 but not opened until 2020-01-01",
      ],
      [
        9,
        "Account Assets:Live used on 2019-06-01 but not opened until 2020-01-01",
      ],
      [
        10,
        "Account Assets:Live used on 2019-06-01 but not opened until 2020-01-01",
      ],
    ]);
  });

  it("keeps never opened for an account the ledger never opens", () => {
    const unknown = engineError("Account Assets:Nope was never opened", 11);
    expect(reportPreOpenUses([unknown], directives, files)).toEqual([unknown]);
  });

  it("keeps an error dated on or after the open, or with no location", () => {
    const late = engineError("Account Equity:Init was never opened", 11);
    const unlocated = engineError(
      "Account Equity:Init was never opened",
      null,
      null,
    );
    expect(reportPreOpenUses([late, unlocated], directives, files)).toEqual([
      late,
      unlocated,
    ]);
  });

  it("dates the open by the account's earliest one", () => {
    expect(
      messages(
        reportPreOpenUses(
          [engineError("Account Equity:Init was never opened", 4)],
          [
            open("Equity:Init", "2021-01-01"),
            open("Equity:Init", "2020-06-01"),
          ],
          files,
        ),
      ),
    ).toEqual([
      [
        4,
        "Account Equity:Init used on 2019-01-01 but not opened until 2020-06-01",
      ],
    ]);
  });

  it("leaves other errors alone", () => {
    const closed: BeancountError = {
      ...engineError(
        "Posting to inactive account Assets:Old on 2020-04-01 (closed on 2020-03-01)",
        4,
      ),
      code: "E1003",
    };
    expect(reportPreOpenUses([closed], directives, files)).toEqual([closed]);
  });
});
