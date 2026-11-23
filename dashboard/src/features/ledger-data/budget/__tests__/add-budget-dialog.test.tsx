import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { useState } from "react";
import { AddBudgetDialog } from "../add-budget-dialog";

// The dialog reads the ledger's income root; these budgets use Expenses.
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { nameIncome: "Income" } } }),
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
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
    value: string | undefined;
    onChange: (d: string | undefined) => void;
  }) => (
    <input
      data-testid="date-picker"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
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

  it("describes expense and income accounts as examples, since any account can be picked", () => {
    render(<AddBudgetDialog {...defaultProps} />);
    expect(
      screen.getByText(/for an account, such as an expense or income category/),
    ).toBeInTheDocument();
  });

  it("lists intervals from shortest to longest, like the page's interval filter", async () => {
    const user = userEvent.setup();
    render(<AddBudgetDialog {...defaultProps} />);

    screen.getByRole("combobox").focus();
    await user.keyboard("{Enter}");

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Daily",
      "Weekly",
      "Monthly",
      "Quarterly",
      "Yearly",
    ]);
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
    // A typed draft asks before it is discarded (w2/123).
    await user.click(screen.getByRole("button", { name: "Discard" }));

    expect(screen.getByTestId("account-combobox")).toHaveValue("");
    expect(screen.getByRole("spinbutton", { name: /amount/i })).toHaveValue("");
  });

  // One Escape threw away a typed budget (w2/123).
  it("asks before Escape discards a typed amount, and keeps it on Keep editing", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<AddBudgetDialog {...defaultProps} onOpenChange={onOpenChange} />);
    const amount = screen.getByRole("spinbutton", { name: /amount/i });
    await user.type(amount, "500");
    await user.keyboard("{Escape}");

    expect(
      await screen.findByRole("dialog", { name: "Discard what you typed?" }),
    ).toBeVisible();
    expect(onOpenChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByRole("spinbutton", { name: /amount/i })).toHaveValue(
      "500",
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closes an untouched draft on Escape without asking", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<AddBudgetDialog {...defaultProps} onOpenChange={onOpenChange} />);
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(
      screen.queryByRole("dialog", { name: "Discard what you typed?" }),
    ).toBeNull();
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

  it("returns focus to Add Budget after a refused keyboard submission (w4/m42)", async () => {
    const user = userEvent.setup();
    let refuse: () => void = () => {};
    mockUseMutation.mockReturnValue([
      vi.fn(
        () =>
          new Promise((resolve) => {
            refuse = () =>
              resolve({
                data: {
                  bulkEntries: { success: false, message: "Invalid account" },
                },
              });
          }),
      ),
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);

    render(<AddBudgetDialog {...defaultProps} />);
    await user.type(
      screen.getByTestId("account-combobox"),
      "Expenses:Groceries",
    );
    await user.type(screen.getByRole("spinbutton", { name: /amount/i }), "500");
    const add = screen.getByRole("button", { name: /add budget/i });
    await waitFor(() => expect(add).not.toBeDisabled());

    add.focus();
    await user.keyboard("{Enter}");
    // The locked button cannot hold focus; the dialog keeps it meanwhile.
    await waitFor(() => expect(add).toBeDisabled());
    expect(screen.getByRole("dialog")).toHaveFocus();

    refuse();
    expect(await screen.findByText("Invalid account")).toBeInTheDocument();
    expect(add).toHaveFocus();
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

  it("accepts precise amounts on Enter while the amount field stays focused", async () => {
    const user = userEvent.setup();
    const mockAddBudget = vi.fn().mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    mockUseMutation.mockReturnValue([
      mockAddBudget,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);

    render(<AddBudgetDialog {...defaultProps} />);

    await user.type(
      screen.getByTestId("account-combobox"),
      "Expenses:CostOfRevenue",
    );
    const currency = screen.getByTestId("currency-combobox");
    await user.clear(currency);
    await user.type(currency, "MUSD");

    const amount = screen.getByRole("spinbutton", { name: /amount/i });
    await user.clear(amount);
    await user.type(amount, "0.001");

    expect(amount).toHaveFocus();
    expect((amount as HTMLInputElement).validity.stepMismatch).toBe(false);
    expect((amount as HTMLInputElement).validationMessage).toBe("");

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockAddBudget).toHaveBeenCalled();
    });

    const variables = mockAddBudget.mock.calls[0]?.[0]?.variables;
    expect(variables?.entries?.[0]?.budget?.amount).toEqual({
      number: "0.001",
      currency: "MUSD",
    });
  });
});

