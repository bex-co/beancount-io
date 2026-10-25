import { render, screen, waitFor } from "@testing-library/react";
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
    />
  ),
}));

describe("Transaction mount focus handoff (w4/1075)", () => {
  it("defaults to Payee when the reader has not chosen a field", async () => {
    render(<TransactionForm ledgerId="open_ledger/minimax" />);
    await waitFor(() => {
      expect(
        document.querySelector("[data-transaction-payee] input"),
      ).toHaveFocus();
    });
  });

  it("keeps a field chosen while the handoff is pending", async () => {
    render(<TransactionForm ledgerId="open_ledger/minimax" />);
    const date = screen.getByRole("textbox", { name: "Date" });
    date.focus();
    expect(date).toHaveFocus();
    // Outlast the 150ms mount handoff.
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(date).toHaveFocus();
  });
});
