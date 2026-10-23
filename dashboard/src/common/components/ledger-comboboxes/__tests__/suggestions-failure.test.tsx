import { MockedProvider } from "@apollo/client/testing/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  GetLedgerAccountsDocument,
  GetLedgerCurrenciesDocument,
  GetLedgerNarrationsDocument,
  GetLedgerPayeesDocument,
} from "@/graphql/definitions";
import { AccountCombobox } from "../account-combobox";
import { CurrencyCombobox } from "../currency-combobox";
import { NarrationsCombobox } from "../narrations-combobox";
import { PayeesCombobox } from "../payees-combobox";

/**
 * A failed suggestions read must leave the field itself usable, with an
 * in-place retry that restores real suggestions without remounting it
 * (w4/m35).
 */
const ledgerId = "owner/ledger";
const cases = [
  {
    name: "Payee",
    Component: PayeesCombobox,
    query: GetLedgerPayeesDocument,
    variables: { ledgerId },
    data: { getLedgerPayees: ["Corner Cafe"] },
    option: "Corner Cafe",
  },
  {
    name: "Narration",
    Component: NarrationsCombobox,
    query: GetLedgerNarrationsDocument,
    variables: { ledgerId },
    data: { getLedgerNarrations: ["Weekly groceries"] },
    option: "Weekly groceries",
  },
  {
    name: "Account",
    Component: AccountCombobox,
    query: GetLedgerAccountsDocument,
    variables: { ledgerId, status: "open" },
    data: { getLedgerAccounts: ["Assets:Cash"] },
    option: "Assets:Cash",
  },
  {
    name: "Currency",
    Component: CurrencyCombobox,
    query: GetLedgerCurrenciesDocument,
    variables: { ledgerId },
    data: { getLedgerCurrencies: ["EUR"] },
    option: "EUR",
  },
] as const;

describe.each(cases)(
  "$name suggestions failure",
  ({ name, Component, query, variables, data, option }) => {
    function Field() {
      const [value, setValue] = useState("");
      return (
        <>
          <label htmlFor="field">{name}</label>
          <Component
            id="field"
            aria-describedby="field-help"
            ledgerId={ledgerId}
            value={value}
            onValueChange={setValue}
          />
          <p id="field-help">help</p>
        </>
      );
    }

    const failure = { request: { query, variables }, error: new Error("down") };
    const success = { request: { query, variables }, result: { data } };

    it("keeps the named field editable and recovers in place", async () => {
      render(
        <MockedProvider mocks={[failure, failure, success]}>
          <Field />
        </MockedProvider>,
      );

      const notice = await screen.findByText(
        "Suggestions couldn't load. You can still type a value.",
      );
      const field = screen.getByRole("combobox", { name });
      expect(field).toBeEnabled();
      expect(field.getAttribute("aria-describedby")).toBe(
        `field-help ${notice.id}`,
      );
      fireEvent.change(field, { target: { value: "typed by hand" } });
      expect(field).toHaveValue("typed by hand");
      // No stale or partial options while the read is failed.
      fireEvent.focus(field);
      expect(screen.queryByRole("option")).not.toBeInTheDocument();

      // A failed retry keeps the same mounted field and its text.
      fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
      expect(screen.getByRole("combobox", { name })).toBe(field);
      await screen.findByRole("button", { name: "Try Again" });
      // The retry stays focusable while it runs; it marks itself busy.
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Try Again" }),
        ).not.toHaveAttribute("aria-busy", "true"),
      );
      expect(field).toHaveValue("typed by hand");

      // A successful retry restores real suggestions and drops the notice.
      fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
      await waitFor(() =>
        expect(
          screen.queryByText(
            "Suggestions couldn't load. You can still type a value.",
          ),
        ).not.toBeInTheDocument(),
      );
      expect(screen.getByRole("combobox", { name })).toBe(field);
      expect(field).toHaveValue("typed by hand");
      expect(field.getAttribute("aria-describedby")).toBe("field-help");
      fireEvent.change(field, { target: { value: "" } });
      fireEvent.focus(field);
      expect(await screen.findByRole("option", { name: option })).toBeVisible();
    });
  },
);
