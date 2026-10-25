import { BadUserInputError } from "@/shared/errors";
import { DirectiveType } from "@/foundation/fava";
import type { JournalTransactionPublic } from "@/foundation/fava";
import { composeGains, resolveGainsBounds } from "../gains";

const ROOTS = ["Assets", "Liabilities", "Equity", "Income", "Expenses"];

const txn = (
  date: string,
  postings: {
    account: string;
    number: string;
    cost?: { number: string; currency: string; date: string } | null;
    price?: { number: string; currency: string } | null;
  }[],
): JournalTransactionPublic => ({
  date,
  entry_hash: `h-${date}`,
  directive_type: DirectiveType.Transaction,
  flag: "*",
  postings: postings.map((posting) => ({
    account: posting.account,
    units: { number: posting.number, currency: "HOOL" },
    cost: posting.cost === undefined ? null : posting.cost,
    price: posting.price === undefined ? null : posting.price,
  })),
});

const base = {
  account: undefined,
  roots: ROOTS,
  start: null as string | null,
  end: null as string | null,
};

describe("resolveGainsBounds", () => {
  it("passes open bounds through", () => {
    expect(resolveGainsBounds(undefined, undefined)).toEqual({
      start: null,
      end: null,
    });
    expect(resolveGainsBounds("2024-01-01", "2024-12-31")).toEqual({
      start: "2024-01-01",
      end: "2024-12-31",
    });
  });

  it.each([["2024-13-01"], ["2024-02-30"], ["2024-1-1"], ["yesterday"]])(
    "refuses a malformed bound %p",
    (value) => {
      expect(() => resolveGainsBounds(value, undefined)).toThrow(
        BadUserInputError,
      );
      expect(() => resolveGainsBounds(undefined, value)).toThrow(
        `Invalid to-date '${value}'. Use YYYY-MM-DD.`,
      );
    },
  );

  it("refuses a from-date after the to-date", () => {
    expect(() => resolveGainsBounds("2024-06-01", "2024-01-01")).toThrow(
      "from-date '2024-06-01' is after to-date '2024-01-01'.",
    );
  });
});

describe("composeGains", () => {
  const cost = { number: "100.00", currency: "USD", date: "2023-01-10" };
  const price = { number: "150.00", currency: "USD" };
  const sale = txn("2024-03-15", [
    { account: "Assets:Broker", number: "-10", cost, price },
    { account: "Assets:Checking", number: "1500.00" },
  ]);

  it("closes one lot per reducing posting with cost and price", () => {
    const result = composeGains({ ...base, transactions: [sale] });
    expect(result.rows).toEqual([
      {
        account: "Assets:Broker",
        commodity: "HOOL",
        acquired: "2023-01-10",
        sold: "2024-03-15",
        held_days: 430,
        long_held: true,
        quantity: { number: "10", currency: "HOOL" },
        proceeds: { number: "1500", currency: "USD" },
        basis: { number: "1000", currency: "USD" },
        gain: { number: "500", currency: "USD" },
      },
    ]);
    expect(result.totals).toEqual({
      one_year_or_less: {},
      more_than_one_year: { USD: "500" },
      holding_unknown: {},
    });
  });

  it("skips buys, costless lots, and priceless movements", () => {
    const buy = txn("2024-01-01", [
      {
        account: "Assets:Broker",
        number: "10",
        cost: { number: "100.00", currency: "USD", date: "2024-01-01" },
        price: { number: "100.00", currency: "USD" },
      },
    ]);
    const transfer = txn("2024-02-01", [
      {
        account: "Assets:Broker",
        number: "-5",
        cost: { number: "100.00", currency: "USD", date: "2024-01-01" },
      },
      { account: "Assets:IRA", number: "5" },
    ]);
    const cash = txn("2024-03-01", [
      { account: "Assets:Checking", number: "-50.00" },
    ]);
    const result = composeGains({
      ...base,
      transactions: [cash, transfer, buy],
    });
    expect(result.rows).toEqual([]);
    expect(result.totals).toEqual({
      one_year_or_less: {},
      more_than_one_year: {},
      holding_unknown: {},
    });
  });

  it("bounds sales inclusively and filters the posting account", () => {
    const early = txn("2024-01-31", [
      { account: "Assets:Broker", number: "-1", cost, price },
    ]);
    const late = txn("2024-02-01", [
      { account: "Assets:Broker", number: "-1", cost, price },
    ]);
    const bounded = composeGains({
      ...base,
      transactions: [late, early],
      start: "2024-02-01",
      end: "2024-02-01",
    });
    expect(bounded.rows.map((row) => row.sold)).toEqual(["2024-02-01"]);

    const filtered = composeGains({
      ...base,
      transactions: [sale],
      account: "Assets:IRA",
    });
    expect(filtered.rows).toEqual([]);
  });

  it("buckets short, long, and unknown holdings without crossing currencies", () => {
    const short = txn("2024-06-01", [
      {
        account: "Assets:Broker",
        number: "-1",
        cost: { number: "100.00", currency: "USD", date: "2024-01-01" },
        price: { number: "90.00", currency: "USD" },
      },
    ]);
    const unknown = txn("2024-07-01", [
      {
        account: "Assets:Broker",
        number: "-2",
        cost: { number: "50.00", currency: "EUR", date: "" },
        price: { number: "60.00", currency: "EUR" },
      },
    ]);
    const result = composeGains({ ...base, transactions: [unknown, short] });
    expect(result.rows[0]!.long_held).toBe(false);
    expect(result.rows[1]).toMatchObject({ held_days: null, long_held: null });
    expect(result.totals).toEqual({
      one_year_or_less: { USD: "-10" },
      more_than_one_year: {},
      holding_unknown: { EUR: "20" },
    });
  });

  it("orders oldest sale first", () => {
    const first = txn("2024-01-01", [
      { account: "Assets:Broker", number: "-1", cost, price },
    ]);
    const second = txn("2024-02-01", [
      { account: "Assets:Broker", number: "-1", cost, price },
    ]);
    const result = composeGains({ ...base, transactions: [second, first] });
    expect(result.rows.map((row) => row.sold)).toEqual([
      "2024-01-01",
      "2024-02-01",
    ]);
  });
});
