import type { DirectiveJson } from "@rustledger/wasm";
import { resolveConversion } from "../cost-valuation";

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
  it("maps each conversion keyword to a target, passing directives through unchanged", () => {
    // at_cost / at_value are now reserved keyword targets handled by the
    // lot-aware reducer (no directive rewrite); the stream is identity.
    const atCost = resolveConversion("at_cost", [BUY], "USD");
    expect(atCost.target).toBe("at_cost");
    expect(atCost.directives[0]).toBe(BUY);

    const atValue = resolveConversion("at_value", [BUY], "USD");
    expect(atValue.target).toBe("at_value");
    expect(atValue.directives[0]).toBe(BUY);
  });

  it("defaults (undefined / empty) to the operating currency", () => {
    for (const conv of [undefined, ""]) {
      const r = resolveConversion(conv, [BUY], "USD");
      expect(r.target).toBe("USD");
      expect(r.directives[0]).toBe(BUY);
    }
  });

  it("passes `units` and an explicit currency through as the target", () => {
    expect(resolveConversion("units", [BUY], "USD").target).toBe("units");
    expect(resolveConversion("EUR", [BUY], "USD").target).toBe("EUR");
    expect(resolveConversion("EUR", [BUY], "USD").directives[0]).toBe(BUY);
  });
});
