import {
  selectTrialBalanceCategories,
  selectTrialBalanceDisplays,
} from "../select-trial-balance";
import { flattenRows } from "../../account-table/flatten-rows";
import { TrialBalanceQuery } from "@/generated-graphql/graphql";

// w21/450: a parent's own euros or shares had no row, and its own commodity
// read as plain dollars.
type Balance = Record<string, string>;
type Node = {
  account: string;
  balance: Balance;
  balanceChildren: Balance;
  children: Node[];
  hasTxns: boolean;
};
const node = (
  account: string,
  balance: Balance,
  balanceChildren: Balance,
  children: Node[] = [],
): Node => ({ account, balance, balanceChildren, children, hasTxns: true });
const empty = (account: string): Node => node(account, {}, {});
const trial = (assets: Node): TrialBalanceQuery =>
  ({
    getLedgerTrialBalance: {
      assetsHierarchyData: assets,
      liabilitiesHierarchyData: empty("Liabilities"),
      equityHierarchyData: empty("Equity"),
      incomeHierarchyData: empty("Income"),
      expensesHierarchyData: empty("Expenses"),
    },
  }) as unknown as TrialBalanceQuery;

const rowsOf = (data: TrialBalanceQuery) =>
  flattenRows(selectTrialBalanceCategories("USD", data), {
    Assets: true,
    "Assets:Bank": true,
    "Assets:Broker": true,
  });

describe("a parent's own postings in another commodity", () => {
  // Assets:Bank holds 500 EUR of its own above a $100 child.
  const euros = trial(
    node("Assets", {}, { USD: "100", EUR: "500" }, [
      node("Assets:Bank", { EUR: "500" }, { USD: "100", EUR: "500" }, [
        node("Assets:Bank:Checking", { USD: "100" }, { USD: "100" }),
      ]),
    ]),
  );

  it("gets an own row, though its operating-currency value is zero", () => {
    const rows = rowsOf(euros);
    const own = rows.find((row) => row.own);
    expect(own?.account).toBe("Assets:Bank");
    expect(own?.value).toBe(0);
  });

  it("shows the euros on that row, as a leaf would", () => {
    const own = rowsOf(euros).find((row) => row.own)!;
    const display = selectTrialBalanceDisplays(
      "USD",
      euros,
      undefined,
      [],
      "2026-10-22",
    ).get(own.key);
    // Its own euros, read in units as a leaf's would be.
    expect(display?.kind).toBe("units");
    expect(
      display?.kind === "units" && [
        display.units.currency,
        display.units.number,
      ],
    ).toEqual(["EUR", 500]);
  });
});

describe("a parent's own shares", () => {
  // Assets:Broker holds 10 VTI of its own, worth $2,500, above a $100 child.
  const valued = trial(
    node("Assets", {}, { USD: "2600" }, [
      node("Assets:Broker", { USD: "2500" }, { USD: "2600" }, [
        node("Assets:Broker:Cash", { USD: "100" }, { USD: "100" }),
      ]),
    ]),
  );
  const units = trial(
    node("Assets", {}, { USD: "100", VTI: "10" }, [
      node("Assets:Broker", { VTI: "10" }, { USD: "100", VTI: "10" }, [
        node("Assets:Broker:Cash", { USD: "100" }, { USD: "100" }),
      ]),
    ]),
  );

  it("reads in units with its value, not as plain dollars", () => {
    const own = rowsOf(valued).find((row) => row.own)!;
    const display = selectTrialBalanceDisplays(
      "USD",
      valued,
      units,
      [],
      "2026-10-22",
    ).get(own.key);
    expect(display?.kind).toBe("units");
    expect(
      display?.kind === "units" && [
        display.units.currency,
        display.units.number,
        display.value?.amount,
      ],
    ).toEqual(["VTI", 10, 2500]);
  });

  it("does not give a parent with nothing of its own an own row", () => {
    const none = trial(
      node("Assets", {}, { USD: "100" }, [
        node("Assets:Bank", {}, { USD: "100" }, [
          node("Assets:Bank:Checking", { USD: "60" }, { USD: "60" }),
          node("Assets:Bank:Savings", { USD: "40" }, { USD: "40" }),
        ]),
      ]),
    );
    expect(rowsOf(none).some((row) => row.own)).toBe(false);
  });
});

