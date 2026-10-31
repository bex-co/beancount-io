import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";

/**
 * Wiring test (w21/678): BQL books the source itself, so a transaction that
 * fails booking (a sale with no matching lot) was counted by every query while
 * Beancount drops it. The query now runs over the source with that transaction
 * blanked. The live check is the same fixture through the real engine; here
 * the loader is stubbed: a fake ledger reports the BOOK error for the sale and
 * records the source each query ran against.
 */
const built: string[] = [];
const queried: string[] = [];

const BOOK_ERROR = {
  message: 'No matching lot for VTI in Assets:Broker (2026-03-01, "QA Sell")',
  code: "BOOK",
  phase: "validate",
  hint: null,
  file: null,
  line: null,
  column: null,
  end_line: null,
  end_column: null,
  severity: "error",
};

jest.mock("@/foundation/rustledger/loader", () => ({
  loadRustledger: async () => ({
    Ledger: {
      fromFiles: (files: Record<string, string>, entryPoint: string) => {
        const text = files[entryPoint];
        built.push(text);
        return {
          isValid: () => true,
          getErrors: () => (text.includes("QA Sell") ? [BOOK_ERROR] : []),
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
            queried.push(text);
            return { columns: ["value"], rows: [["1"]], errors: [] };
          },
          free: () => undefined,
        };
      },
    },
  }),
}));

import {
  clearLedgerSnapshotCache,
  clearQueryLedgerCache,
  queryLedgerFilesResultInProcess,
} from "@/foundation/rustledger/engine";

const SALE = [
  '2026-03-01 * "QA Sell"',
  "  Assets:Broker  -5 VTI {101.00 USD} @ 120.00 USD",
  "  Assets:BrCash  600.00 USD",
  "  Income:Gains",
];
const GOOD = [
  "2026-01-01 open Assets:BrCash USD",
  '2026-01-02 * "QA Fund"',
  "  Assets:BrCash  5000.00 USD",
  "  Equity:Opening",
];

beforeEach(() => {
  built.length = 0;
  queried.length = 0;
  clearLedgerSnapshotCache();
  clearQueryLedgerCache();
});

describe("BQL over a ledger with a transaction that failed booking", () => {
  it("runs over the source without it, keeping every other line where it was", async () => {
    const main = [
      ...GOOD,
      "",
      ...SALE,
      "",
      '2026-04-01 note Assets:BrCash "x"',
    ].join("\n");
    await queryLedgerFilesResultInProcess(
      { "main.bean": main },
      "main.bean",
      "SELECT account",
    );
    expect(queried).toHaveLength(1);
    const ran = queried[0];
    expect(ran).not.toContain("QA Sell");
    expect(ran).not.toContain("Income:Gains");
    expect(ran).toContain("QA Fund");
    expect(ran).toContain("2026-04-01 note");
    expect(ran.split("\n")).toHaveLength(main.split("\n").length);
  });

  it("queries a ledger with no booking error over its own source", async () => {
    const main = GOOD.join("\n");
    await queryLedgerFilesResultInProcess(
      { "main.bean": main },
      "main.bean",
      "SELECT account",
    );
    expect(queried).toEqual([main]);
    // One parse, shared with the probe.
    expect(built).toEqual([main]);
  });
});
