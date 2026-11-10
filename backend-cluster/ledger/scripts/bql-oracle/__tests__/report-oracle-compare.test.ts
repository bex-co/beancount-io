import {
  compare,
  flatten,
  stockAmounts,
  type Node,
} from "../report-oracle-compare";

const node = (
  account: string,
  balance: Record<string, string>,
  children: Node[] = [],
): Node => ({ account, balance, children });

describe("stockAmounts", () => {
  it("reads what stock prints as exact decimals, in currency order", () => {
    expect(stockAmounts(["96.00 USD", "3 EUR"])).toBe("3 EUR, 96 USD");
    expect(stockAmounts("-0.50 USD")).toBe("-0.5 USD");
  });
});

describe("flatten", () => {
  const assets = node("Assets", {}, [
    node("Assets:Bank", { USD: "7849.40", EUR: "0.0" }),
    node("Assets:Empty", {}),
  ]);

  it("keeps the accounts that hold a balance of their own, as exact decimals", () => {
    expect(flatten([assets], "trial-balance")).toEqual(
      new Map([["Assets:Bank", "0 EUR, 7849.4 USD"]]),
    );
  });

  // Fava closes earnings and conversions into equity on the balance sheet.
  it("ignores the equity accounts only the balance sheet adds", () => {
    const equity = node("Equity", {}, [
      node("Equity:Opening", { USD: "-1" }),
      node("Equity:Earnings:Current", { USD: "-2" }),
    ]);
    expect([...flatten([equity], "balance-sheet").keys()]).toEqual([
      "Equity:Opening",
    ]);
    expect([...flatten([equity], "trial-balance").keys()]).toEqual([
      "Equity:Opening",
      "Equity:Earnings:Current",
    ]);
  });
});

describe("compare", () => {
  const stock = new Map([
    ["Assets:Bank", "100 USD"],
    ["Assets:Broker", "6 QAX"],
  ]);

  it("finds no difference between equal figures", () => {
    expect(compare(stock, new Map(stock))).toEqual([]);
  });

  it("names an account the report lacks and one it adds", () => {
    const [difference] = compare(
      stock,
      new Map([
        ["Assets:Bank", "100 USD"],
        ["Assets:Other", "1 USD"],
      ]),
    );
    expect(difference).toEqual({
      kind: "row-count",
      detail: "report lacks [Assets:Broker], adds [Assets:Other]",
    });
  });

  it("names the account whose amount differs", () => {
    expect(
      compare(
        stock,
        new Map([
          ["Assets:Bank", "100 USD"],
          ["Assets:Broker", "74.04 USD"],
        ]),
      ),
    ).toEqual([
      {
        kind: "cells",
        detail: "Assets:Broker: stock 6 QAX, report 74.04 USD",
      },
    ]);
  });
});
