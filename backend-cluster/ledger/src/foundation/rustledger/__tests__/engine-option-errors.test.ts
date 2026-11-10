/**
 * Wiring test (w21/308): a parse reports Beancount's own default options
 * without red errors. The live WASM parse needs `--experimental-vm-modules`
 * (see `loader.ts`), so the loader is stubbed with the errors rustledger 0.24
 * returns for `option "account_previous_balances" "Opening-Balances"` and
 * `option "account_rounding" "Rounding"`; the live run is in
 * `scripts/verify-rustledger.ts`.
 */
const wasmError = (message: string) => ({
  message,
  code: null,
  phase: null,
  hint: null,
  file: null,
  line: null,
  column: null,
  end_line: null,
  end_column: null,
  severity: "error",
});

jest.mock("@/foundation/rustledger/loader", () => ({
  loadRustledger: async () => ({
    Ledger: {
      fromFiles: () => ({
        isValid: () => false,
        getErrors: () => [
          wasmError("[E7002] Invalid leaf account name: 'Opening-Balances'"),
          wasmError("[E7002] Invalid leaf account name: 'Rounding'"),
          wasmError(
            "[E7007] Option 'account_rounding' is accepted for compatibility but has no effect: no rounding residual is produced.",
          ),
          wasmError("[E7002] Invalid leaf account name: 'rounding'"),
          wasmError('[E7001] Invalid option "bogus_option"'),
          wasmError("[E7004] Renamed to 'tolerance_multiplier'."),
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

describe("parseLedgerFilesInProcess with Beancount's default options", () => {
  beforeEach(() => clearLedgerSnapshotCache());

  it("drops the valid-leaf errors, warns for E7007 and keeps a real one", async () => {
    const snapshot = await parseLedgerFilesInProcess(
      {
        "main.bean":
          'option "account_previous_balances" "Opening-Balances"\noption "account_rounding" "Rounding"\noption "bogus_option" "x"\n',
      },
      "main.bean",
      { repoPaths: ["main.bean"] },
    );
    expect(
      snapshot.errors.map((error) => [
        error.severity,
        error.message.slice(0, 7),
      ]),
    ).toEqual([
      ["warning", "Option "],
      // An unplaceable one keeps its text, its tag moved into code (w1/209).
      ["error", "Invalid"],
      ["error", "Invalid"],
      ["error", "Renamed"],
    ]);
    // The genuinely invalid leaf is still an error, so the ledger is invalid.
    expect(snapshot.valid).toBe(false);
  });
});

describe("the same parse", () => {
  beforeEach(() => clearLedgerSnapshotCache());

  it("places the option errors on their lines, with their codes (w21/309)", async () => {
    const snapshot = await parseLedgerFilesInProcess(
      {
        "main.bean":
          'option "account_previous_balances" "Opening-Balances"\noption "account_rounding" "Rounding"\noption "bogus_option" "x"\noption "inferred_tolerance_multiplier" "3"\n',
      },
      "main.bean",
      { repoPaths: ["main.bean"] },
    );
    expect(
      snapshot.errors.map((error) => [error.code, error.file, error.line]),
    ).toEqual([
      ["E7007", "main.bean", 2],
      // The leaf 'rounding' matches no option's value: unplaced, but coded.
      ["E7002", null, null],
      ["E7001", "main.bean", 3],
      // The renamed option, on the line that uses its old name (w1/209).
      ["E7004", "main.bean", 4],
    ]);
  });
});
