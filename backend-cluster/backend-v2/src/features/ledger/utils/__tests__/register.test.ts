import { BadUserInputError } from "@/shared/errors";
import { DirectiveType } from "@/foundation/fava";
import type { AccountJournalEntryPublic } from "@/foundation/fava";
import {
  mapRegisterRows,
  resolveRegisterConversion,
  resolveRegisterRoot,
  selectRegisterRoot,
} from "../register";

const ROOTS = ["Assets", "Liabilities", "Equity", "Income", "Expenses"];

describe("resolveRegisterRoot", () => {
  it("resolves a literal path to its canonical subtree", () => {
    expect(
      resolveRegisterRoot("Assets:Broker", [
        "Assets:Broker:A",
        "Assets:Broker:B",
      ]),
    ).toBe("Assets:Broker");
  });

  it("canonicalizes a lowercase literal", () => {
    expect(resolveRegisterRoot("assets:broker", ["Assets:Broker:A"])).toBe(
      "Assets:Broker",
    );
  });

  it("collapses a regex under the one account containing the rest", () => {
    expect(
      resolveRegisterRoot("broker", ["Assets:Broker", "Assets:Broker:A"]),
    ).toBe("Assets:Broker");
  });

  it("returns null across several trees or no accounts", () => {
    expect(
      resolveRegisterRoot("o", ["Assets:Broker", "Expenses:Food"]),
    ).toBeNull();
    expect(resolveRegisterRoot("Assets:Broker", [])).toBeNull();
  });
});

describe("selectRegisterRoot", () => {
  const postings = ["Assets:Broker:A", "Assets:Broker:B", "Expenses:Food"];

  it("selects the matched subtree", () => {
    expect(selectRegisterRoot("Assets:Broker", postings, [], ROOTS)).toBe(
      "Assets:Broker",
    );
  });

  it("counts balance-only accounts as active", () => {
    expect(
      selectRegisterRoot("Assets:Vault", [], ["Assets:Vault"], ROOTS),
    ).toBe("Assets:Vault");
  });

  it("answers null when nothing matches", () => {
    expect(selectRegisterRoot("Assets:Nope", postings, [], ROOTS)).toBeNull();
  });

  it("resolves a root to its whole subtree", () => {
    expect(selectRegisterRoot("Assets", postings, [], ROOTS)).toBe("Assets");
  });

  it("refuses a pattern spanning several trees, naming them", () => {
    const run = () => selectRegisterRoot("o", postings, [], ROOTS);
    expect(run).toThrow(BadUserInputError);
    expect(run).toThrow(
      "Register needs one account; 'o' matches several: Assets:Broker:A, Assets:Broker:B, Expenses:Food. Name one account to list.",
    );
  });
});

describe("resolveRegisterConversion", () => {
  it("takes currencies, units, and Fava modes", () => {
    expect(resolveRegisterConversion("EUR", ["USD"])).toBe("EUR");
    expect(resolveRegisterConversion("units", ["USD"])).toBeNull();
    expect(resolveRegisterConversion("at_cost", ["USD"])).toBe("at_cost");
    expect(resolveRegisterConversion("AT_VALUE", ["USD"])).toBe("at_value");
  });

  it("defaults to one operating currency, else held currencies", () => {
    expect(resolveRegisterConversion(undefined, ["USD"])).toBe("USD");
    expect(resolveRegisterConversion(undefined, ["USD", "EUR"])).toBeNull();
  });

  it("refuses lists and garbage", () => {
    expect(() => resolveRegisterConversion("USD,EUR", ["USD"])).toThrow(
      BadUserInputError,
    );
    expect(() => resolveRegisterConversion("US D", ["USD"])).toThrow(
      BadUserInputError,
    );
  });
});

describe("mapRegisterRows", () => {
  const txn = (
    date: string,
    postings: { account: string; number: string; cost?: string }[],
  ): AccountJournalEntryPublic => ({
    entry: {
      date,
      entry_hash: "h",
      directive_type: DirectiveType.Transaction,
      flag: "*",
      payee: "Store",
      narration: "Goods",
      postings: postings.map((posting) => ({
        account: posting.account,
        units: { number: posting.number, currency: "USD" },
        cost:
          posting.cost === undefined
            ? null
            : {
                number: posting.cost,
                currency: "USD",
                date: "2021-01-01",
              },
      })),
    },
    change: { USD: "-10.00" },
    balance: { USD: "90.00" },
  });

  const balance = (date: string): AccountJournalEntryPublic => ({
    entry: {
      date,
      entry_hash: "b",
      directive_type: DirectiveType.Balance,
      account: "Assets:Broker:A",
      amount: { number: "90.00", currency: "USD" },
    },
    change: {},
    balance: { USD: "90.00" },
  });

  it("maps entries oldest-first with subtree postings", () => {
    const rows = mapRegisterRows(
      [
        balance("2021-03-01"),
        txn("2021-01-01", [
          { account: "Assets:Broker:A", number: "-10.00" },
          { account: "Expenses:Food", number: "10.00" },
        ]),
      ],
      "Assets:Broker",
    );
    expect(rows.map((row) => [row.date, row.entry])).toEqual([
      ["2021-01-01", "transaction"],
      ["2021-03-01", "balance"],
    ]);
    expect(rows[0]).toMatchObject({
      payee: "Store",
      narration: "Goods",
      postings: [
        {
          account: "Assets:Broker:A",
          amount: { number: "-10.00", currency: "USD" },
          cost: null,
        },
      ],
      change: { USD: "-10.00" },
      balance: { USD: "90.00" },
    });
    expect(rows[1]).toMatchObject({
      entry: "balance",
      payee: null,
      postings: [
        {
          account: "Assets:Broker:A",
          amount: { number: "90.00", currency: "USD" },
          cost: null,
        },
      ],
    });
  });

  it("carries lot costs with their dates", () => {
    const rows = mapRegisterRows(
      [
        txn("2021-01-01", [
          { account: "Assets:Broker:A", number: "10", cost: "150.00" },
        ]) as AccountJournalEntryPublic,
      ],
      "Assets:Broker",
    );
    expect(rows[0]!.postings[0]!.cost).toEqual({
      number: "150.00",
      currency: "USD",
      date: "2021-01-01",
    });
  });
});
