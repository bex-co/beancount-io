import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation, useQuery } from "@apollo/client/react";
import { AddBudgetDialog } from "../add-budget-dialog";

// The dialog reads the ledger's income root; these budgets use Expenses.
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { nameIncome: "Income" } } }),
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

const mockUseMutation = vi.mocked(useMutation);
const mockUseQuery = vi.mocked(useQuery);

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  ledgerId: "ledger-1",
  onSuccess: vi.fn(),
};

const LIMIT = "Amounts can have at most 28 digits.";

/**
 * Add Budget sent a 29-digit amount the ledger refuses; the reader saw
 * "information provided is invalid" (w2/129). The field refuses it first.
 */
describe("AddBudgetDialog amount digit limit", () => {
  let mutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutate = vi.fn().mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    mockUseMutation.mockReturnValue([
      mutate,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    } as ReturnType<typeof useQuery>);
  });

  it.each([
    ["29 digits", "9".repeat(29)],
    ["27 whole digits and 2 decimals", `${"9".repeat(27)}.99`],
  ])("refuses %s, and adds the budget at 28", async (_, amount) => {
    const user = userEvent.setup();
    render(<AddBudgetDialog {...defaultProps} />);
    await user.type(
      screen.getByTestId("account-combobox"),
      "Expenses:Groceries",
    );
    const field = screen.getByRole("spinbutton", { name: /amount/i });
    fireEvent.change(field, { target: { value: amount } });

    expect(await screen.findByText(LIMIT)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /add budget/i }));
    expect(mutate).not.toHaveBeenCalled();

    const fits = amount.includes(".") ? `${"9".repeat(26)}.99` : "9".repeat(28);
    fireEvent.change(field, { target: { value: fits } });
    await waitFor(() => expect(screen.queryByText(LIMIT)).toBeNull());
    await user.click(screen.getByRole("button", { name: /add budget/i }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(
      mutate.mock.calls[0]![0].variables.entries[0].budget.amount.number,
    ).toBe(fits);
  });
});
