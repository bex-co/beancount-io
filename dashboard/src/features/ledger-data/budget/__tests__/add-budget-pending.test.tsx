import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetInterval } from "@/graphql/definitions";
import { AddBudgetDialog } from "../add-budget-dialog";

// The dialog reads the ledger's income root; these budgets use Expenses.
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { nameIncome: "Income" } } }),
}));

/** Budget keeps a pending write's draft in front (w4/295). */
const { mutate, deferred } = vi.hoisted(() => {
  const deferred: Array<{
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }> = [];
  const mutate = vi.fn(
    () => new Promise((resolve, reject) => deferred.push({ resolve, reject })),
  );
  return { mutate, deferred };
});

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: () => [mutate, { loading: false }],
  useQuery: () => ({ data: undefined, loading: false, error: undefined }),
}));
vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => () => "Connection problem",
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
      aria-label="Account"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    />
  ),
}));
vi.mock("@/common/hooks/use-date-locale", async () => {
  const { enUS } = await import("react-day-picker/locale/en-US");
  return { useDateLocale: () => enUS };
});

function Harness({ locked = false }: { locked?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        reopen
      </button>
      {/* A route change can close the dialog without asking it. */}
      <button type="button" onClick={() => setOpen(false)}>
        navigate away
      </button>
      <AddBudgetDialog
        open={open}
        onOpenChange={setOpen}
        ledgerId="ledger-1"
        defaultCurrency="USD"
        {...(locked && {
          lockedAccount: "Expenses:Food:Coffee",
          lockedInterval: BudgetInterval.Monthly,
        })}
      />
    </>
  );
}

const amount = () => screen.getByRole("spinbutton", { name: /amount/i });
const submitButton = () => screen.getByRole("button", { name: /add budget/i });
const settle = async (outcome: "success" | "failure") => {
  const pending = deferred.shift()!;
  await act(async () => {
    if (outcome === "success") {
      pending.resolve({ data: { bulkEntries: { success: true } } });
    } else pending.reject(new Error("offline"));
  });
};

async function submit500(locked: boolean) {
  if (!locked) {
    fireEvent.change(screen.getByLabelText("Account"), {
      target: { value: "Expenses:Food:Coffee" },
    });
  }
  fireEvent.change(amount(), { target: { value: "500" } });
  await waitFor(() => expect(submitButton()).toBeEnabled());
  const form = amount().closest("form")!;
  fireEvent.submit(form);
  fireEvent.click(submitButton());
  fireEvent.submit(form);
  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
}

describe.each([
  ["Add", false],
  ["Update", true],
])("%s Budget while its write is pending", (_, locked) => {
  beforeEach(() => {
    mutate.mockClear();
    deferred.length = 0;
  });

  it("submits once, locks the draft and dismissal, then closes on success", async () => {
    render(<Harness locked={locked} />);
    await submit500(locked);

    expect(amount()).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    fireEvent.keyDown(amount(), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(amount()).toHaveValue("500");

    await settle("success");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      (
        mutate.mock.calls[0] as unknown as [
          {
            variables: {
              entries: { budget: { amount: { number: string } } }[];
            };
          },
        ]
      )[0].variables.entries[0].budget.amount.number,
    ).toBe("500");
  });

  it("keeps the draft editable for a retry after a failure", async () => {
    render(<Harness locked={locked} />);
    await submit500(locked);

    await settle("failure");
    expect(await screen.findByText("Connection problem")).toBeInTheDocument();
    expect(amount()).toBeEnabled();
    expect(amount()).toHaveValue("500");
    fireEvent.click(submitButton());
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
  });

  it("does not let an old success close or clear a later opening", async () => {
    render(<Harness locked={locked} />);
    await submit500(locked);

    fireEvent.click(
      screen.getByRole("button", { name: "navigate away", hidden: true }),
    );
    fireEvent.click(screen.getByRole("button", { name: "reopen" }));
    expect(amount()).toHaveValue("");
    expect(amount()).toBeDisabled();

    await settle("success");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(amount()).toBeEnabled();
    fireEvent.change(amount(), { target: { value: "900" } });
    expect(amount()).toHaveValue("900");
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
