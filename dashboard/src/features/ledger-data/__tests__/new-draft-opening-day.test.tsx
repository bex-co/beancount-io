import { fireEvent, render, screen } from "@testing-library/react";
import { useState, type ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAccountDialog } from "@/features/ledger-data/accounts/open-account-dialog";
import { AddBudgetDialog } from "@/features/ledger-data/budget/add-budget-dialog";

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: () => [vi.fn(), { loading: false }],
  useQuery: () => ({
    data: {
      getLedger: {
        options: {
          nameAssets: "Assets",
          nameLiabilities: "Liabilities",
          nameEquity: "Equity",
          nameIncome: "Income",
          nameExpenses: "Expenses",
        },
      },
      getLedgerAccountDirectives: [],
    },
    loading: false,
  }),
}));
vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => () => "error",
}));
vi.mock("@/common/hooks/use-date-locale", async () => {
  const { enUS } = await import("react-day-picker/locale/en-US");
  return { useDateLocale: () => enUS };
});
vi.mock("@/common/components/ledger-comboboxes/account-combobox", () => ({
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
      onChange={(e) => onValueChange(e.target.value)}
    />
  ),
}));
vi.mock("@/common/components/ledger-comboboxes/currency-combobox", () => ({
  CurrencyCombobox: () => null,
}));

type Dialog = ComponentType<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledgerId: string;
}>;

function Harness({ Dialog }: { Dialog: Dialog }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Start draft
      </button>
      <Dialog open={open} onOpenChange={setOpen} ledgerId="owner/ledger" />
    </>
  );
}

/** Local civil time, the clock `todayIsoDate()` reads. */
const at = (day: number) => vi.setSystemTime(new Date(2026, 9, day, 12));
const date = () => screen.getByPlaceholderText("MM/DD/YYYY");

/**
 * Both dialogs stay mounted while closed. A draft opened after the dialog
 * spent a day boundary closed starts on the day it opens, not the day of its
 * last reset (w4/986).
 */
describe.each<[string, Dialog, string]>([
  ["Add Budget", AddBudgetDialog as Dialog, "Account"],
  ["Open Account", OpenAccountDialog as Dialog, "Account Name"],
])("%s opening day", (_name, Dialog, accountLabel) => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens a new draft on today's date after the dialog waited closed overnight", () => {
    at(21);
    render(<Harness Dialog={Dialog} />);
    at(22);

    fireEvent.click(screen.getByRole("button", { name: "Start draft" }));
    expect(date()).toHaveValue("10/22/2026");
  });

  it("keeps a chosen date across midnight, and a reopened draft starts on the new day", () => {
    at(22);
    render(<Harness Dialog={Dialog} />);
    fireEvent.click(screen.getByRole("button", { name: "Start draft" }));
    fireEvent.change(date(), { target: { value: "10/23/2026" } });
    fireEvent.blur(date());

    // The draft is open across the day change; editing it keeps the date.
    at(24);
    fireEvent.change(screen.getByLabelText(accountLabel), {
      target: { value: "Assets:Cash" },
    });
    expect(date()).toHaveValue("10/23/2026");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Start draft" }));
    expect(date()).toHaveValue("10/24/2026");
    expect(screen.getByLabelText(accountLabel)).toHaveValue("");
  });
});
