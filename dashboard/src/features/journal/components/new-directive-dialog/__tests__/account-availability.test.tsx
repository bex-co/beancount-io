import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "@apollo/client/react";
import { BalanceForm } from "../balance-form";
import { NoteForm } from "../note-form";
import { TransactionForm } from "../transaction-form";

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: vi.fn(),
  useQuery: (document: { definitions: { name?: { value: string } }[] }) =>
    document.definitions[0]?.name?.value === "GetLedgerAccountDirectives"
      ? {
          data: {
            getLedgerAccountDirectives: [
              {
                account: "Assets:Cash",
                openedAt: "2026-01-01",
                closedAt: null,
              },
              {
                account: "Expenses:Food",
                openedAt: "2026-01-01",
                closedAt: null,
              },
              {
                account: "Assets:OldBank",
                openedAt: "2025-01-01",
                closedAt: "2025-12-31",
              },
              {
                account: "Assets:Future",
                openedAt: "2027-01-01",
                closedAt: null,
              },
            ],
          },
          loading: false,
        }
      : {
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
          },
          loading: false,
        },
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));

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

vi.mock("@/common/components/ui/date-picker", () => ({
  DatePicker: () => <input aria-label="Date" readOnly />,
}));

const mockUseMutation = vi.mocked(useMutation);
let mutate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Only Date is faked, so the entry date is fixed and user-event still runs.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 8, 12));
  mutate = vi
    .fn()
    .mockResolvedValue({ data: { bulkEntries: { success: true } } });
  mockUseMutation.mockReturnValue([
    mutate,
    { loading: false },
  ] as unknown as ReturnType<typeof useMutation>);
});

afterEach(() => {
  vi.useRealTimers();
});

const setAccount = (value: string, index = 0) =>
  fireEvent.change(
    screen.getAllByRole("textbox", { name: "Account" })[index]!,
    {
      target: { value },
    },
  );
const sentEntries = () => mutate.mock.calls[0]?.[0]?.variables?.entries;

describe("New Entry refuses accounts the ledger would reject (w3/560)", () => {
  it("blocks a Balance on a never-opened account until it is also opened", async () => {
    const user = userEvent.setup();
    render(<BalanceForm ledgerId="owner/ledger" />);
    setAccount("Assets:Nope");
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "10" },
    });

    expect(
      await screen.findByText("Assets:Nope isn't open in this ledger."),
    ).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Create Balance Entry" });
    expect(submit).toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", {
        name: "Also open Assets:Nope on 2026-09-08",
      }),
    );
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(sentEntries()).toEqual([
      {
        type: "OPEN",
        open: { date: "2026-09-08", account: "Assets:Nope", currencies: [] },
      },
      expect.objectContaining({
        type: "BALANCE",
        balance: expect.objectContaining({ account: "Assets:Nope" }),
      }),
    ]);
  });

  it("submits a Balance on an open account unchanged", async () => {
    const user = userEvent.setup();
    render(<BalanceForm ledgerId="owner/ledger" />);
    setAccount("Assets:Cash");
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "10" },
    });

    const submit = screen.getByRole("button", { name: "Create Balance Entry" });
    await waitFor(() => expect(submit).toBeEnabled());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(submit);

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(sentEntries()).toHaveLength(1);
  });

  it("names the close date of a closed account on a Note and offers no reopen", async () => {
    render(<NoteForm ledgerId="owner/ledger" />);
    setAccount("Assets:OldBank");
    fireEvent.change(screen.getByRole("textbox", { name: "Note content" }), {
      target: { value: "statement" },
    });

    expect(
      await screen.findByText(
        "Assets:OldBank was closed on 2025-12-31, before this entry.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Note Entry" }),
    ).toBeDisabled();
  });

  it("names the open date of an account opened after the entry", async () => {
    render(<NoteForm ledgerId="owner/ledger" />);
    setAccount("Assets:Future");

    expect(
      await screen.findByText(
        "Assets:Future opens on 2027-01-01, after this entry.",
      ),
    ).toBeInTheDocument();
  });

  it("does not offer to open a name Open Account would refuse", async () => {
    render(<NoteForm ledgerId="owner/ledger" />);
    setAccount("Nope:Thing");

    expect(
      await screen.findByText("Nope:Thing isn't open in this ledger."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("checks every Transaction posting and opens the chosen one in the same batch", async () => {
    const user = userEvent.setup();
    render(<TransactionForm ledgerId="owner/ledger" />);
    setAccount("Assets:Cash", 0);
    fireEvent.change(screen.getAllByRole("spinbutton")[0]!, {
      target: { value: "-12" },
    });
    setAccount("Expenses:Groceris", 1);
    fireEvent.change(screen.getAllByRole("spinbutton")[1]!, {
      target: { value: "12" },
    });

    expect(
      await screen.findByText("Expenses:Groceris isn't open in this ledger."),
    ).toBeInTheDocument();
    const submit = screen.getByRole("button", {
      name: "Create Transaction Entry",
    });
    expect(submit).toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", {
        name: "Also open Expenses:Groceris on 2026-09-08",
      }),
    );
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    const entries = sentEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      type: "OPEN",
      open: {
        date: "2026-09-08",
        account: "Expenses:Groceris",
        currencies: [],
      },
    });
    expect(entries[1].type).toBe("TRANSACTION");
  });
});
