import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountBalancesCard } from "../account-balances-card";

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedgerNavigateToAccount: () => vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: unknown }) => <a>{children as never}</a>,
}));

const assets = {
  account: "Assets",
  children: [
    {
      account: "Assets:Brokerage",
      balance: { USD: "200", TRX: "19.953" },
      children: [],
    },
  ],
};

describe("AccountBalancesCard", () => {
  it("shows one headline and a muted residual note per row under a currency conversion", () => {
    render(
      <AccountBalancesCard
        assets={assets}
        primaryCurrency="USD"
        conversion="USD"
        invertLiabilities
        ledgerOwner="demo"
        ledgerName="ledger"
      />,
    );

    expect(screen.getByText("200 USD")).toBeInTheDocument();
    expect(
      screen.getByText("page.overview.notConvertedUnits", { exact: false }),
    ).toHaveTextContent("19.953 TRX");
  });

  it("keeps the multi-line list when not converting to a single currency", () => {
    render(
      <AccountBalancesCard
        assets={assets}
        primaryCurrency="USD"
        conversion="at_cost"
        invertLiabilities
        ledgerOwner="demo"
        ledgerName="ledger"
      />,
    );

    expect(screen.getByText("200 USD")).toBeInTheDocument();
    expect(screen.getByText("19.953 TRX")).toBeInTheDocument();
    expect(
      screen.queryByText("page.overview.notConvertedUnits", { exact: false }),
    ).not.toBeInTheDocument();
  });
});
