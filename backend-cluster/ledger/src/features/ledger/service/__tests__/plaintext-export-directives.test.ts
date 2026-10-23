import type { DirectiveJson } from "@rustledger/wasm";
import { plaintextExportDirectives } from "@/features/ledger/service/ledger-journal-service";
import { markGeneratedDirective } from "@/foundation/rustledger/plugins/provenance";

const txn = (flag: string, narration: string): DirectiveJson =>
  ({
    type: "transaction",
    date: "2016-01-01",
    flag,
    narration,
    tags: [],
    links: [],
    meta: {},
    postings: [],
  }) as unknown as DirectiveJson;

// The pad pass's transaction, marked generated as the engine marks it.
const padding = txn(
  "P",
  "(Padding inserted for Balance of 800 USD for difference 300 USD)",
);
markGeneratedDirective(padding);
// The time clamp's own entries, which are not the ledger's.
const clamped = [
  txn("S", "Opening balance for 'Assets:Brokerage' (Summarization)"),
  txn("T", "Transfer balance"),
  txn("C", "Conversion for (-80 USD)"),
];
const stream = [
  { type: "open", date: "2015-01-01", account: "Assets:Cash" },
  clamped[0],
  { type: "pad", date: "2016-03-01", account: "Assets:Cash" },
  padding,
  { type: "balance", date: "2016-03-02", account: "Assets:Cash" },
  txn("*", "Sell part of the pre-window lot"),
  txn("!", "Pending"),
  clamped[1],
  clamped[2],
  { type: "price", date: "2016-04-01", currency: "VHT" },
] as unknown as DirectiveJson[];
const ledger = new Set(stream.filter((d) => !clamped.includes(d)));

const describeEach = (directives: DirectiveJson[]) =>
  directives.map((directive) =>
    directive.type === "transaction"
      ? `${directive.flag} ${directive.narration}`
      : directive.type,
  );

describe("plaintextExportDirectives", () => {
  it("keeps a time window's opening summaries so the export loads on its own", () => {
    expect(
      describeEach(
        plaintextExportDirectives(stream, { windowed: true, ledger }),
      ),
    ).toEqual([
      "S Opening balance for 'Assets:Brokerage' (Summarization)",
      "pad",
      "balance",
      "* Sell part of the pre-window lot",
      "! Pending",
    ]);
  });

  it("emits pads but never the synthetic padding, transfer or conversion entries", () => {
    expect(
      describeEach(
        plaintextExportDirectives(stream, { windowed: false, ledger }),
      ),
    ).toEqual([
      "pad",
      "balance",
      "* Sell part of the pre-window lot",
      "! Pending",
    ]);
  });

  // w21/745: since the API accepts any capital-letter flag (w21/652), these
  // are entries the user wrote, and they were left out of the export.
  it("exports a transaction written with a flag journal.py reserves", () => {
    const written = ["R", "S", "C", "P"].map((flag) =>
      txn(flag, `Written with flag ${flag}`),
    );
    expect(
      describeEach(
        plaintextExportDirectives(written, {
          windowed: false,
          ledger: new Set(written),
        }),
      ),
    ).toEqual([
      "R Written with flag R",
      "S Written with flag S",
      "C Written with flag C",
      "P Written with flag P",
    ]);
  });
});
