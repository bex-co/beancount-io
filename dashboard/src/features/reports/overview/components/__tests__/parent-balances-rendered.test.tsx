import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { AccountBalancesCard } from "../account-balances-card";
import { renderInLedger } from "./overview-chart-test-utils";

/**
 * Accounts and their shares show a parent account's own holdings
 * (w4/1030). With only leaves read, May said "No accounts found" and "No Data
 * Available" beside a correct Net Worth, and June gave a child 100% of a
 * distribution that left out its parent. Real cards, formatter and
 * translations; only the canvas is replaced.
 */
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => <div data-testid="chart" />,
}));
vi.mock("@/common/hooks/use-ledger", async (original) => ({
  ...(await original<typeof import("@/common/hooks/use-ledger")>()),
  useLedgerNavigateToAccount: () => vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
afterEach(cleanup);

function node(
  account: string,
  balance: Record<string, string>,
  balanceChildren: Record<string, string>,
  children: SerializableTreeNode[] = [],
): SerializableTreeNode {
  return {
    __typename: "SerializableTreeNode",
    account,
    balance,
    balanceChildren,
    cost: null,
    costChildren: null,
    hasTxns: true,
    children,
  };
}

/** June of the reproduced ledger: parents with postings and one child each. */
const assets = node("Assets", {}, { USD: "125" }, [
  node("Assets:Wallet", { USD: "100" }, { USD: "125" }, [
    node("Assets:Wallet:Savings", { USD: "25" }, { USD: "25" }),
  ]),
]);
const liabilities = node("Liabilities", {}, { USD: "-85" }, [
  node("Liabilities:Card", { USD: "-80" }, { USD: "-85" }, [
    node("Liabilities:Card:Fees", { USD: "-5" }, { USD: "-5" }),
  ]),
]);
/** May: the same parents, children still empty. */
const may = {
  assets: node("Assets", {}, { USD: "100" }, [
    node("Assets:Wallet", { USD: "100" }, { USD: "100" }, [
      node("Assets:Wallet:Savings", {}, {}),
    ]),
  ]),
  liabilities: node("Liabilities", {}, { USD: "-80" }, [
    node("Liabilities:Card", { USD: "-80" }, { USD: "-80" }, [
      node("Liabilities:Card:Fees", {}, {}),
    ]),
  ]),
};

const accountsCard = (data: { assets: unknown; liabilities: unknown }) => (
  <AccountBalancesCard
    {...data}
    primaryCurrency="USD"
    invertLiabilities={false}
    ledgerOwner="owner"
    ledgerName="book"
  />
);

describe("parent balances on Overview", () => {
  it("lists May's parent accounts instead of saying none exist", async () => {
    await renderInLedger(accountsCard(may));
    expect(screen.queryByText("No accounts found")).toBeNull();
    expect(screen.getByTitle("Assets:Wallet")).toBeInTheDocument();
    expect(screen.getByTitle("Liabilities:Card")).toBeInTheDocument();
  });

  it("lists June's parents beside their children", async () => {
    await renderInLedger(accountsCard({ assets, liabilities }));
    for (const account of [
      "Assets:Wallet",
      "Assets:Wallet:Savings",
      "Liabilities:Card",
      "Liabilities:Card:Fees",
    ]) {
      expect(screen.getByTitle(account)).toBeInTheDocument();
    }
  });

  it("gives June's parents their own share of each side, counted once", async () => {
    await renderInLedger(accountsCard({ assets, liabilities }));
    // The holdings list shows each account's share of its side: a parent's
    // own 100 USD beside its child's 25, not the child alone at 100%.
    const shareOf = (account: string) =>
      screen.getByTitle(account).textContent ?? "";
    expect(shareOf("Assets:Wallet")).toContain("80%");
    expect(shareOf("Assets:Wallet:Savings")).toContain("20%");
    expect(shareOf("Liabilities:Card")).toContain("94.1%");
    expect(shareOf("Liabilities:Card:Fees")).toContain("5.9%");
  });
});
