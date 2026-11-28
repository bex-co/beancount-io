import type { QueryResult } from "@rustledger/wasm";
import { queryResultToShellResult } from "../ledger-shell-mappers";

// w21/329: a shell query's summed inventory printed BigNumber's `toString()`, so
// 0.0000003 + 0.0000002 showed "5e-7" and 1250.50 + 0.00 showed "1250.5".
const sumOf = (...numbers: string[]) => {
  const result = {
    columns: ["sum(position)"],
    rows: [
      [
        {
          positions: numbers.map((number) => ({
            units: { number, currency: "BTC" },
          })),
        },
      ],
    ],
    errors: [],
  } as unknown as QueryResult;
  return queryResultToShellResult(result).table!.rows[0]![0];
};

describe("summed inventories in shell results", () => {
  it("never prints exponent notation", () => {
    expect(sumOf("0.0000003", "0.0000002")).toEqual({ BTC: "0.0000005" });
    // An exponent in the input is written out too.
    expect(sumOf("4e-7", "1e-7")).toEqual({ BTC: "0.0000005" });
  });

  it("keeps the written scale, trailing zeros included", () => {
    expect(sumOf("1000.25", "250.25")).toEqual({ BTC: "1250.50" });
    expect(sumOf("1250.000", "0.50")).toEqual({ BTC: "1250.500" });
    expect(sumOf("3", "4")).toEqual({ BTC: "7" });
  });

  it("leaves a single position as written, and drops a zero net", () => {
    expect(sumOf("2950.00")).toEqual({ BTC: "2950.00" });
    expect(sumOf("1.5", "-1.5")).toEqual({});
  });

  it("does not count an emptied lot, scale included (w31/160)", () => {
    // The engine merges positions of one lot, so a zero beside another is a
    // lot a sale emptied. Stock removes it, and the held lot reads as written.
    expect(sumOf("1250.50", "0.000")).toEqual({ BTC: "1250.50" });
    expect(sumOf("0", "2950.00", "0.0")).toEqual({ BTC: "2950.00" });
  });
});
