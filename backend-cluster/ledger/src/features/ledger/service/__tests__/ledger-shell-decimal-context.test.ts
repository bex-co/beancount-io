import type { QueryResult } from "@rustledger/wasm";
import {
  queryResultToShellResult,
  queryResultToText,
} from "../ledger-shell-mappers";

const result = (columns: string[], rows: unknown[][]): QueryResult =>
  ({ columns, rows, errors: [] }) as unknown as QueryResult;

const structured = (columns: string[], rows: unknown[][]) =>
  queryResultToShellResult(result(columns, rows)).table!.rows;

const textRows = (columns: string[], rows: unknown[][]) =>
  queryResultToText(result(columns, rows))
    .trimEnd()
    .split("\n")
    .slice(2)
    .map((line) => line.trim());

/**
 * w31/117: stock beanquery runs BQL arithmetic in Python's default `Decimal`
 * context (28 significant digits, half-even), while `@rustledger/wasm` keeps
 * 29 where its 96-bit mantissa allows. The engine's quotients on the left; the
 * digits stock beanquery 0.2.0 and `bea query` print on the right.
 */
const QUOTIENTS: [string, string][] = [
  ["3333.3333333333333333333333333", "3333.333333333333333333333333"],
  ["166.66666666666666666666666667", "166.6666666666666666666666667"],
  ["1.6666666666666666666666666667", "1.666666666666666666666666667"],
  ["28.571428571428571428571428571", "28.57142857142857142857142857"],
  ["16.583333333333333333333333333", "16.58333333333333333333333333"],
];

/** Values stock prints the same way, which must pass through untouched. */
const FITTING = [
  "0.3333333333333333333333333333", // the scale caps a quotient below 1
  "-8.571428571428571428571428571", // a mantissa past 96 bits stops at 28
  "1000.00",
  "-0.00000000000000000000000000",
  "0",
];

describe("BQL arithmetic under Python's Decimal context (w31/117)", () => {
  it("rounds a Decimal column to 28 significant digits in the structured result", () => {
    const rows = structured(
      ["third"],
      QUOTIENTS.map(([engine]) => [engine]),
    );
    expect(rows).toEqual(QUOTIENTS.map(([, stock]) => [stock]));
  });

  it("prints the same digits in the text table", () => {
    expect(
      textRows(
        ["third"],
        QUOTIENTS.map(([engine]) => [engine]),
      ),
    ).toEqual(QUOTIENTS.map(([, stock]) => stock));
  });

  it("leaves a value that already fits exactly as the engine wrote it", () => {
    const rows = FITTING.map((value) => [value]);
    expect(structured(["x"], rows)).toEqual(rows);
    expect(textRows(["x"], rows)).toEqual(FITTING);
  });

  it("keeps 28 digits when the engine's extra digit is a trailing zero", () => {
    // `10000.00 + 0.0000000000000000000000000001` and
    // `500.00 * 1.000000000000000000000000001` on stock.
    expect(
      structured(
        ["s"],
        [
          ["10000.000000000000000000000000"],
          ["500.00000000000000000000000050"],
        ],
      ),
    ).toEqual([
      ["10000.00000000000000000000000"],
      ["500.0000000000000000000000005"],
    ]);
  });

  it("rounds half-even and carries across a power of ten", () => {
    expect(
      structured(
        ["s"],
        [
          ["1.0000000000000000000000000025"],
          ["1.0000000000000000000000000035"],
          ["9999.9999999999999999999999999"],
          ["-0.000012345678901234567890123456789"],
        ],
      ),
    ).toEqual([
      ["1.000000000000000000000000002"],
      ["1.000000000000000000000000004"],
      ["10000.00000000000000000000000"],
      ["-0.00001234567890123456789012345679"],
    ]);
  });

  it("rounds the numbers inside Amount, Position and Inventory cells", () => {
    // `convert(position, 'GBP')` at 3 USD per GBP, and a lot bought for a
    // total cost of `{{100.00 USD}}` over 3 units.
    const amount = {
      number: "33.333333333333333333333333330",
      currency: "GBP",
    };
    const position = {
      units: { number: "3", currency: "HOOL" },
      cost: {
        number: "33.333333333333333333333333333",
        currency: "USD",
        date: "2025-01-04",
      },
    };
    const inventory = {
      positions: [
        {
          units: { number: "46.666666666666666666666666667", currency: "USD" },
        },
      ],
    };
    const columns = ["c", "position", "balance"];
    const rows = [[amount, position, inventory]];
    expect(structured(columns, rows)).toEqual([
      [
        { GBP: "33.33333333333333333333333333" },
        "3 HOOL {33.33333333333333333333333333 USD, 2025-01-04}",
        { USD: "46.66666666666666666666666667" },
      ],
    ]);
    expect(queryResultToText(result(columns, rows))).toContain(
      "33.33333333333333333333333333 GBP  3 HOOL {33.33333333333333333333333333 USD, 2025-01-04}  46.66666666666666666666666667 USD",
    );
  });

  it("rounds an inventory's summed lots like one more addition", () => {
    const inventory = {
      positions: [
        { units: { number: "9.999999999999999999999999999", currency: "USD" } },
        { units: { number: "9.999999999999999999999999999", currency: "USD" } },
      ],
    };
    expect(structured(["balance"], [[inventory]])).toEqual([
      [{ USD: "20.00000000000000000000000000" }],
    ]);
  });

  it("never rounds text in a str column, however numeric it looks", () => {
    const payee = "1234567890123456789012345678901";
    expect(structured(["payee"], [[payee]])).toEqual([[payee]]);
    expect(textRows(["payee"], [[payee]])).toEqual([payee]);
  });
});
