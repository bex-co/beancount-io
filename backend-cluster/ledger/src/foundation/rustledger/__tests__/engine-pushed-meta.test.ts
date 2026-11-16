import type { DirectiveJson, FileMap, LedgerOptions } from "@rustledger/wasm";

/**
 * Wiring test (w31/028): inside `pushmeta qa-c: "pushed"`, an entry that
 * writes `qa-c: "own"` keeps `"own"` on the parse and in BQL, as in Beancount.
 * The stubbed engine reads the push over the entry's key, as rustledger 0.24
 * does, unless the files it is given carry no `pushmeta`; the live engine runs
 * the same fixture in `yarn verify:rustledger`.
 */
const queriedEntryPoints: string[] = [];

const entry = (meta: Record<string, string>): DirectiveJson => ({
  type: "transaction",
  date: "2026-09-26",
  flag: "*",
  payee: "PAYEE-C1",
  narration: "own key",
  tags: [],
  links: [],
  meta,
  postings: [
    {
      account: "Expenses:Food:Coffee",
      units: { number: "1.00", currency: "USD" },
    },
    {
      account: "Assets:Cash",
      units: { number: "-1.00", currency: "USD" },
    },
  ],
});

jest.mock("@/foundation/rustledger/loader", () => ({
  loadRustledger: async () => ({
    Ledger: {
      fromFiles: (files: FileMap, entryPoint: string) => {
        const pushes = Object.values(files).some((source) =>
          /^pushmeta /mu.test(source),
        );
        const directives = () => [entry({ "qa-c": pushes ? "pushed" : "own" })];
        return {
          isValid: () => true,
          getErrors: () => [],
          getOptions: () =>
            ({ title: null, operating_currencies: [] }) as LedgerOptions,
          getDirectives: directives,
          expandPads: () => ({
            directives: directives(),
            padding_transactions: [],
            errors: [],
          }),
          directiveCount: () => 1,
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
  clearQueryLedgerCache,
  parseLedgerFilesInProcess,
  queryLedgerFilesResultInProcess,
} from "@/foundation/rustledger/engine";

const OPENS =
  "2026-01-01 open Expenses:Food:Coffee\n2026-01-01 open Assets:Cash\n\n";
const ENTRY =
  '2026-09-26 * "PAYEE-C1" "own key"\n  qa-c: "own"\n  Expenses:Food:Coffee   1.00 USD\n  Assets:Cash\n';
const COLLIDING = `${OPENS}pushmeta qa-c: "pushed"\n${ENTRY}popmeta qa-c:\n`;

describe("an entry's own key under pushmeta", () => {
  beforeEach(() => {
    queriedEntryPoints.length = 0;
    clearLedgerSnapshotCache();
    clearQueryLedgerCache();
  });

  it("keeps the entry's value on the parse", async () => {
    const snapshot = await parseLedgerFilesInProcess(
      { "main.bean": COLLIDING },
      "main.bean",
    );
    expect(snapshot.directives.map((directive) => directive.meta)).toEqual([
      { "qa-c": "own" },
    ]);
  });

  it("queries the corrected stream when an entry writes a pushed key", async () => {
    await queryLedgerFilesResultInProcess(
      { "main.bean": COLLIDING },
      "main.bean",
      "SELECT entry_meta('qa-c')",
    );
    expect(queriedEntryPoints).toEqual(["__plugin_transformed__.bean"]);
  });

  it("queries the files as written when no entry writes a pushed key", async () => {
    await queryLedgerFilesResultInProcess(
      {
        "main.bean": `${OPENS}pushmeta qa-c: "pushed"\n${ENTRY.replace('  qa-c: "own"\n', "")}popmeta qa-c:\n`,
      },
      "main.bean",
      "SELECT entry_meta('qa-c')",
    );
    expect(queriedEntryPoints).toEqual(["main.bean"]);
  });
});
