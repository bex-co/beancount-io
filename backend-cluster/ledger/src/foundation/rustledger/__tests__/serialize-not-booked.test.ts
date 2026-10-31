import type { DirectiveJson } from "@rustledger/wasm";
import { markUnbookedDirective } from "../plugins/provenance";
import { hashEntry } from "../entry-hash";
import { serializeDirective } from "../journal-serialize";
import { entryBalances } from "../source-slice";

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

// w21/678: Entry Context shows the balances an entry is read against; a
// transaction that failed booking moves none of them.
describe("entryBalances around a transaction that failed booking", () => {
  const posting = (account: string, number: string, currency = "USD") => ({
    account,
    units: { number, currency },
  });
  const tx = (date: string, narration: string, postings: object[]) =>
    ({
      type: "transaction",
      date,
      flag: "*",
      narration,
      tags: [],
      links: [],
      postings,
    }) as unknown as DirectiveJson;

  const fund = tx("2026-01-02", "Fund", [
    posting("Assets:BrCash", "5000.00"),
    posting("Equity:Opening", "-5000.00"),
  ]);
  const broken = tx("2026-03-01", "Sell", [posting("Assets:BrCash", "600.00")]);
  const later = tx("2026-04-01", "Rent", [
    posting("Assets:BrCash", "-100.00"),
    posting("Expenses:Rent", "100.00"),
  ]);
  markUnbookedDirective(broken);

  it("does not count it in the balance a later entry starts from", () => {
    const result = entryBalances([fund, broken, later], hashEntry(later));
    expect(result?.before["Assets:BrCash"]).toEqual(["5000.00 USD"]);
    expect(result?.after?.["Assets:BrCash"]).toEqual(["4900.00 USD"]);
  });

  it("shows the entry itself against balances it does not move", () => {
    const result = entryBalances([fund, broken, later], hashEntry(broken));
    expect(result?.before["Assets:BrCash"]).toEqual(["5000.00 USD"]);
    expect(result?.after?.["Assets:BrCash"]).toEqual(["5000.00 USD"]);
  });
});
