import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { OpenAccountDialog } from "../open-account-dialog";
import { OpenAccountForm } from "@/features/journal/components/new-directive-dialog/open-account-form";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: () => [mutate, { loading: false }],
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

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => () => "error",
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

const surfaces = [
  {
    name: "the Accounts page dialog",
    render: () =>
      render(<OpenAccountDialog open onOpenChange={() => {}} ledgerId="o/l" />),
    field: () => screen.getByLabelText("Account Name"),
    submit: () => screen.getByRole("button", { name: "Open Account" }),
  },
  {
    name: "New Entry's Account tab",
    render: () => render(<OpenAccountForm ledgerId="o/l" />),
    field: () => screen.getByLabelText("Account"),
    submit: () => screen.getByRole("button", { name: "Create Account Entry" }),
  },
];

/** Pacific/Apia skipped 2011-12-30; opening on that day still writes it (w4/m32). */
describe.each(surfaces)("Open Account in $name on a skipped day", (surface) => {
  it("writes 2011-12-30 unchanged", async () => {
    mutate.mockReset();
    mutate.mockResolvedValue({ data: { bulkEntries: { success: true } } });
    surface.render();
    const date = screen.getByPlaceholderText("MM/DD/YYYY");
    fireEvent.change(date, { target: { value: "12/30/2011" } });
    fireEvent.blur(date);
    fireEvent.change(surface.field(), { target: { value: "Assets:Wallet" } });

    expect(date).toHaveValue("12/30/2011");
    expect(date).not.toHaveAttribute("aria-invalid");
    await waitFor(() => expect(surface.submit()).toBeEnabled());
    fireEvent.click(surface.submit());

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(mutate.mock.calls[0]![0].variables)).toContain(
      '"date":"2011-12-30"',
    );
  });
});
