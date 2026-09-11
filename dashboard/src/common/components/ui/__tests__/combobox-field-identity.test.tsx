import { useForm } from "react-hook-form";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "../combobox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/common/components/ui/form";
import { AccountCombobox } from "@/common/components/ledger-comboboxes/account-combobox";
import { CurrencyCombobox } from "@/common/components/ledger-comboboxes/currency-combobox";

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: {
      getLedgerAccounts: ["Expenses:Groceries"],
      getLedgerCurrencies: ["MUSD", "USD"],
    },
    loading: false,
    error: undefined,
  }),
}));

function BudgetSelectorsForm() {
  const form = useForm({
    defaultValues: {
      account: "Expenses:Groceries",
      currency: "MUSD",
    },
  });

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="account"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <FormControl>
                <AccountCombobox
                  ledgerId="ledger-1"
                  value={field.value}
                  onValueChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Choose the account this budget applies to
              </FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <CurrencyCombobox
                  ledgerId="ledger-1"
                  value={field.value}
                  onValueChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

describe("Combobox form field identity", () => {
  it("forwards id and aria-describedby onto the native input", () => {
    render(
      <Combobox
        options={[{ value: "USD", label: "USD" }]}
        value="USD"
        onValueChange={vi.fn()}
        id="currency-field"
        aria-describedby="currency-help"
        aria-invalid={true}
      />,
    );

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("id", "currency-field");
    expect(input).toHaveAttribute("aria-describedby", "currency-help");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("lets Budget Account and Currency labels focus their native inputs", async () => {
    const user = userEvent.setup();
    render(<BudgetSelectorsForm />);

    const account = screen.getByRole("combobox", { name: "Account" });
    const currency = screen.getByRole("combobox", { name: "Currency" });

    expect(account).toHaveAccessibleDescription(
      "Choose the account this budget applies to",
    );

    await user.click(screen.getByText("Account"));
    expect(account).toHaveFocus();

    await user.click(screen.getByText("Currency"));
    expect(currency).toHaveFocus();
  });
});
