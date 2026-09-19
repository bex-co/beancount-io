import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CashAccountStatusPanel } from "../cash-account-status-panel";
import type { CashAccountStatusRow } from "../lib/cash-account-status";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

const rows: CashAccountStatusRow[] = [
  {
    account: "Assets:Bank:Checking",
    openedAt: "2020-01-01",
    closedAt: null,
    balance: { USD: "100.00" },
    entryCount: 10,
  },
  {
    account: "Assets:Bank:OldSavings",
    openedAt: "2018-01-01",
    closedAt: "2022-06-30",
    balance: { USD: "0.00" },
    entryCount: 3,
  },
];

describe("CashAccountStatusPanel", () => {
  it("hides closed zero-balance accounts by default and reveals them on toggle", () => {
    render(
      <CashAccountStatusPanel
        rows={rows}
        primaryCurrency="USD"
        defaultShowClosed={false}
      />,
    );

    expect(screen.getByText("Assets:Bank:Checking")).toBeInTheDocument();
    expect(
      screen.queryByText("Assets:Bank:OldSavings"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("page.cashFlow.showClosedAccounts"));

    expect(screen.getByText("Assets:Bank:OldSavings")).toBeInTheDocument();
    expect(
      screen.getByText("page.cashFlow.hideClosedAccounts"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("page.cashFlow.hideClosedAccounts"));

    expect(
      screen.queryByText("Assets:Bank:OldSavings"),
    ).not.toBeInTheDocument();
  });

  it("honors the fava showClosedAccounts option as the initial state", () => {
    render(
      <CashAccountStatusPanel
        rows={rows}
        primaryCurrency="USD"
        defaultShowClosed={true}
      />,
    );

    expect(screen.getByText("Assets:Bank:OldSavings")).toBeInTheDocument();
  });

  it("renders no toggle when there is nothing to hide", () => {
    render(
      <CashAccountStatusPanel
        rows={[rows[0]]}
        primaryCurrency="USD"
        defaultShowClosed={false}
      />,
    );

    expect(
      screen.queryByText("page.cashFlow.showClosedAccounts"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Assets:Bank:Checking")).toBeInTheDocument();
  });

  it("shows a note for accounts with an invalid cash-flow-role value", () => {
    render(
      <CashAccountStatusPanel
        rows={[{ ...rows[0], invalidRoleValue: "cahs" }]}
        primaryCurrency="USD"
        defaultShowClosed={false}
      />,
    );

    expect(
      screen.getByText("page.cashFlow.unknownCashFlowRole"),
    ).toBeInTheDocument();
  });

  it("keeps a long account name whole while letting it wrap at its segments", () => {
    const account = "Assets:NonCurrent:Restricted:EscrowHoldbackReserve";
    render(
      <CashAccountStatusPanel
        rows={[{ ...rows[0], account }]}
        primaryCurrency="USD"
        defaultShowClosed={false}
      />,
    );

    // Nothing is abbreviated or truncated...
    const name = screen.getByText(account);
    expect(name.textContent).toBe(account);
    // ...and the line breaker is offered every separator, which is what stops
    // a narrow column from wrapping the name one character at a time.
    expect(name.querySelectorAll("wbr")).toHaveLength(
      account.split(":").length - 1,
    );
  });

  it("renders every currency of a multi-commodity balance in full", () => {
    render(
      <CashAccountStatusPanel
        rows={[
          {
            ...rows[0],
            account: "Assets:Bank:Multi",
            balance: {
              USD: "1234567.89",
              EUR: "98765.43",
              JPY: "100000000",
            },
          },
        ]}
        primaryCurrency="USD"
        defaultShowClosed={false}
      />,
    );

    // Primary currency first, each amount on its own line, none abbreviated.
    const lines = screen
      .getByText(/USD$/)
      .parentElement!.textContent!.match(/[\d.,]+ [A-Z]{3}/g);
    expect(lines).toEqual([
      "1,234,567.89 USD",
      "98,765.43 EUR",
      "100,000,000.00 JPY",
    ]);
  });

  it("shows the closed status for a revealed closed account", () => {
    render(
      <CashAccountStatusPanel
        rows={rows}
        primaryCurrency="USD"
        defaultShowClosed={true}
      />,
    );

    expect(screen.getByText("page.cashFlow.accountOpen")).toBeInTheDocument();
    expect(screen.getByText("page.cashFlow.accountClosed")).toBeInTheDocument();
  });
});
