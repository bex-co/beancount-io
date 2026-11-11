import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation, useQuery } from "@apollo/client/react";
import { AddBudgetDialog } from "../add-budget-dialog";

const ledger = vi.hoisted(() => ({ nameIncome: "Income" }));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: ledger } }),
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/common/components/ledger-comboboxes/account-combobox", () => ({
  AccountCombobox: ({
    value,
    onValueChange,
    placeholder,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="account-combobox"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock("@/common/components/ledger-comboboxes/currency-combobox", () => ({
  CurrencyCombobox: ({
    value,
    onValueChange,
    placeholder,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="currency-combobox"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock("@/common/components/ui/date-picker", () => ({
  DatePicker: ({
    value,
    onChange,
  }: {
    value: string | undefined;
    onChange: (d: string | undefined) => void;
  }) => (
    <input
      data-testid="date-picker"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      readOnly
    />
  ),
}));

/**
 * The Budget card reads a negative budget as an income target and a positive
 * one as a spending cap. Add Budget stored "3500" for Income:Salary as typed,
 * so a 4,000 salary read "Below target" (w2/117, as mobile's w4/039).
 */
describe("Add Budget stores income targets negative", () => {
  let mutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ledger.nameIncome = "Income";
    mutate = vi.fn().mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    vi.mocked(useMutation).mockReturnValue([
      mutate,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    } as ReturnType<typeof useQuery>);
  });

  async function add(account: string, amount: string) {
    const user = userEvent.setup();
    render(<AddBudgetDialog open onOpenChange={vi.fn()} ledgerId="ledger-1" />);
    await user.type(screen.getByTestId("account-combobox"), account);
    await user.type(
      screen.getByRole("spinbutton", { name: /amount/i }),
      amount,
    );
    const submit = screen.getByRole("button", { name: /add budget/i });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    return mutate.mock.calls[0][0].variables.entries[0].budget.amount;
  }

  it.each([
    ["Income:Salary", "3500", "-3500"],
    ["Income:Salary", "-3500", "-3500"],
    ["Expenses:Housing:Rent", "5000", "5000"],
    ["Expenses:Housing:Rent", "-5000", "5000"],
  ])("stores %s %s as %s", async (account, typed, stored) => {
    expect(await add(account, typed)).toEqual({
      number: stored,
      currency: "USD",
    });
  });

  it("follows a renamed income root", async () => {
    ledger.nameIncome = "Revenue";
    expect((await add("Revenue:Salary", "3500")).number).toBe("-3500");
  });

  it("explains the sign under Amount only for an income account", async () => {
    const user = userEvent.setup();
    render(<AddBudgetDialog open onOpenChange={vi.fn()} ledgerId="ledger-1" />);
    const hint = /Income targets are stored as negative amounts/;
    const account = screen.getByTestId("account-combobox");
    await user.type(account, "Expenses:Food");
    expect(screen.queryByText(hint)).toBeNull();
    await user.clear(account);
    await user.type(account, "Income:Salary");
    expect(await screen.findByText(hint)).toBeInTheDocument();
  });
});
