/**
 * Wiring test: a parse reports a URL include as the user wrote it. The live WASM
 * parse needs `--experimental-vm-modules` (see `loader.ts`), so the loader is
 * stubbed with the error rustledger 0.21.0 actually returns for
 * `include "https://beancount.io/prices/BTCUSD"` in `main.bean`.
 */
jest.mock("@/foundation/rustledger/loader", () => ({
  loadRustledger: async () => ({
    Ledger: {
      fromFiles: () => ({
        isValid: () => false,
        getErrors: () => [
          {
            message:
              "failed to read file https:/beancount.io/prices/BTCUSD: file not found in virtual filesystem: https:/beancount.io/prices/BTCUSD",
            code: "LOAD",
            phase: "parse",
            hint: null,
            file: null,
            line: null,
            column: null,
            end_line: null,
            end_column: null,
            severity: "error",
          },
        ],
        getOptions: () => ({ title: null, operating_currencies: [] }),
        getDirectives: () => [],
        expandPads: () => ({
          directives: [],
          padding_transactions: [],
          errors: [],
        }),
        directiveCount: () => 0,
        free: () => undefined,
      }),
    },
  }),
}));

// Imported AFTER the mock so engine.ts picks up the stubbed loader.
import {
  clearLedgerSnapshotCache,
  parseLedgerFilesInProcess,
} from "@/foundation/rustledger/engine";

describe("parseLedgerFilesInProcess with a URL include", () => {
  beforeEach(() => clearLedgerSnapshotCache());

  it("reports the include as written, at its line, instead of the collapsed path", async () => {
    const snapshot = await parseLedgerFilesInProcess(
      {
        "main.bean":
          '2020-01-01 open Assets:Cash USD\ninclude "https://beancount.io/prices/BTCUSD"\n',
      },
      "main.bean",
      { repoPaths: ["main.bean"] },
    );

    expect(snapshot.valid).toBe(false);
    expect(
      snapshot.errors.map((error) => [error.message, error.file, error.line]),
    ).toEqual([
      [
        'include "https://beancount.io/prices/BTCUSD": include targets must be paths inside the ledger repository; remote URLs are not supported',
        "main.bean",
        2,
      ],
    ]);
  });
});
