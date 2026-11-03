import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { OpenAccountDialog } from "../open-account-dialog";
import { OpenAccountForm } from "@/features/journal/components/new-directive-dialog/open-account-form";

// The server refuses a write that would add bean-check errors and names each
// one in `newLedgerErrors` (w0/m2). Both Open Account surfaces must say what
// the write would break and stay open, not report a generic failure.
const DUPLICATE_OPEN =
  "Duplicate open directive for Assets:Savings (main.bean:9)";
const refuse = vi.fn(() =>
  Promise.reject(
    new CombinedGraphQLErrors({
      errors: [
        {
          message: `Validation failed for entries: adding these entries would introduce 1 new bean-check error: ${DUPLICATE_OPEN}`,
          extensions: {
            code: "VALIDATION_FAILED",
            field: "entries",
            newLedgerErrors: DUPLICATE_OPEN,
          },
        },
      ],
    }),
  ),
);

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: () => [refuse, { loading: false }],
  useQuery: (document: { definitions: { name?: { value: string } }[] }) =>
    document.definitions[0]?.name?.value === "GetLedgerAccountDirectives"
      ? { data: { getLedgerAccountDirectives: [] }, loading: false }
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

vi.mock("@/common/hooks/use-date-locale", async () => {
  const { enUS } = await import("react-day-picker/locale/en-US");
  return { useDateLocale: () => enUS };
});

const closed = vi.fn();
const surfaces = [
  {
    name: "the Accounts page dialog",
    render: () =>
      render(
        <OpenAccountDialog
          open
          onOpenChange={(open) => !open && closed()}
          ledgerId="o/l"
        />,
      ),
    field: () => screen.getByLabelText("Account Name"),
    submit: () => screen.getByRole("button", { name: "Open Account" }),
  },
  {
    name: "New Entry's Account tab",
    render: () => render(<OpenAccountForm ledgerId="o/l" onSuccess={closed} />),
    field: () => screen.getByLabelText("Account"),
    submit: () => screen.getByRole("button", { name: "Create Account Entry" }),
  },
];

describe.each(surfaces)("Open Account in $name (w0/m2)", (surface) => {
  it("names what a refused write would break and stays open", async () => {
    refuse.mockClear();
    closed.mockClear();
    surface.render();
    fireEvent.change(surface.field(), {
      target: { value: "Assets:Savings" },
    });
    await waitFor(() => expect(surface.submit()).toBeEnabled());
    fireEvent.click(surface.submit());

    expect(
      await screen.findByText(
        `This would add an error to your ledger: ${DUPLICATE_OPEN}`,
      ),
    ).toBeInTheDocument();
    expect(refuse).toHaveBeenCalledTimes(1);
    expect(closed).not.toHaveBeenCalled();
    expect(surface.field()).toHaveValue("Assets:Savings");
  });
});
