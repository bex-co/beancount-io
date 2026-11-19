import { MockedProvider } from "@apollo/client/testing/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { GetLedgerAccountsDocument } from "@/graphql/definitions";
import { AccountCombobox } from "../account-combobox";

/**
 * The receipt review's Payment Account lists the reader's payment methods and
 * the Expense Account the ledger's expense categories, under the ledger's own
 * root names — a card paid by credit card is a Liabilities account, and a
 * ledger with `option "name_assets"` names no `Assets:` account (w5/1189).
 * The reader's contract promises the payment method is "an Assets or
 * Liabilities account", so filtering to `Assets:` alone contradicts it.
 */
const ledgerId = "owner/ledger";

function Field({ filterRoots }: { filterRoots: string[] }) {
  const [value, setValue] = useState("");
  return (
    <>
      <label htmlFor="account-field">Account</label>
      <AccountCombobox
        id="account-field"
        ledgerId={ledgerId}
        value={value}
        onValueChange={setValue}
        filterRoots={filterRoots}
      />
    </>
  );
}

async function openOptions(
  filterRoots: string[],
  listed: string[],
  firstVisible: string,
) {
  render(
    <MockedProvider
      mocks={[
        {
          request: {
            query: GetLedgerAccountsDocument,
            variables: { ledgerId, status: "open" },
          },
          result: { data: { getLedgerAccounts: listed } },
        },
      ]}
    >
      <Field filterRoots={filterRoots} />
    </MockedProvider>,
  );
  fireEvent.focus(await screen.findByRole("combobox", { name: "Account" }));
  await screen.findByRole("option", { name: firstVisible });
}

const ENGLISH = [
  "Assets:Bank:Checking",
  "Assets:Cash",
  "Liabilities:CreditCard:Visa",
  "Expenses:Food:Coffee",
  "Income:Salary",
  "IncomeTax:Owed",
];

const RENAMED = [
  "Activos:Banco",
  "Pasivos:Visa",
  "Gastos:Comida",
  "Ingresos:Sueldo",
  "Capital:Apertura",
];

describe("AccountCombobox filterRoots", () => {
  it("lists Assets and Liabilities accounts for a payment field", async () => {
    await openOptions(
      ["Assets", "Liabilities"],
      ENGLISH,
      "Assets:Bank:Checking",
    );
    expect(
      await screen.findByRole("option", {
        name: "Liabilities:CreditCard:Visa",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("option", { name: "Expenses:Food:Coffee" }),
    ).not.toBeInTheDocument();
  });

  it("lists a renamed ledger's own roots", async () => {
    await openOptions(["Activos", "Pasivos"], RENAMED, "Activos:Banco");
    expect(
      await screen.findByRole("option", { name: "Pasivos:Visa" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("option", { name: "Gastos:Comida" }),
    ).not.toBeInTheDocument();
  });

  it("lists a renamed ledger's expense root", async () => {
    await openOptions(["Gastos"], RENAMED, "Gastos:Comida");
    expect(
      await screen.findByRole("option", { name: "Gastos:Comida" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("option", { name: "Activos:Banco" }),
    ).not.toBeInTheDocument();
  });

  it("matches whole root components, so IncomeTax is not Income", async () => {
    await openOptions(["Income"], ENGLISH, "Income:Salary");
    expect(
      await screen.findByRole("option", { name: "Income:Salary" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("option", { name: "IncomeTax:Owed" }),
    ).not.toBeInTheDocument();
  });
});
