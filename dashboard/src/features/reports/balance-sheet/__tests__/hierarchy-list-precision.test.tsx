/**
 * Statement cells through the real formatter: a commodity keeps the digits
 * its source decimal carried, so the Trial Balance and Balance Sheet row for
 * 4.00995 ETH matches its account journal instead of reading 4.01 (w4/m45).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HierarchyList, type HierarchyListNode } from "../hierarchy-list";

const ledger = vi.hoisted(() => ({ renderCommas: true }));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({ data: { getLedgerAccounts: [] } }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerOwner: "qa",
    ledgerName: "crypto",
    ledgerData: { options: { renderCommas: ledger.renderCommas } },
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params: _params,
    ...props
  }: React.ComponentProps<"a"> & { to: string; params?: unknown }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const node = (
  account: string,
  balanceChildren: Record<string, unknown>,
  inverted?: boolean,
): HierarchyListNode => ({
  __typename: "SerializableTreeNode",
  account,
  balance: balanceChildren,
  balanceChildren,
  cost: null,
  costChildren: null,
  children: [],
  hasTxns: true,
  inverted,
});

/** [primary, other] cell text of the root row for `account` (a row header). */
function amounts(account: string) {
  const row = screen.getByRole("rowheader", { name: account }).closest("tr")!;
  return within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent?.replace(/\s+/g, " ").trim());
}

afterEach(() => {
  ledger.renderCommas = true;
  cleanup();
});

describe("HierarchyList quantity precision", () => {
  const crypto = [
    node("Assets:Crypto:Wallet:MetaMask:ETH", { ETH: "4.00995" }),
    node("Assets:Crypto:Whale:ETH", { ETH: "1234.56789" }),
    node("Assets:Crypto:Coinbase:BTC", { BTC: "0.16" }),
    node("Assets:Bank:Checking", { USD: "68033" }),
    node("Assets:Crypto:Dust", { ETH: "0.00000", USD: "0.00" }),
  ];

  it.each([
    [true, "1,234.56789 ETH", "68,033.00"],
    [false, "1234.56789 ETH", "68033.00"],
  ])(
    "keeps source digits with render_commas %s",
    (renderCommas, whale, checking) => {
      ledger.renderCommas = renderCommas;
      render(<HierarchyList data={crypto} primaryCurrency="USD" />);

      expect(amounts("Assets:Crypto:Wallet:MetaMask:ETH")).toEqual([
        "-",
        "4.00995 ETH",
      ]);
      expect(amounts("Assets:Crypto:Whale:ETH")).toEqual(["-", whale]);
      expect(amounts("Assets:Crypto:Coinbase:BTC")).toEqual(["-", "0.16 BTC"]);
      expect(amounts("Assets:Bank:Checking")).toEqual([checking, "-"]);
      // Exact zeros at any precision still read as dashes.
      expect(amounts("Assets:Crypto:Dust")).toEqual(["-", "-"]);
    },
  );

  it("keeps primary and non-primary precision through inversion", () => {
    render(
      <HierarchyList
        data={[
          node("Assets:Cold:BTC", { BTC: "0.00012345" }),
          node("Equity:Opening:BTC", { BTC: "-0.00012345" }, true),
          node("Liabilities:Loan:ETH", { ETH: "-4.00995" }, true),
        ]}
        primaryCurrency="BTC"
      />,
    );
    expect(amounts("Assets:Cold:BTC")).toEqual(["0.00012345", "-"]);
    // Inverted rows show the presentation sign at the same precision.
    expect(amounts("Equity:Opening:BTC")).toEqual(["0.00012345", "-"]);
    expect(amounts("Liabilities:Loan:ETH")).toEqual(["-", "4.00995 ETH"]);
  });

  it("keeps precision in the revealed extra units and summary rows", async () => {
    const user = userEvent.setup();
    render(
      <HierarchyList
        data={[
          node("Assets:Crypto:Basket", {
            BTC: "0.0004",
            DOT: "1.5",
            ETH: "4.00995",
            SOL: "12.345678",
          }),
        ]}
        primaryCurrency="USD"
        summaryRows={[
          { label: "Total", balance: { ETH: "4.00995", USD: "68033" } },
        ]}
      />,
    );
    const basket = screen
      .getByRole("rowheader", { name: "Assets:Crypto:Basket" })
      .closest("tr")!;
    await user.click(within(basket).getByRole("button", { name: /Basket/ }));
    expect(within(basket).getByText("12.345678")).toBeInTheDocument();
    expect(within(basket).getByText("0.0004")).toBeInTheDocument();

    const total = screen.getByText("Total").closest("tr")!;
    expect(within(total).getByText("68,033.00")).toBeInTheDocument();
    expect(within(total).getByText("4.00995")).toBeInTheDocument();
  });
});
