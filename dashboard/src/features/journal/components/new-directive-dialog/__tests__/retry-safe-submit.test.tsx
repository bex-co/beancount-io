import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { TransactionForm } from "../transaction-form";

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: vi.fn(),
  // No account directory: the account-availability check stays out of the way.
  useQuery: () => ({ data: undefined, loading: false }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));

// vi.mock is hoisted above top-level declarations, so the stub lives here.
const { field } = vi.hoisted(() => ({
  field:
    (label: string) =>
    ({
      value,
      onValueChange,
    }: {
      value: string;
      onValueChange: (v: string) => void;
    }) => (
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
    ),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: field("Account"),
  CurrencyCombobox: field("Currency"),
  PayeesCombobox: () => <input aria-label="Payee" />,
  NarrationsCombobox: () => <input aria-label="Narration" />,
}));

const mockUseMutation = vi.mocked(useMutation);

/** Fill posting rows; a blank amount is left for auto-balance. */
function fillPostings(rows: [string, string, string][]) {
  rows.forEach(([account, amount, currency], index) => {
    fireEvent.change(
      screen.getAllByRole("textbox", { name: "Account" })[index]!,
      {
        target: { value: account },
      },
    );
    fireEvent.change(screen.getAllByRole("spinbutton")[index]!, {
      target: { value: amount },
    });
    fireEvent.change(
      screen.getAllByRole("textbox", { name: "Currency" })[index]!,
      { target: { value: currency } },
    );
  });
}

const submit = () =>
  userEvent.click(
    screen.getByRole("button", { name: "Create Transaction Entry" }),
  );

const sentRequestIds = (mutate: ReturnType<typeof vi.fn>) =>
  mutate.mock.calls.map(
    (call) =>
      (call[0] as { variables: { requestId?: string } }).variables.requestId,
  );

const inProgress = () =>
  new CombinedGraphQLErrors({
    errors: [
      {
        message:
          "Entry write conflict: A write with this requestId is still in progress",
        extensions: { code: "CONFLICT", resource: "Entry write" },
      },
    ],
  });

/**
 * A saved entry must never be recorded twice because a save was retried
 * (w3/m61): every save names itself with a requestId the server deduplicates.
 */
describe("New Entry saves are retry-safe", () => {
  let addTransaction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    addTransaction = vi.fn().mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    mockUseMutation.mockReturnValue([
      addTransaction,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);
  });

  it("waits out a save still in progress and resends it under the same id", async () => {
    addTransaction.mockRejectedValueOnce(inProgress());
    const onSuccess = vi.fn();
    render(<TransactionForm ledgerId="owner/ledger" onSuccess={onSuccess} />);
    fillPostings([
      ["Expenses:Rent", "2000", "USD"],
      ["Assets:Bank", "-2000", "USD"],
    ]);

    await submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });
    const [first, retry] = sentRequestIds(addTransaction);
    expect(first).toEqual(expect.any(String));
    expect(retry).toBe(first);
  });

  it("resends an unchanged entry after a refusal under the same id, and an edited one under a new id", async () => {
    addTransaction
      .mockRejectedValueOnce(
        new CombinedGraphQLErrors({
          errors: [
            { message: "down", extensions: { code: "SERVICE_UNAVAILABLE" } },
          ],
        }),
      )
      .mockRejectedValueOnce(
        new CombinedGraphQLErrors({
          errors: [
            { message: "down", extensions: { code: "SERVICE_UNAVAILABLE" } },
          ],
        }),
      );
    render(<TransactionForm ledgerId="owner/ledger" />);
    fillPostings([
      ["Expenses:Rent", "2000", "USD"],
      ["Assets:Bank", "-2000", "USD"],
    ]);

    await submit();
    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1));
    await submit();
    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(2));
    fillPostings([
      ["Expenses:Rent", "2100", "USD"],
      ["Assets:Bank", "-2100", "USD"],
    ]);
    await submit();
    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(3));

    const [first, retry, edited] = sentRequestIds(addTransaction);
    expect(retry).toBe(first);
    expect(edited).not.toBe(first);
  });

  it("records two identical entries saved one after the other as two writes", async () => {
    render(<TransactionForm ledgerId="owner/ledger" />);
    const coffee = (): [string, string, string][] => [
      ["Expenses:Coffee", "4.50", "USD"],
      ["Assets:Cash", "-4.50", "USD"],
    ];

    fillPostings(coffee());
    await submit();
    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1));
    fillPostings(coffee());
    await submit();
    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(2));

    const [first, second] = sentRequestIds(addTransaction);
    expect(second).not.toBe(first);
  });
});
