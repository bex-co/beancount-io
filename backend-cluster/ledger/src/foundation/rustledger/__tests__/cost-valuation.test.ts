import type { DirectiveJson } from "@rustledger/wasm";
import { BadUserInputError } from "@/shared/errors";
import { collectLedgerCommodities, resolveConversion } from "../cost-valuation";

/** A transaction: buy 5 RGAGX @ 88.07 USD (held at cost), plus a cash leg. */
const BUY: DirectiveJson = {
  type: "transaction",
  date: "2015-01-05",
  flag: "*",
  narration: "buy",
  tags: [],
  links: [],
  postings: [
    {
      account: "Assets:US:Vanguard:RGAGX",
      units: { number: "5", currency: "RGAGX" },
      cost: {
        number: { kind: "per_unit", value: "88.07" },
        currency: "USD",
        date: "2015-01-05",
      },
    },
    {
      account: "Assets:US:Cash",
      units: { number: "-440.35", currency: "USD" },
    },
  ],
} as DirectiveJson;

describe("resolveConversion", () => {
  const known = collectLedgerCommodities([BUY]);

  it("maps each conversion keyword to a target, passing directives through unchanged", () => {
    // at_cost / at_value are now reserved keyword targets handled by the
    // lot-aware reducer (no directive rewrite); the stream is identity.
    const atCost = resolveConversion("at_cost", [BUY], "USD", known);
    expect(atCost.target).toBe("at_cost");
    expect(atCost.directives[0]).toBe(BUY);

    const atValue = resolveConversion("at_value", [BUY], "USD", known);
    expect(atValue.target).toBe("at_value");
    expect(atValue.directives[0]).toBe(BUY);
  });

  it("defaults (undefined / empty) to the operating currency", () => {
    for (const conv of [undefined, ""]) {
      const r = resolveConversion(conv, [BUY], "USD", known);
      expect(r.target).toBe("USD");
      expect(r.directives[0]).toBe(BUY);
    }
  });

  it("passes `units` and a known currency through as the target", () => {
    expect(resolveConversion("units", [BUY], "USD", known).target).toBe("units");
    expect(resolveConversion("RGAGX", [BUY], "USD", known).target).toBe("RGAGX");
    expect(resolveConversion("RGAGX", [BUY], "USD", known).directives[0]).toBe(BUY);
  });

  it("passes the operating currency even when the ledger never names it", () => {
    // The explicit spelling must agree with the default, which cannot refuse.
    expect(resolveConversion("USD", [], "USD", new Set()).target).toBe("USD");
  });

  // w23/156: unknown codes used to degrade to units figures downstream.
  it.each(["BOGUS", "EUR", "usd", "USD "])(
    "refuses an unknown conversion %p",
    (conversion) => {
      expect(() => resolveConversion(conversion, [BUY], "USD", known)).toThrow(
        BadUserInputError,
      );
      expect(() => resolveConversion(conversion, [BUY], "USD", known)).toThrow(
        `Unsupported conversion "${conversion}"`,
      );
    },
  );

  it("names the ledger's currencies in the refusal", () => {
    expect(() => resolveConversion("BOGUS", [BUY], "USD", known)).toThrow(
      'or a currency in this ledger (RGAGX, USD).',
    );
  });
});

describe("collectLedgerCommodities", () => {
  it("collects units, cost, and price-annotation currencies", () => {
    expect(collectLedgerCommodities([BUY])).toEqual(new Set(["RGAGX", "USD"]));
  });

  it("collects balance, open, commodity, price, and custom mentions", () => {
    const directives = [
      {
        type: "balance",
        date: "2024-01-01",
        account: "Assets:Cash",
        amount: { number: "1", currency: "EUR" },
      },
      {
        type: "open",
        date: "2024-01-01",
        account: "Assets:Cash",
        currencies: ["USD", "EUR"],
      },
      { type: "commodity", date: "2024-01-01", currency: "HOOL" },
      {
        type: "price",
        date: "2024-01-01",
        currency: "HOOL",
        amount: { number: "1", currency: "USD" },
      },
      {
        type: "custom",
        date: "2024-01-01",
        custom_type: "x",
        values: [
          { type: "currency", value: "JPY" },
          { type: "amount", value: { number: "1", currency: "CHF" } },
          { type: "string", value: "BOGUS" },
        ],
      },
    ] as DirectiveJson[];
    expect(collectLedgerCommodities(directives)).toEqual(
      new Set(["EUR", "USD", "HOOL", "JPY", "CHF"]),
    );
  });
});
