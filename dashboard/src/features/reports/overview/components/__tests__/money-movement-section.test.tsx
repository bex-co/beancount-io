import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MoneyMovementSection } from "../money-movement-section";

const searchParams = vi.hoisted(() => ({ account: "", filter: "", time: "" }));
vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({ searchParams }),
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedgerNavigateToAccount: () => vi.fn(),
  useLedger: () => ({ ledgerData: { options: {} } }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const props = {
  income: [{ date: "2026-04-30", balance: { USD: -100 }, accountBalances: {} }],
  expenses: [
    { date: "2026-05-31", balance: { USD: 15 }, accountBalances: {} },
    { date: "2027-01-31", balance: { USD: 0 }, accountBalances: {} },
  ],
  primaryCurrency: "USD",
  ledgerOwner: "open_ledger",
  ledgerName: "stock-example",
};

beforeEach(() =>
  Object.assign(searchParams, { account: "", filter: "", time: "" }),
);

describe("public money-movement default", () => {
  it("shows the latest activity and preserves an explicitly selected empty month", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MoneyMovementSection {...props} preferActiveMonth />,
    );
    expect(screen.getAllByText("May 2026")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getAllByText("January 2027")).toHaveLength(3);
    rerender(<MoneyMovementSection {...props} preferActiveMonth />);
    expect(screen.getAllByText("January 2027")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getAllByText("May 2026")).toHaveLength(3);
  });

  it.each([
    { time: "2027-01" },
    { account: "Expenses:Fees" },
    { filter: "payee:Broker" },
  ])(
    "retains the final supplied interval for an explicit filter %j",
    (filter) => {
      Object.assign(searchParams, filter);
      render(<MoneyMovementSection {...props} preferActiveMonth />);
      expect(screen.getAllByText("January 2027")).toHaveLength(3);
    },
  );

  it("preserves the workspace default for writers and private ledgers", () => {
    render(<MoneyMovementSection {...props} />);
    expect(screen.getAllByText("January 2027")).toHaveLength(3);
  });

  it("falls back to the final supplied interval when every amount is zero", () => {
    render(
      <MoneyMovementSection
        {...props}
        income={[]}
        expenses={[
          { date: "2027-01-31", balance: { USD: 0 }, accountBalances: {} },
        ]}
        preferActiveMonth
      />,
    );
    expect(screen.getAllByText("January 2027")).toHaveLength(3);
    expect(
      screen.getAllByText("No money movement for this period."),
    ).toHaveLength(2);
  });
});
