import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";

let queryThrows: Error | undefined;

jest.mock("@/foundation/rustledger/loader", () => ({
  loadRustledger: async () => ({
    Ledger: {
      fromFiles: () => ({
        isValid: () => true,
        getErrors: () => [],
        getOptions: () =>
          ({ title: null, operating_currencies: [] }) as LedgerOptions,
        getDirectives: () => [] as DirectiveJson[],
        expandPads: () => ({
          directives: [] as DirectiveJson[],
          padding_transactions: [],
          errors: [],
        }),
        directiveCount: () => 0,
        query: () => {
          if (queryThrows) throw queryThrows;
          return { columns: ["value"], rows: [["1"]], errors: [] };
        },
        free: () => undefined,
      }),
    },
  }),
}));

import {
  clearQueryLedgerCache,
  isUnsupportedIntegerResultError,
  queryLedgerFilesResult,
} from "@/foundation/rustledger/engine";

const FILES = {
  "main.beancount": [
    "2024-01-01 open Assets:Cash USD",
    "2024-01-01 open Income:Salary USD",
  ].join("\n"),
};

describe("query integer result normalization", () => {
  beforeEach(() => {
    queryThrows = undefined;
    clearQueryLedgerCache();
  });

  it("recognizes rustledger's unsupported-integer conversion error", () => {
    expect(
      isUnsupportedIntegerResultError(
        new Error("can't be represented as a JavaScript number"),
      ),
    ).toBe(true);
    expect(isUnsupportedIntegerResultError(new Error("syntax error"))).toBe(
      false,
    );
  });

  it("returns a structured query error instead of throwing", async () => {
    queryThrows = new Error("can't be represented as a JavaScript number");

    const result = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      "SELECT 9007199254740993 AS value LIMIT 1",
    );

    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        severity: "error",
        phase: "query",
        message: expect.stringContaining("can't be represented as a JavaScript number"),
      }),
    ]);
  });

  it("rethrows unrelated engine failures", async () => {
    queryThrows = new Error("worker crashed");

    await expect(
      queryLedgerFilesResult(
        FILES,
        "main.beancount",
        "SELECT 1 AS value LIMIT 1",
      ),
    ).rejects.toThrow("worker crashed");
  });
});
