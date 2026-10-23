import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";

/**
 * w21/875: on a ledger with no plugin at all, a padding entry had no source ID
 * (source IDs were only recorded when a plugin or a document needed them), so
 * its detail came back NOT_FOUND and the app read "changed or removed". The
 * engine is stubbed (WASM-free); the live check is the same fixture through the
 * real engine.
 */
const pad: DirectiveJson = {
  type: "pad",
  date: "2020-01-04",
  account: "Assets:Cash",
  source_account: "Equity:Opening",
};
const padding: DirectiveJson = {
  type: "transaction",
  date: "2020-01-04",
  flag: "P",
  narration:
    "(Padding inserted for Balance of 100.00 USD for difference 100.00 USD)",
  tags: [],
  links: [],
  postings: [
    { account: "Assets:Cash", units: { number: "100.00", currency: "USD" } },
    {
      account: "Equity:Opening",
      units: { number: "-100.00", currency: "USD" },
    },
  ],
};

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
          directives: [{ ...pad }],
          padding_transactions: [{ ...padding }],
          errors: [],
        }),
        directiveCount: () => 1,
        free: () => undefined,
      }),
    },
  }),
}));

import {
  clearLedgerSnapshotCache,
  parseLedgerFilesInProcess,
} from "@/foundation/rustledger/engine";
import {
  getDirectiveSourceId,
  isGeneratedDirective,
} from "@/foundation/rustledger/plugins/provenance";

const SOURCE =
  "2020-01-01 open Assets:Cash USD\n2020-01-04 pad Assets:Cash Equity:Opening\n2020-01-05 balance Assets:Cash 100.00 USD\n";

describe("a padding entry on a ledger with no plugins", () => {
  beforeEach(() => clearLedgerSnapshotCache());

  it("carries its pad's source ID, as one does with a plugin", async () => {
    const snapshot = await parseLedgerFilesInProcess(
      { "main.bean": SOURCE },
      "main.bean",
    );
    const generated = snapshot.directives.find(
      (directive) => directive.type === "transaction",
    )!;
    const written = snapshot.directives.find(
      (directive) => directive.type === "pad",
    )!;
    expect(isGeneratedDirective(generated)).toBe(true);
    expect(getDirectiveSourceId(written)).toBeDefined();
    expect(getDirectiveSourceId(generated)).toBe(getDirectiveSourceId(written));
  });

  it("records source IDs only when there is padding to need them", async () => {
    clearLedgerSnapshotCache();
    const snapshot = await parseLedgerFilesInProcess(
      { "main.bean": SOURCE },
      "main.bean",
    );
    expect(snapshot.sourceIds?.length).toBe(snapshot.directives.length);
  });
});
