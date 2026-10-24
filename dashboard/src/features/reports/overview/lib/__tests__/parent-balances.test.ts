import { describe, expect, it } from "vitest";
import {
  buildAccountBalanceRows,
  buildDistributionData,
  type HierarchyNode,
} from "../overview-utils";

/**
 * A parent account's own postings are real holdings (w4/1030). The producer
 * keeps them on the node's `balance` and rolls the subtree into
 * `balanceChildren`, so Accounts and the distributions read each node's own
 * balance once — keeping only leaves made May's Wallet and Card vanish.
 */
const tree = (
  account: string,
  balance: Record<string, string>,
  balanceChildren: Record<string, string>,
  children: HierarchyNode[] = [],
) => ({ account, balance, balanceChildren, children }) as HierarchyNode;

/** The reproduced ledger: parents with postings, children empty in May. */
function month(savings: string | null, fees: string | null) {
  const assets = tree("Assets", {}, { USD: savings ? "125" : "100" }, [
    tree("Assets:Wallet", { USD: "100" }, { USD: savings ? "125" : "100" }, [
      tree("Assets:Wallet:Savings", savings ? { USD: savings } : {}, {}),
    ]),
  ]);
  const liabilities = tree("Liabilities", {}, { USD: fees ? "-85" : "-80" }, [
    tree("Liabilities:Card", { USD: "-80" }, { USD: fees ? "-85" : "-80" }, [
      tree("Liabilities:Card:Fees", fees ? { USD: fees } : {}, {}),
    ]),
  ]);
  return { assets, liabilities };
}

const rows = (data: ReturnType<typeof month>) =>
  buildAccountBalanceRows({
    ...data,
    preferredCurrency: "USD",
    invertLiabilities: false,
  }).map((row) => [row.account, row.amounts[0]!.exact]);

const slices = (input: HierarchyNode, inverse = false) =>
  buildDistributionData(input, inverse, "USD").items.map((item) => [
    item.name,
    item.exact,
  ]);

describe("parent accounts' own balances", () => {
  it("keeps parents whose children are all zero", () => {
    const may = month(null, null);
    expect(rows(may)).toEqual([
      ["Assets:Wallet", "100"],
      ["Liabilities:Card", "-80"],
    ]);
    expect(slices(may.assets)).toEqual([["Assets:Wallet", "100"]]);
    expect(slices(may.liabilities, true)).toEqual([["Liabilities:Card", "80"]]);
  });

  it("counts a parent and its populated children once each", () => {
    const june = month("25", "-5");
    expect(rows(june)).toEqual([
      ["Assets:Wallet", "100"],
      ["Liabilities:Card", "-80"],
      ["Assets:Wallet:Savings", "25"],
      ["Liabilities:Card:Fees", "-5"],
    ]);
    // 125 and 85 in all, not the subtree rolled in a second time.
    expect(slices(june.assets)).toEqual(
      expect.arrayContaining([
        ["Assets:Wallet", "100"],
        ["Assets:Wallet:Savings", "25"],
      ]),
    );
    expect(slices(june.assets)).toHaveLength(2);
    expect(
      buildDistributionData(june.liabilities, true, "USD").items.reduce(
        (sum, item) => sum + item.value,
        0,
      ),
    ).toBe(85);
  });

  it("keeps a root's own postings and still drops genuine zeros", () => {
    const assets = tree("Assets", { USD: "7" }, { USD: "12" }, [
      tree("Assets:Cash", { USD: "5" }, { USD: "5" }),
      tree("Assets:Empty", {}, {}),
      tree("Assets:Zero", { USD: "0" }, { USD: "0" }),
    ]);
    expect(slices(assets)).toEqual(
      expect.arrayContaining([
        ["Assets", "7"],
        ["Assets:Cash", "5"],
      ]),
    );
    expect(slices(assets)).toHaveLength(2);
  });
});
