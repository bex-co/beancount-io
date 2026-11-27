import type { DirectiveJson } from "@rustledger/wasm";
import { zeroUnitsAtCostErrors } from "../zero-units-at-cost";

/**
 * w31/140: stock bean-check 3.2.3 refuses a posting held at cost whose units
 * are zero (`Amount is zero: "0 VTI"`, on the posting's line); rustledger
 * 0.24.0 books it as an empty lot and reports nothing. The booked stream is
 * scripted here (WASM-free) as the engine returns it; the same fixtures run
 * through the real engine in `verify:rustledger`.
 */
type Posting = Extract<
  DirectiveJson,
  { type: "transaction" }
>["postings"][number];

const atCost = (
  units: string,
  cost: NonNullable<Posting["cost"]>,
  account = "Assets:Broker",
): Posting => ({ account, units: { number: units, currency: "VTI" }, cost });
const perUnit = (value: string): NonNullable<Posting["cost"]> => ({
  number: { kind: "per_unit", value },
  currency: "USD",
  date: "2026-09-01",
});
const cash = (number: string): Posting => ({
  account: "Assets:Cash",
  units: { number, currency: "USD" },
});
const txn = (
  narration: string,
  postings: Posting[],
  date = "2026-09-01",
): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  payee: "qa",
  narration,
  tags: [],
  links: [],
  postings,
});

const HEADER = [
  "2026-01-01 open Assets:Cash USD",
  "2026-01-01 open Assets:Broker",
  "",
];
/** The rule over `lines` (after two opens) as the ledger's one file. */
const check = (directives: DirectiveJson[], ...lines: string[]) =>
  zeroUnitsAtCostErrors(
    directives,
    { "main.bean": [...HEADER, ...lines, ""].join("\n") },
    "main.bean",
  ).map((error) => [error.file, error.line, error.code, error.message]);

