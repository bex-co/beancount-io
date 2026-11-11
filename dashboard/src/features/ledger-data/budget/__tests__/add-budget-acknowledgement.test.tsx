import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { BulkEntriesMutationVariables } from "@/graphql/definitions";
import { AddBudgetDialog } from "../add-budget-dialog";
import { useBudgetEntries } from "../use-budget-entries";

// The dialog reads the ledger's income root; these budgets use Expenses.
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { nameIncome: "Income" } } }),
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

/**
 * Real Apollo with the BulkEntries acknowledgement and every Budget list read
 * controlled separately (w4/m41): a saved budget is finished once, even when
 * reading the list afterwards fails.
 */
type Write = { success: boolean; message: string } | "transport";

function setup(
  write: Write,
  {
    refreshFails = true,
    lockedAccount,
  }: { refreshFails?: boolean; lockedAccount?: string } = {},
) {
  const writes: BulkEntriesMutationVariables[] = [];
  let reads = 0;
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          if (operation.operationName === "BulkEntries") {
            writes.push(operation.variables as BulkEntriesMutationVariables);
            if (write === "transport") {
              observer.error(new Error("Failed to fetch"));
              return;
            }
            observer.next({
              data: {
                bulkEntries: { __typename: "AddLedgerEntryResponse", ...write },
              },
            });
            observer.complete();
            return;
          }
          if (operation.operationName === "GetLedgerJournal") {
            reads += 1;
            if (refreshFails && reads > 1) {
              observer.error(new Error("Failed to fetch"));
              return;
            }
            observer.next({
              data: {
                getLedgerJournal: {
                  __typename: "JournalResult",
                  data: [],
                  total: 0,
                },
              },
            });
            observer.complete();
            return;
          }
          observer.error(new Error(`unexpected ${operation.operationName}`));
        }),
    ),
  });

  const onOpenChange = vi.fn();
  function BudgetPage() {
    const [open, setOpen] = useState(true);
    const budgets = useBudgetEntries("ledger-1");
    return (
      <>
        <output data-testid="list">
          {budgets.error ? "list failed" : budgets.loading ? "loading" : "list"}
        </output>
        <AddBudgetDialog
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          ledgerId="ledger-1"
          defaultCurrency="USD"
          lockedAccount={lockedAccount}
        />
      </>
    );
  }
  render(
    <ApolloProvider client={client}>
      <BudgetPage />
    </ApolloProvider>,
  );
  return { writes, onOpenChange, reads: () => reads };
}

async function submit500({ pickAccount = true } = {}) {
  await waitFor(() =>
    expect(screen.getByTestId("list")).toHaveTextContent("list"),
  );
  if (pickAccount) {
    fireEvent.change(screen.getByTestId("account-combobox"), {
      target: { value: "Expenses:Food:Coffee" },
    });
  }
  fireEvent.change(screen.getByRole("spinbutton", { name: /amount/i }), {
    target: { value: "500" },
  });
  const button = screen.getByRole("button", { name: /add budget/i });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
}

describe("AddBudgetDialog acknowledgement versus the list read", () => {
  it("finishes a saved budget once when the list refresh fails, leaving recovery to the list", async () => {
    const { writes, onOpenChange, reads } = setup({
      success: true,
      message: "Added 1 entry successfully",
    });
    await submit500();

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(writes).toHaveLength(1);
    expect(writes[0]!.entries[0]!.budget!.amount.number).toBe("500");
    await waitFor(() => expect(reads()).toBeGreaterThanOrEqual(2));
    await waitFor(() =>
      expect(screen.getByTestId("list")).toHaveTextContent("list failed"),
    );
  });

  it("finishes once and keeps the list when the refresh succeeds", async () => {
    const { writes, onOpenChange, reads } = setup(
      { success: true, message: "Added 1 entry successfully" },
      { refreshFails: false },
    );
    await submit500();

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    await waitFor(() => expect(reads()).toBeGreaterThanOrEqual(2));
    expect(screen.getByTestId("list")).toHaveTextContent("list");
    expect(screen.getByTestId("list")).not.toHaveTextContent("failed");
    expect(writes).toHaveLength(1);
  });

  it("finishes an update to an existing budget once when the refresh fails", async () => {
    // Updating opens the same dialog with the budget's account locked.
    const { writes, onOpenChange } = setup(
      { success: true, message: "Added 1 entry successfully" },
      { lockedAccount: "Expenses:Food:Coffee" },
    );
    await submit500({ pickAccount: false });

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(writes).toHaveLength(1);
    expect(writes[0]!.entries[0]!.budget!.account).toBe("Expenses:Food:Coffee");
    await waitFor(() =>
      expect(screen.getByTestId("list")).toHaveTextContent("list failed"),
    );
  });

  it("keeps the draft and the reason for a refused write", async () => {
    const { writes, onOpenChange } = setup({
      success: false,
      message: "Budget refused",
    });
    await submit500();

    expect(await screen.findByText("Budget refused")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("spinbutton", { name: /amount/i })).toHaveValue(
      500,
    );
    expect(writes).toHaveLength(1);
  });

  it("keeps the draft for a write that never reached the server", async () => {
    const { onOpenChange } = setup("transport");
    await submit500();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /add budget/i })).toBeEnabled();
  });
});
