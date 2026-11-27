import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";

/**
 * Wiring test (w21/323): BQL runs over the materialized stream, not the raw
 * files, when the ledger declares a pad. The engine pads every non-zero
 * difference and the parse path drops the padding a balance's tolerance would
 * not (w21/135); BQL over the raw files summed the padded balance (100.00) the
 * journal and trial balance do not show (98.00). The live check is the same
 * fixture through `scripts/verify-rustledger.ts`'s engine; here the loader is
 * stubbed and the entry point each ledger is built from is recorded.
 */
// The entry point of the ledger each query ran against (a live ledger is
// cached by content, so this is what ran, not what was built last).
const queriedEntryPoints: string[] = [];

jest.mock("@/foundation/rustledger/loader", () => ({
  loadRustledger: async () => ({
    Ledger: {
      fromFiles: (_files: unknown, entryPoint: string) => {
        return {
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
            queriedEntryPoints.push(entryPoint);
            return { columns: ["value"], rows: [["1"]], errors: [] };
          },
          free: () => undefined,
        };
      },
    },
  }),
}));

// Imported AFTER the mock so engine.ts picks up the stubbed loader.
import {
  clearLedgerSnapshotCache,
  queryLedgerFilesResultInProcess,
} from "@/foundation/rustledger/engine";

const WITH_PAD =
  "2020-01-01 open Assets:Cash USD\n2020-01-04 pad Assets:Cash Equity:Opening\n2020-01-05 balance Assets:Cash 100.00 ~ 5.00 USD\n";
const WITHOUT_PAD =
  "2020-01-01 open Assets:Cash USD\n2020-01-05 balance Assets:Cash 100.00 USD\n";

describe("queryLedgerFilesResultInProcess and pads", () => {
  beforeEach(() => {
    queriedEntryPoints.length = 0;
    clearLedgerSnapshotCache();
  });

  it("queries the materialized stream when a pad is declared", async () => {
    await queryLedgerFilesResultInProcess(
      { "main.bean": WITH_PAD },
      "main.bean",
      "SELECT 1",
    );
    expect(queriedEntryPoints).toEqual(["__plugin_transformed__.bean"]);
  });

  it("queries the files as written when there is no pad, as before", async () => {
    await queryLedgerFilesResultInProcess(
      { "main.bean": WITHOUT_PAD },
      "main.bean",
      "SELECT 1",
    );
    expect(queriedEntryPoints).toEqual(["main.bean"]);
  });

  // w31/107: stock's lexer reads `2020/01/04` and `2020-1-4` as dates.
  it.each(["2020/01/04", "2020-1-4"])("sees a pad dated %s", async (date) => {
    await queryLedgerFilesResultInProcess(
      { "main.bean": WITH_PAD.replace("2020-01-04", date) },
      "main.bean",
      "SELECT 1",
    );
    expect(queriedEntryPoints).toEqual(["__plugin_transformed__.bean"]);
  });

  it.each(["2020-01-06", "2020/01/06", "2020-1-6"])(
    "queries the materialized stream for a tagged document dated %s",
    async (date) => {
      await queryLedgerFilesResultInProcess(
        {
          "main.bean": `${WITHOUT_PAD}${date} document Assets:Cash "a.pdf" #tax\n`,
        },
        "main.bean",
        "SELECT 1",
      );
      expect(queriedEntryPoints).toEqual(["__plugin_transformed__.bean"]);
    },
  );

  it("sees a pad in an included file too", async () => {
    await queryLedgerFilesResultInProcess(
      { "main.bean": 'include "sub.bean"\n', "sub.bean": WITH_PAD },
      "main.bean",
      "SELECT 1",
    );
    expect(queriedEntryPoints).toEqual(["__plugin_transformed__.bean"]);
  });
});
