import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionForm } from "../transaction-form";

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [vi.fn(), { loading: false }],
  useQuery: () => ({ data: undefined, loading: false }),
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
    value: string | undefined;
    onChange: (d: string | undefined) => void;
  }) => (
    <input
      aria-label="Date"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      readOnly
    />
  ),
}));

describe("Transaction inferred amount spacing (w4/1060)", () => {
  it("reserves space for the auto label beside the inferred amount", () => {
    render(<TransactionForm ledgerId="open_ledger/minimax" />);
    const accounts = screen.getAllByRole("textbox", { name: "Account" });
    const amounts = screen.getAllByRole("spinbutton");
    fireEvent.change(accounts[0]!, { target: { value: "Assets:Cash" } });
    fireEvent.change(amounts[0]!, { target: { value: "12.50" } });
    fireEvent.change(accounts[1]!, { target: { value: "Income:Salary" } });

    const inferred = amounts[1] as HTMLInputElement;
    expect(inferred.value).toBe("");
    expect(inferred.placeholder).toBe("-12.50");
    expect(inferred.className).toContain("pe-14");
    expect(screen.getByText("auto")).toBeInTheDocument();

    fireEvent.change(inferred, { target: { value: "3.00" } });
    expect(inferred.className).not.toContain("pe-14");
    expect(screen.queryByText("auto")).toBeNull();
  });
});