describe("zeroUnitsAtCostErrors", () => {
  it("refuses zero units at an explicit cost on the posting's line, as stock does", () => {
    expect(
      check(
        [txn("zero", [atCost("0", perUnit("5")), cash("0")])],
        '2026-09-01 * "qa" "zero"',
        "  Assets:Broker  0 VTI {5 USD}",
        "  Assets:Cash  0 USD",
      ),
    ).toEqual([
      ["main.bean", 5, "ZERO_UNITS_AT_COST", 'Amount is zero: "0 VTI"'],
    ]);
  });

  it("accepts zero units at an empty cost, as stock does", () => {
    expect(
      check(
        [txn("empty", [atCost("0", {}), cash("0")])],
        '2026-09-01 * "qa" "empty"',
        "  Assets:Broker  0 VTI {}",
        "  Assets:Cash  0 USD",
      ),
    ).toEqual([]);
  });

  it("accepts a cost with only a date, a label or a currency, and a priced zero", () => {
    const zeroEur: Posting = {
      account: "Assets:Cash",
      units: { number: "0", currency: "EUR" },
      price: { number: "1.1", currency: "USD" },
    };
    expect(
      check([
        txn("date", [atCost("0", { date: "2026-08-01" }), cash("0")]),
        txn("label", [atCost("0", { label: "lot" }), cash("0")]),
        txn("currency", [atCost("0", { currency: "USD" }), cash("0")]),
        txn("price", [zeroEur, cash("0")]),
      ]),
    ).toEqual([]);
  });

  it("leaves a posting with units alone", () => {
    expect(
      check(
        [txn("buy", [atCost("10", perUnit("5")), cash("-50")])],
        '2026-09-01 * "qa" "buy"',
        "  Assets:Broker  10 VTI {5 USD}",
        "  Assets:Cash  -50 USD",
      ),
    ).toEqual([]);
  });

  it("prints the units as booked: their scale, and a cost of zero or a total", () => {
    expect(
      check(
        [
          txn("scaled", [atCost("0.00", perUnit("5")), cash("0")]),
          txn("free", [atCost("0", perUnit("0")), cash("0")]),
          txn("total", [
            atCost("0", {
              number: { kind: "total", value: "5" },
              currency: "USD",
            }),
            cash("-5"),
          ]),
        ],
        '2026-09-01 * "qa" "scaled"',
        "  Assets:Broker  0.00 VTI {5 USD}",
        "  Assets:Cash  0 USD",
        '2026-09-01 * "qa" "free"',
        "  Assets:Broker  0 VTI {0 USD}",
        "  Assets:Cash  0 USD",
        '2026-09-01 * "qa" "total"',
        "  Assets:Broker  0 VTI {{5 USD}}",
        "  Assets:Cash  -5 USD",
      ),
    ).toEqual([
      ["main.bean", 5, "ZERO_UNITS_AT_COST", 'Amount is zero: "0.00 VTI"'],
      ["main.bean", 8, "ZERO_UNITS_AT_COST", 'Amount is zero: "0 VTI"'],
      ["main.bean", 11, "ZERO_UNITS_AT_COST", 'Amount is zero: "0 VTI"'],
    ]);
  });

  it("places a zero sale on its own block, past a same-day buy of the lot", () => {
    expect(
      check(
        [
          txn("buy", [atCost("1", perUnit("5")), cash("-5")]),
          txn("sale", [
            atCost("1", perUnit("5")),
            atCost("0", perUnit("5")),
            cash("-5"),
          ]),
        ],
        '2026-09-01 * "qa" "buy"',
        "  Assets:Broker  1 VTI {5 USD}",
        "  Assets:Cash  -5 USD",
        "",
        '2026-09-01 * "qa" "sale"',
        "  Assets:Broker  1 VTI {5 USD}",
        "  Assets:Broker  0 VTI {5 USD}",
        "  Assets:Cash  -5 USD",
      ),
    ).toEqual([
      ["main.bean", 10, "ZERO_UNITS_AT_COST", 'Amount is zero: "0 VTI"'],
    ]);
  });

  it("reports each zero posting of one transaction on its own line", () => {
    expect(
      check(
        [
          txn("two", [
            atCost("0", perUnit("5")),
            atCost("0", perUnit("6")),
            cash("0"),
          ]),
        ],
        '2026-09-01 * "qa" "two"',
        "  Assets:Broker  0 VTI {5 USD}",
        "  Assets:Broker  0 VTI {6 USD}",
        "  Assets:Cash  0 USD",
      ),
    ).toEqual([
      ["main.bean", 5, "ZERO_UNITS_AT_COST", 'Amount is zero: "0 VTI"'],
      ["main.bean", 6, "ZERO_UNITS_AT_COST", 'Amount is zero: "0 VTI"'],
    ]);
  });

  it("reads past strings, an empty cost, a flag, a label and an expression", () => {
    expect(
      check(
        [
          txn("multi\nline", [
            atCost("0", {}),
            atCost("0", perUnit("6")),
            cash("0"),
          ]),
          txn("flagged", [
            atCost("0", { ...perUnit("5"), label: "a}b" }),
            atCost("0", perUnit("7")),
            cash("0"),
          ]),
        ],
        '2026/09/01 * "qa" "multi',
        'line"',
        '  note: "a',
        "  Assets:Broker  0 VTI {5 USD}",
        '  b"',
        "  Assets:Broker  0 VTI {}",
        "  Assets:Broker  0 VTI {6 USD}",
        "  Assets:Cash  0 USD",
        '2026-09-01 * "qa" "flagged"',
        '  ! Assets:Broker  0 VTI {5 USD, "a}b"}  ; comment',
        "  Assets:Broker  (1-1) VTI {7 USD}",
        "  Assets:Cash  0 USD",
      ),
    ).toEqual([
      ["main.bean", 10, "ZERO_UNITS_AT_COST", 'Amount is zero: "0 VTI"'],
      ["main.bean", 13, "ZERO_UNITS_AT_COST", 'Amount is zero: "0 VTI"'],
      ["main.bean", 14, "ZERO_UNITS_AT_COST", 'Amount is zero: "0 VTI"'],
    ]);
  });

  it("finds a posting in an included file", () => {
    const errors = zeroUnitsAtCostErrors(
      [txn("zero", [atCost("0", perUnit("5")), cash("0")])],
      {
        "main.bean": 'include "trades.bean"\n',
        "trades.bean":
          '2026-09-01 * "qa" "zero"\n  Assets:Broker  0 VTI {5 USD}\n  Assets:Cash  0 USD\n',
      },
      "main.bean",
    );
    expect(errors.map((e) => [e.file, e.line, e.column])).toEqual([
      ["trades.bean", 2, 1],
    ]);
  });

  it("has no place for a posting whose transaction is not in the source", () => {
    const errors = zeroUnitsAtCostErrors(
      [txn("generated", [atCost("0", perUnit("5")), cash("0")])],
      { "main.bean": HEADER.join("\n") },
      "main.bean",
    );
    expect(errors.map((e) => [e.file, e.line, e.message])).toEqual([
      [null, null, 'Amount is zero: "0 VTI"'],
    ]);
  });
});
