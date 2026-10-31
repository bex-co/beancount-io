import type { DirectiveJson } from "@rustledger/wasm";
import { markUnbookedDirective } from "../plugins/provenance";
import { serializeDirective } from "../journal-serialize";

// w21/678: a transaction the engine could not book is still listed, and says so.
const sale = (): DirectiveJson => ({
  type: "transaction",
  date: "2026-03-01",
  flag: "*",
  narration: "QA Sell",
  tags: [],
  links: [],
  postings: [
    { account: "Assets:BrCash", units: { number: "600.00", currency: "USD" } },
    { account: "Income:Gains" },
  ],
});

describe("serializeDirective of a transaction that failed booking", () => {
  it("carries not_booked: true", () => {
    const directive = sale();
    markUnbookedDirective(directive);
    expect(serializeDirective(directive)).toMatchObject({
      narration: "QA Sell",
      not_booked: true,
    });
  });

  it("leaves a booked transaction exactly as it was, with no such key", () => {
    expect("not_booked" in serializeDirective(sale())).toBe(false);
  });

  it("never marks a directive that is not a transaction", () => {
    const open: DirectiveJson = {
      type: "open",
      date: "2026-01-01",
      account: "Assets:Cash",
      currencies: [],
    };
    markUnbookedDirective(open);
    expect("not_booked" in serializeDirective(open)).toBe(false);
  });
});
