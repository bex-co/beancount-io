import type { DirectiveJson } from "@rustledger/wasm";
import { orderMetaAsWritten } from "../meta-order";

/**
 * w21/778: the engine's meta is a hash map, so an invoice's fields came back
 * in another order on each load. The stream is scripted here (WASM-free) in
 * an order rustledger returned it.
 */
const invoice = (
  narration: string,
  meta: Record<string, string>,
  postingMeta: Record<string, string> = {},
): DirectiveJson => ({
  type: "transaction",
  date: "2026-10-01",
  flag: "*",
  payee: "Supplier",
  narration,
  tags: [],
  links: [],
  meta,
  postings: [
    {
      account: "Expenses:Office",
      units: { number: "42.00", currency: "USD" },
      meta: postingMeta,
    },
    { account: "Assets:Cash" },
  ],
});
const keysOf = (directive: DirectiveJson) => [
  Object.keys(directive.meta ?? {}),
  ...(directive.type === "transaction"
    ? directive.postings.map((posting) => Object.keys(posting.meta ?? {}))
    : []),
];

describe("orderMetaAsWritten", () => {
  const paper = [
    '2026-10-01 * "Supplier" "Paper"',
    '  invoice: "INV-1"',
    '  po: "PO-7"',
    "  due: 2026-11-01",
    "  paid: TRUE",
    '  note: "hello"',
    "  Expenses:Office  42.00 USD",
    '    step1: "a"',
    '    step2: "b"',
    '    step3: "c"',
    "  Assets:Cash",
  ];

  it("lists an entry's and a posting's keys as the source writes them", () => {
    const entry = invoice(
      "Paper",
      { po: "PO-7", paid: "TRUE", note: "hello", invoice: "INV-1", due: "x" },
      { step2: "b", step1: "a", step3: "c" },
    );
    const posting =
      entry.type === "transaction" ? entry.postings[0] : undefined;
    orderMetaAsWritten([entry], { "main.bean": paper.join("\n") }, "main.bean");
    expect(keysOf(entry)).toEqual([
      ["invoice", "po", "due", "paid", "note"],
      ["step1", "step2", "step3"],
      [],
    ]);
    // In place: the directive and its posting keep their identity.
    expect(entry.type === "transaction" && entry.postings[0]).toBe(posting);
  });

  it("reads a file with Windows line endings", () => {
    const entry = invoice(
      "Paper",
      { po: "", paid: "", note: "", invoice: "", due: "" },
      { step2: "", step1: "", step3: "" },
    );
    orderMetaAsWritten(
      [entry],
      { "main.bean": paper.join("\r\n") },
      "main.bean",
    );
    expect(keysOf(entry)).toEqual([
      ["invoice", "po", "due", "paid", "note"],
      ["step1", "step2", "step3"],
      [],
    ]);
  });

  it("tells same-day entries with the same keys apart", () => {
    const files = {
      "main.bean": [
        'include "other.bean"',
        "",
        '2026-10-01 * "Supplier" "Ink"',
        '  po: "PO-8"',
        '  invoice: "INV-2"',
        "  Expenses:Office  1.00 USD",
        "  Assets:Cash",
      ].join("\n"),
      "other.bean": [
        '2026-10-01 * "Supplier" "Toner"',
        '  invoice: "INV-3"',
        '  po: "PO-9"',
        "  Expenses:Office  1.00 USD",
        "  Assets:Cash",
        "",
        '2026-10-01 * "Supplier" "Staples"',
        '  po: "PO-10"',
        '  invoice: "INV-4"',
        "  Expenses:Office  1.00 USD",
        "  Assets:Cash",
      ].join("\n"),
    };
    const entries = ["Ink", "Toner", "Staples"].map((narration) =>
      invoice(narration, { invoice: "", po: "" }),
    );
    orderMetaAsWritten(entries, files, "main.bean");
    expect(entries.map((entry) => keysOf(entry)[0])).toEqual([
      ["po", "invoice"],
      ["invoice", "po"],
      ["po", "invoice"],
    ]);
  });

  it("orders by key what the source does not show", () => {
    // A forecast's copy, on a day the source writes nothing.
    const generated: DirectiveJson = {
      ...invoice("Paper", { po: "", invoice: "", due: "" }),
      date: "2026-11-01",
    };
    orderMetaAsWritten(
      [generated],
      { "main.bean": paper.join("\n") },
      "main.bean",
    );
    expect(keysOf(generated)[0]).toEqual(["due", "invoice", "po"]);
  });

  it("orders a non-transaction's metadata too", () => {
    const open: DirectiveJson = {
      type: "open",
      date: "2026-01-01",
      account: "Assets:Cash",
      currencies: [],
      meta: { number: "1", bank: "Acme" },
    };
    orderMetaAsWritten(
      [open],
      {
        "main.bean": [
          "2026-01-01 open Assets:Cash",
          '  bank: "Acme"',
          '  number: "1"',
        ].join("\n"),
      },
      "main.bean",
    );
    expect(Object.keys(open.meta ?? {})).toEqual(["bank", "number"]);
  });
});
