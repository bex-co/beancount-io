import type { DirectiveJson } from "@rustledger/wasm";
import { averageBookingErrors } from "../average-booking";

/**
 * w21/708: Beancount 3.2 refuses a sale from an AVERAGE position ("AVERAGE
 * method is not supported") and does not book it; rustledger booked it at the
 * average cost, and the ledger read as clean. The booked stream is scripted
 * here (WASM-free), as rustledger returns it.
 */
const open = (account: string, booking?: string): DirectiveJson => ({
  type: "open",
  date: "2024-01-01",
  account,
  currencies: [],
  ...(booking ? { booking } : {}),
});
const trade = (
  date: string,
  narration: string,
  units: string,
  perUnit: string,
  account = "Assets:Broker",
): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  narration,
  tags: [],
  links: [],
  postings: [
    {
      account,
      units: { number: units, currency: "VTI" },
      cost: { number: { kind: "per_unit", value: perUnit }, currency: "USD" },
    },
    { account: "Assets:Cash" },
  ],
});
const buys = [
  trade("2024-01-02", "Buy", "10", "100"),
  trade("2024-02-02", "Buy", "10", "200"),
];
const sell = trade("2024-06-01", "Sell", "-10", "150");
/** The check over `source` as the ledger's one file. */
const check = (directives: DirectiveJson[], source = "") =>
  averageBookingErrors(directives, { "main.bean": source }, "main.bean");

describe("averageBookingErrors", () => {
  it("refuses a sale from an account opened AVERAGE, as Beancount does", () => {
    const errors = check([open("Assets:Broker", "AVERAGE"), ...buys, sell], "");
    expect(errors.map((e) => [e.code, e.message])).toEqual([
      ["BOOK", 'AVERAGE method is not supported (2024-06-01, "Sell")'],
    ]);
  });

  it("is placed on the sale's line, where bean-check reports it", () => {
    const source = [
      '2024-01-01 open Assets:Broker VTI "AVERAGE"',
      '2024-06-01 * "Sell"',
      "  Assets:Broker  -10 VTI {} @ 300 USD",
      "  Assets:Cash",
    ].join("\n");
    const [error] = check(
      [open("Assets:Broker", "AVERAGE"), ...buys, sell],
      source,
    );
    expect([error.file, error.line, error.message]).toEqual([
      "main.bean",
      2,
      "AVERAGE method is not supported",
    ]);
  });

  // w21/721: located by date and narration, the error had no file or line
  // when another entry that day shared the narration, or the sale had none.
  it("finds the sale by its posting, not its narration", () => {
    const shared = [
      '2024-01-01 open Assets:Broker VTI "AVERAGE"',
      '2024-06-01 * "Vanguard" "Rebalance"',
      "  Assets:Other  5 BND {80 USD}",
      "  Assets:Cash",
      "",
      '2024-06-01 * "Vanguard" "Rebalance"',
      "  Assets:Broker  -10 VTI {} @ 120 USD",
      "  Assets:Cash",
    ].join("\n");
    expect(
      check([open("Assets:Broker", "AVERAGE"), ...buys, sell], shared).map(
        (e) => [e.file, e.line],
      ),
    ).toEqual([["main.bean", 6]]);
    const bare = [
      '2024-01-01 open Assets:Broker VTI "AVERAGE"',
      "2024-06-01 *",
      "  Assets:Broker  -10.00 VTI {} @ 120 USD",
      "  Assets:Cash",
    ].join("\n");
    expect(
      check([open("Assets:Broker", "AVERAGE"), ...buys, sell], bare).map(
        (e) => [e.file, e.line],
      ),
    ).toEqual([["main.bean", 2]]);
  });

  it("tells two like sales on one day apart by order", () => {
    const twice = [
      '2024-06-01 * "Sell"',
      "  Assets:Broker  -5 VTI {}",
      "  Assets:Cash",
      "",
      '2024-06-01 * "Sell"',
      "  Assets:Broker  -5 VTI {}",
      "  Assets:Cash",
    ].join("\n");
    const half = trade("2024-06-01", "Sell", "-5", "150");
    expect(
      check(
        [open("Assets:Broker", "AVERAGE"), ...buys, half, { ...half }],
        twice,
      ).map((e) => e.line),
    ).toEqual([1, 5]);
  });

  it("follows option booking_method, unless the account names its own", () => {
    const option = 'option "booking_method" "AVERAGE"\n';
    expect(check([open("Assets:Broker"), ...buys, sell], option)).toHaveLength(
      1,
    );
    expect(
      check([open("Assets:Broker", "FIFO"), ...buys, sell], option),
    ).toEqual([]);
  });

  it("leaves purchases, other methods and other accounts alone", () => {
    expect(check([open("Assets:Broker", "AVERAGE"), ...buys], "")).toEqual([]);
    expect(check([open("Assets:Broker", "FIFO"), ...buys, sell], "")).toEqual(
      [],
    );
    expect(
      check(
        [
          open("Assets:Broker", "AVERAGE"),
          open("Assets:Other"),
          trade("2024-01-02", "Buy", "10", "100", "Assets:Other"),
          trade("2024-06-01", "Sell", "-10", "100", "Assets:Other"),
        ],
        "",
      ),
    ).toEqual([]);
  });

  it("counts a short position: opening it is fine, covering it is a sale", () => {
    const errors = check(
      [
        open("Assets:Broker", "AVERAGE"),
        trade("2024-01-02", "Short", "-10", "100"),
        trade("2024-03-02", "Cover", "10", "90"),
      ],
      "",
    );
    expect(errors.map((e) => e.message)).toEqual([
      'AVERAGE method is not supported (2024-03-02, "Cover")',
    ]);
  });
});
