import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AddBudgetDialog } from "../add-budget-dialog";

// The dialog reads the ledger's income root; these budgets use Expenses.
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { nameIncome: "Income" } } }),
}));

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: () => [mutate, { loading: false }],
  useQuery: () => ({ data: undefined, loading: false, error: undefined }),
}));

vi.mock("@/common/components/ledger-comboboxes/account-combobox", () => ({
  AccountCombobox: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <input
      data-testid="account-combobox"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    />
  ),
}));

vi.mock("@/common/hooks/use-date-locale", async () => {
  const { enUS } = await import("react-day-picker/locale/en-US");
  return { useDateLocale: () => enUS };
});

const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Pacific/Apia";
});
afterAll(() => {
  process.env.TZ = originalTz;
});

/** Pacific/Apia skipped 2011-12-30; a budget on that day keeps it (w4/m32). */
describe("AddBudgetDialog on a skipped day", () => {
  it("writes 2011-12-30 unchanged", async () => {
    mutate.mockResolvedValue({ data: { bulkEntries: { success: true } } });
    render(
      <AddBudgetDialog
        open
        onOpenChange={() => {}}
        ledgerId="ledger-1"
        defaultCurrency="USD"
      />,
    );
    const date = screen.getByPlaceholderText("MM/DD/YYYY");
    fireEvent.change(date, { target: { value: "2011-12-30" } });
    fireEvent.blur(date);
    fireEvent.change(screen.getByTestId("account-combobox"), {
      target: { value: "Expenses:Food" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: /amount/i }), {
      target: { value: "500" },
    });

    expect(date).toHaveValue("12/30/2011");
    const submit = screen.getByRole("button", { name: /add budget/i });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0]![0].variables.entries[0].budget.date).toBe(
      "2011-12-30",
    );
  });
});
