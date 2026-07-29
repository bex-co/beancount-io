import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation, useQuery } from "@apollo/client/react";
import { AddBudgetDialog } from "../add-budget-dialog";

vi.mock("@apollo/client/react", () => ({
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
    value: Date;
    onChange: (d: Date | undefined) => void;
  }) => (
    <input
      data-testid="date-picker"
      value={value?.toISOString()}
      onChange={(e) => onChange(new Date(e.target.value))}
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

describe("AddBudgetDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([
      vi.fn().mockResolvedValue({
        data: { bulkEntries: { success: true } },
      }),
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    } as ReturnType<typeof useQuery>);
  });

  it("renders 'Add Budget' dialog title when open", () => {
    render(<AddBudgetDialog {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: "Add Budget" }),
    ).toBeInTheDocument();
  });

  it("does not render dialog content when open=false", () => {
    render(<AddBudgetDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("Add Budget")).not.toBeInTheDocument();
  });

  it("Cancel button calls onOpenChange(false)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<AddBudgetDialog {...defaultProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("resets draft values when cancelled", async () => {
    const user = userEvent.setup();
    render(<AddBudgetDialog {...defaultProps} />);

    await user.type(
      screen.getByTestId("account-combobox"),
      "Expenses:Groceries",
    );
    await user.type(screen.getByRole("spinbutton", { name: /amount/i }), "500");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByTestId("account-combobox")).toHaveValue("");
    expect(screen.getByRole("spinbutton", { name: /amount/i })).toHaveValue(
      null,
    );
  });

  it("Add Budget button is disabled when form is invalid (empty account)", async () => {
    render(<AddBudgetDialog {...defaultProps} />);
    const submitBtn = screen.getByRole("button", { name: /add budget/i });
    // Default form has empty account and number, so isValid is false
    expect(submitBtn).toBeDisabled();
  });

  it("Add Budget button is enabled when required fields are filled", async () => {
    const user = userEvent.setup();
    render(<AddBudgetDialog {...defaultProps} />);

    await user.type(
      screen.getByTestId("account-combobox"),
      "Expenses:Groceries",
    );
    await user.type(screen.getByRole("spinbutton", { name: /amount/i }), "500");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add budget/i }),
      ).not.toBeDisabled();
    });
  });

  it("shows error when mutation returns failure message", async () => {
    const user = userEvent.setup();
    mockUseMutation.mockReturnValue([
      vi.fn().mockResolvedValue({
        data: {
          bulkEntries: { success: false, message: "Invalid account" },
        },
      }),
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);

    render(<AddBudgetDialog {...defaultProps} />);

    await user.type(
      screen.getByTestId("account-combobox"),
      "Expenses:Groceries",
    );
    await user.type(screen.getByRole("spinbutton", { name: /amount/i }), "500");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add budget/i }),
      ).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: /add budget/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid account")).toBeInTheDocument();
    });
  });

  it("calls onSuccess and closes when mutation succeeds", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    const mockAddBudget = vi.fn().mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    mockUseMutation.mockReturnValue([
      mockAddBudget,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);

    render(
      <AddBudgetDialog
        {...defaultProps}
        onSuccess={onSuccess}
        onOpenChange={onOpenChange}
      />,
    );

    await user.type(
      screen.getByTestId("account-combobox"),
      "Expenses:Groceries",
    );
    await user.type(screen.getByRole("spinbutton", { name: /amount/i }), "500");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add budget/i }),
      ).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: /add budget/i }));

    await waitFor(() => {
      expect(mockAddBudget).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
