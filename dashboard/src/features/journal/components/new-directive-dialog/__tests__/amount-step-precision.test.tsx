import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "@apollo/client/react";
import { BalanceForm } from "../balance-form";
import { TransactionForm } from "../transaction-form";

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "MUSD" }),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <input
      aria-label="Account"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
  CurrencyCombobox: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <input
      aria-label="Currency"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
  PayeesCombobox: () => <input aria-label="Payee" />,
  NarrationsCombobox: () => <input aria-label="Narration" />,
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
      aria-label="Date"
      value={value?.toISOString()}
      onChange={(event) => onChange(new Date(event.target.value))}
      readOnly
    />
  ),
}));

const mockUseMutation = vi.mocked(useMutation);

describe("directive amount precision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts Balance 0.001 on Enter while the amount field stays focused", async () => {
    const user = userEvent.setup();
    const addBalance = vi.fn().mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    mockUseMutation.mockReturnValue([
      addBalance,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);

    render(<BalanceForm ledgerId="open_ledger/minimax" />);

    await user.type(
      screen.getByRole("textbox", { name: "Account" }),
      "Expenses:CostOfRevenue",
    );
    const amount = screen.getByRole("spinbutton");
    await user.type(amount, "0.001");

    expect(amount).toHaveFocus();
    expect((amount as HTMLInputElement).validity.stepMismatch).toBe(false);
    expect((amount as HTMLInputElement).validationMessage).toBe("");

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(addBalance).toHaveBeenCalled();
    });
    expect(
      addBalance.mock.calls[0]?.[0]?.variables?.entries?.[0]?.balance?.amount
        ?.number,
    ).toBe("0.001");
  });

  it("accepts Transaction 0.001/-0.001 on Enter while a posting amount stays focused", async () => {
    const user = userEvent.setup();
    const addTransaction = vi.fn().mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    mockUseMutation.mockReturnValue([
      addTransaction,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);

    render(<TransactionForm ledgerId="open_ledger/minimax" />);

    const accounts = screen.getAllByRole("textbox", { name: "Account" });
    const amounts = screen.getAllByRole("spinbutton");

    await user.type(accounts[0]!, "Expenses:CostOfRevenue");
    await user.type(amounts[0]!, "0.001");
    await user.type(accounts[1]!, "Assets:Current:Cash");
    await user.type(amounts[1]!, "-0.001");

    expect(amounts[1]).toHaveFocus();
    expect((amounts[1] as HTMLInputElement).validity.stepMismatch).toBe(false);
    expect((amounts[1] as HTMLInputElement).validationMessage).toBe("");

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(addTransaction).toHaveBeenCalled();
    });
    const postings =
      addTransaction.mock.calls[0]?.[0]?.variables?.entries?.[0]?.transaction
        ?.postings;
    expect(postings?.[0]?.units?.number).toBe("0.001");
    expect(postings?.[1]?.units?.number).toBe("-0.001");
  });

  it("names the status control and posting row actions", async () => {
    const user = userEvent.setup();
    mockUseMutation.mockReturnValue([
      vi.fn(),
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);

    render(<TransactionForm ledgerId="open_ledger/minimax" />);

    expect(
      screen.getByRole("combobox", { name: "Status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add posting" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add posting" }));
    expect(
      screen.getByRole("button", { name: "Remove posting 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove posting 3" }),
    ).toBeInTheDocument();
  });
});
