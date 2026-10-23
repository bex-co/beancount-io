import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { reconcileUniquePriceErrors } from "../unique-prices";

/**
 * w21/735: rustledger's unique_prices raises "Duplicate price for …" for every
 * same-day repeat, equal ones too, without a location; Beancount raises
 * "Disagreeing price entries" once per pair and day, only when they disagree.
 * The booked stream and the engine's errors are scripted here (WASM-free), as
 * rustledger returns them.
 */
const price = (date: string, number: string, quote = "USD"): DirectiveJson => ({
  type: "price",
  date,
  currency: "VTI",
  amount: { number, currency: quote },
});
const duplicate = (date: string, quote = "USD"): BeancountError => ({
  message: `Duplicate price for VTI/${quote} on ${date}`,
  code: "PLUGIN",
  phase: "plugin",
  hint: null,
  file: null,
  line: null,
  column: null,
  end_line: null,
  end_column: null,
  severity: "error",
});
const UNIQUE = 'plugin "beancount.plugins.unique_prices"\n';
/** The reconciled errors over `source` as the ledger's one file. */
const check = (
  errors: BeancountError[],
  directives: DirectiveJson[],
  source: string,
) =>
  reconcileUniquePriceErrors(
    errors,
    directives,
    { "main.bean": source },
    "main.bean",
  ).map((error) => [error.file, error.line, error.message]);

describe("reconcileUniquePriceErrors", () => {
  it("raises nothing for equal prices, however they are written", () => {
    const source = [
      UNIQUE,
      "2024-01-08 price VTI 100 USD",
      "2024-01-08 price VTI 100.00 USD",
    ].join("\n");
    expect(
      check(
        [duplicate("2024-01-08")],
        [price("2024-01-08", "100"), price("2024-01-08", "100.00")],
        source,
      ),
    ).toEqual([]);
  });

  it("raises one error per disagreeing day, where bean-check does", () => {
    // Beancount keeps the last entry of each number and names the first's.
    const source = [
      UNIQUE,
      "2024-01-09 price VTI 100 USD",
      "2024-01-09 price VTI 101 USD",
      "2024-01-09 price VTI 100 USD",
      "2024-01-10 price VTI 5 EUR",
      "2024-01-10 price VTI 6 USD",
    ].join("\n");
    expect(
      check(
        [duplicate("2024-01-09"), duplicate("2024-01-09")],
        [
          price("2024-01-09", "100"),
          price("2024-01-09", "101"),
          price("2024-01-09", "100"),
          price("2024-01-10", "5", "EUR"),
          price("2024-01-10", "6"),
        ],
        source,
      ),
    ).toEqual([["main.bean", 5, "Disagreeing price entries"]]);
  });

  it("places an implicit price on its transaction's line", () => {
    const source = [
      'plugin "beancount.plugins.implicit_prices"',
      UNIQUE,
      '2024-01-09 * "Buy"',
      "  Assets:Broker  1 VTI {401 USD}",
      "  Assets:Cash",
      "2024-01-09 price VTI 405 USD",
      '2024-01-10 * "Buy total"',
      "  ! Assets:Broker  2 VTI {{810 USD}}",
      "  Assets:Cash",
      "2024-01-10 price VTI 405 USD",
      "2024-01-10 price VTI 406 USD",
    ].join("\n");
    // The engine streams its implicit prices after the day's explicit ones.
    expect(
      check(
        [duplicate("2024-01-09"), duplicate("2024-01-10")],
        [
          price("2024-01-09", "405"),
          price("2024-01-09", "401"),
          price("2024-01-10", "405"),
          price("2024-01-10", "406"),
          price("2024-01-10", "405"),
        ],
        source,
      ),
    ).toEqual([
      ["main.bean", 4, "Disagreeing price entries"],
      ["main.bean", 11, "Disagreeing price entries"],
    ]);
  });

  it("sorts the day by line, not file, as Beancount does", () => {
    const files = {
      "main.bean": `${UNIQUE}include "other.bean"\n\n2024-01-09 price VTI 100 USD\n`,
      "other.bean":
        "2024-01-09 price VTI 101 USD\n2024-01-09 price VTI 100 USD\n",
    };
    expect(
      reconcileUniquePriceErrors(
        [duplicate("2024-01-09")],
        [
          price("2024-01-09", "100"),
          price("2024-01-09", "101"),
          price("2024-01-09", "100"),
        ],
        files,
        "main.bean",
      ).map((error) => [error.file, error.line]),
    ).toEqual([["other.bean", 1]]);
  });

  it("names the pair and day when the source does not show the prices", () => {
    expect(
      check(
        [duplicate("2024-01-09")],
        [price("2024-01-09", "100"), price("2024-01-09", "101")],
        UNIQUE,
      ),
    ).toEqual([
      [null, null, "Disagreeing price entries (VTI/USD on 2024-01-09)"],
    ]);
  });

  it("leaves every other error alone", () => {
    const other = { ...duplicate("2024-01-09"), message: "Unknown account" };
    expect(check([other], [], "")).toEqual([[null, null, "Unknown account"]]);
  });
});
