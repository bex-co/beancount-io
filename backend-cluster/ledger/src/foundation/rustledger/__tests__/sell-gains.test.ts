import type { DirectiveJson } from "@rustledger/wasm";
import { sellGainsErrors } from "../sell-gains";

// w21/846: the engine does not run sellgains, so a sale whose price disagreed
// with its proceeds read as healthy where bean-check refuses it. Messages and
// lines are bean-check 3.2's for the same file.
const SOURCE = `plugin "beancount.plugins.sellgains"
2024-01-01 open Assets:Cash
2024-02-01 * "sell"
  Assets:Stock  -1 HOOL {10.00 USD} @ 50.00 USD
  Assets:Cash  12.00 USD
  Income:Gains  -2.00 USD
`;
const sale = (
  price: string,
  cash: string,
  extra: unknown[] = [],
): DirectiveJson =>
  ({
    type: "transaction",
    date: "2024-02-01",
    flag: "*",
    narration: "sell",
    tags: [],
    links: [],
    postings: [
      {
        account: "Assets:Stock",
        units: { number: "-1", currency: "HOOL" },
        cost: { number_per: "10.00", currency: "USD" },
        price: { number: price, currency: "USD" },
      },
      { account: "Assets:Cash", units: { number: cash, currency: "USD" } },
      ...extra,
      { account: "Income:Gains", units: { number: "-2.00", currency: "USD" } },
    ],
  }) as unknown as DirectiveJson;

describe("sellGainsErrors", () => {
  const files = { "main.bean": SOURCE };

  it("flags a price that disagrees with the proceeds, as bean-check does", () => {
    const errors = sellGainsErrors(
      [sale("50.00", "12.00")],
      files,
      "main.bean",
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      message:
        "Invalid price vs. proceeds/gains: (50.00 USD) vs. (12.00 USD); difference: (38.00 USD)",
      line: 3,
      file: "main.bean",
    });
  });

  it("leaves a consistent sale clean, and one within twice the tolerance", () => {
    expect(
      sellGainsErrors([sale("12.00", "12.00")], files, "main.bean"),
    ).toEqual([]);
    expect(
      sellGainsErrors([sale("12.00", "12.01")], files, "main.bean"),
    ).toEqual([]);
    expect(
      sellGainsErrors([sale("12.00", "12.02")], files, "main.bean"),
    ).toHaveLength(1);
  });

  it("counts fees among the proceeds", () => {
    const fees = [
      { account: "Expenses:Fees", units: { number: "0.10", currency: "USD" } },
    ];
    expect(
      sellGainsErrors([sale("12.00", "11.90", fees)], files, "main.bean"),
    ).toEqual([]);
    expect(
      sellGainsErrors([sale("12.00", "11.00", fees)], files, "main.bean")[0]
        ?.message,
    ).toBe(
      "Invalid price vs. proceeds/gains: (12.00 USD) vs. (11.10 USD); difference: (0.90 USD)",
    );
  });

  it("does nothing unless the plugin is declared, or for a sale without a price", () => {
    expect(
      sellGainsErrors(
        [sale("50.00", "12.00")],
        { "main.bean": "2024-01-01 open A\n" },
        "main.bean",
      ),
    ).toEqual([]);
    const noPrice = sale("50.00", "12.00");
    if (noPrice.type === "transaction") delete noPrice.postings[0]!.price;
    expect(sellGainsErrors([noPrice], files, "main.bean")).toEqual([]);
  });

  it("is left alone for a ledger that renames its account roots", () => {
    expect(
      sellGainsErrors(
        [sale("50.00", "12.00")],
        { "main.bean": `option "name_assets" "Actif"\n${SOURCE}` },
        "main.bean",
      ),
    ).toEqual([]);
  });
});