describe("Budget draft navigation", () => {
  let history: ReturnType<typeof createBrowserHistory> | undefined;
  const originalUrl = window.location.href;
  const originalState: unknown = window.history.state;
  const journalPath = "/ledger/owner/ledger/journal";
  const budgetPath = "/ledger/owner/ledger/budget";

  beforeEach(() => {
    mockUseMutation.mockReturnValue([
      vi.fn().mockResolvedValue({ data: { bulkEntries: { success: true } } }),
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);
  });

  afterEach(() => {
    cleanup();
    history?.destroy();
    history = undefined;
    window.history.replaceState(originalState, "", originalUrl);
  });

  async function renderBudget() {
    window.history.replaceState(null, "", journalPath);
    history = createBrowserHistory();
    const rootRoute = createRootRoute({ component: Outlet });
    const journal = createRoute({
      getParentRoute: () => rootRoute,
      path: journalPath,
      component: () => <h1>Journal</h1>,
    });
    const budget = createRoute({
      getParentRoute: () => rootRoute,
      path: budgetPath,
      component: function Budget() {
        const [open, setOpen] = useState(false);
        return (
          <AddBudgetDialog
            open={open}
            onOpenChange={setOpen}
            ledgerId="owner/ledger"
            trigger={<button type="button">Open Add Budget</button>}
          />
        );
      },
    });
    const router = createRouter({
      history,
      routeTree: rootRoute.addChildren([journal, budget]),
    });
    await router.load();
    render(<RouterProvider router={router} />);
    const user = userEvent.setup();
    await act(async () => history?.push(budgetPath));
    await user.click(
      await screen.findByRole("button", { name: "Open Add Budget" }),
    );
    const amount = await screen.findByRole("spinbutton", { name: /amount/i });
    return { user, amount };
  }

  it("protects the typed amount on reload and asks before leaving Budget on Back", async () => {
    const { user, amount } = await renderBudget();
    await user.type(amount, "250");
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    act(() => window.history.back());
    expect(
      await screen.findByRole("dialog", { name: "Discard what you typed?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    await waitFor(() => expect(window.location.pathname).toBe(budgetPath));
    expect(amount).toHaveValue("250");
    await waitFor(() => expect(amount).toHaveFocus());

    act(() => window.history.back());
    await user.click(await screen.findByRole("button", { name: "Discard" }));
    expect(
      await screen.findByRole("heading", { name: "Journal" }),
    ).toBeVisible();
  });

  it("holds Budget silently while saving and lets Back leave after success", async () => {
    let finish!: () => void;
    const write = new Promise((resolve) => {
      finish = () => resolve({ data: { bulkEntries: { success: true } } });
    });
    const mutate = vi.fn(() => write);
    mockUseMutation.mockReturnValue([
      mutate,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);
    const { user, amount } = await renderBudget();
    await user.type(
      screen.getByTestId("account-combobox"),
      "Expenses:Groceries",
    );
    await user.type(amount, "250");
    await user.click(screen.getByRole("button", { name: "Add Budget" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
    await waitFor(() => expect(amount).toBeDisabled());

    await act(async () => {
      const popped = new Promise<void>((resolve) => {
        window.addEventListener("popstate", () => resolve(), { once: true });
      });
      window.history.back();
      await popped;
    });
    await waitFor(() => expect(window.location.pathname).toBe(budgetPath));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Add Budget");
    expect(amount).toHaveValue("250");

    await act(async () => finish());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    act(() => window.history.back());
    expect(
      await screen.findByRole("heading", { name: "Journal" }),
    ).toBeVisible();
  });
});

/** The budget amount's arrow keys step exactly (w4/1021). */
describe("Add Budget amount stepping", () => {
  it("steps a large amount by exactly one", async () => {
    render(<AddBudgetDialog {...defaultProps} />);
    const input = screen.getByRole("spinbutton", {
      name: /amount/i,
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12345678901234567890.12" } });
    input.focus();
    await userEvent.setup().keyboard("{ArrowUp}");
    expect(input.value).toBe("12345678901234567891.12");
  });
});