// w21/451: a flat half-cent tolerance folded a BTC wallet's 0.004 into nothing.
describe("a ledger whose operating currency is a fine commodity", () => {
  const btc = trial(
    node("Assets", {}, { BTC: "1.507" }, [
      node("Assets:Wallet", { BTC: "0.004" }, { BTC: "1.004" }, [
        node("Assets:Wallet:Cold", { BTC: "1.000" }, { BTC: "1.000" }),
      ]),
      node("Assets:Exchange", { BTC: "0.500" }, { BTC: "0.500" }),
      node("Assets:Dust", { BTC: "0.003" }, { BTC: "0.003" }),
    ]),
  );
  it("keeps the wallet's own 0.004 and a row for each balance", () => {
    const rows = flattenRows(selectTrialBalanceCategories("BTC", btc), {
      Assets: true,
      "Assets:Wallet": true,
    });
    const own = rows.find((row) => row.own);
    expect(own?.account).toBe("Assets:Wallet");
    expect(own?.value).toBe(0.004);
    const leaves = rows
      .filter((row) => row.depth > 0 && !row.hasChildren)
      .map((row) => row.value)
      .sort();
    expect(leaves).toEqual([0.003, 0.004, 0.5, 1]);
    // The rows add up to the category.
    expect(
      Number(leaves.reduce((sum, value) => sum + value, 0).toFixed(3)),
    ).toBe(1.507);
  });

  it("still folds float residue", () => {
    const residue = trial(
      node("Assets", {}, { BTC: "1.000" }, [
        node(
          "Assets:Wallet",
          { BTC: "1.0000000000000002" },
          { BTC: "1.0000000000000002" },
          [node("Assets:Wallet:Cold", { BTC: "1.000" }, { BTC: "1.000" })],
        ),
      ]),
    );
    const rows = flattenRows(selectTrialBalanceCategories("BTC", residue), {
      Assets: true,
    });
    expect(rows.some((row) => row.own)).toBe(false);
  });

  it("keeps the half-cent rule for a known currency", () => {
    const usd = trial(
      node("Assets", {}, { USD: "100.003" }, [
        node("Assets:Bank", { USD: "0.003" }, { USD: "100.003" }, [
          node("Assets:Bank:Checking", { USD: "100.000" }, { USD: "100.000" }),
        ]),
      ]),
    );
    const rows = flattenRows(selectTrialBalanceCategories("USD", usd), {
      Assets: true,
    });
    expect(rows.some((row) => row.own)).toBe(false);
  });
});

// w21/808: a KWD wallet's own 0.004 was under the flat half-cent tolerance, so
// Wallet folded into its Savings child and the rows read short of 15.004.
describe("a ledger whose operating currency has three decimals", () => {
  const kwd = trial(
    node("Assets", {}, { KWD: "15.004" }, [
      node("Assets:Wallet", { KWD: "0.004" }, { KWD: "10.004" }, [
        node("Assets:Wallet:Savings", { KWD: "10.000" }, { KWD: "10.000" }),
      ]),
      node("Assets:Bank", { KWD: "5.000" }, { KWD: "5.000" }),
    ]),
  );

  it("keeps the wallet as its own row, its 0.004 included", () => {
    const rows = flattenRows(selectTrialBalanceCategories("KWD", kwd), {
      Assets: true,
      "Assets:Wallet": true,
    });
    expect(rows.some((row) => row.account === "Assets:Wallet:Savings")).toBe(
      true,
    );
    const own = rows.find((row) => row.own);
    expect([own?.account, own?.value]).toEqual(["Assets:Wallet", 0.004]);
    const leaves = rows
      .filter((row) => row.depth > 0 && !row.hasChildren)
      .map((row) => row.value);
    expect(
      Number(leaves.reduce((sum, value) => sum + value, 0).toFixed(3)),
    ).toBe(15.004);
  });

  it("still folds a dollar parent's float residue at the half cent", () => {
    const usd = trial(
      node("Assets", {}, { USD: "10.00" }, [
        node("Assets:Wallet", { USD: "0.001" }, { USD: "10.001" }, [
          node("Assets:Wallet:Cash", { USD: "10.00" }, { USD: "10.00" }),
        ]),
      ]),
    );
    const rows = flattenRows(selectTrialBalanceCategories("USD", usd), {
      Assets: true,
    });
    expect(rows.some((row) => row.own)).toBe(false);
  });
});
