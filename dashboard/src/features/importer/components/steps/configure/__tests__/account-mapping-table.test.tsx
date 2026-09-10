import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { AccountMappingTable } from "../account-mapping-table";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (error: unknown) => String(error),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: () => <div data-testid="account-combobox" />,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

type FormData = {
  sourceAccount: string;
  defaultCurrency: string;
  transactions: Array<{
    rowIndex: number;
    date: Date;
    payee: string;
    description: string;
    amount: number;
    targetAccount: string;
    selected: boolean;
  }>;
};

function Harness() {
  const form = useForm<FormData>({
    defaultValues: {
      sourceAccount: "",
      defaultCurrency: "USD",
      transactions: [
        {
          rowIndex: 0,
          date: new Date(2025, 11, 1),
          payee: "QA Coffee",
          description: "Regular purchase",
          amount: -4.5,
          targetAccount: "Expenses:Coffee",
          selected: true,
        },
        {
          rowIndex: 1,
          date: new Date(2025, 11, 2),
          payee: "QA Grocery",
          description: "Regular purchase",
          amount: -45.67,
          targetAccount: "Expenses:Food",
          selected: true,
        },
      ],
    },
  });

  return (
    <FormProvider {...form}>
      <AccountMappingTable control={form.control} ledgerId="demo/books" />
    </FormProvider>
  );
}

describe("AccountMappingTable selection focus", () => {
  it("keeps focus on a row checkbox across Space toggles", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const checkbox = screen.getByRole("checkbox", {
      name: "importer.accountMapping.selectTransaction 1",
    });
    checkbox.focus();
    expect(checkbox).toHaveFocus();
    expect(checkbox).toBeChecked();

    await user.keyboard(" ");
    expect(checkbox).toHaveFocus();
    expect(checkbox).not.toBeChecked();

    await user.keyboard(" ");
    expect(checkbox).toHaveFocus();
    expect(checkbox).toBeChecked();
  });

  it("preserves hidden-row selection when deselecting visible search matches", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(
      screen.getByPlaceholderText("importer.accountMapping.searchPlaceholder"),
      "QA Coffee",
    );

    await user.click(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectAll",
      }),
    );

    expect(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectTransaction 1",
      }),
    ).not.toBeChecked();

    await user.clear(
      screen.getByPlaceholderText("importer.accountMapping.searchPlaceholder"),
    );

    expect(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectTransaction 1",
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectTransaction 2",
      }),
    ).toBeChecked();
  });
});
