import { MockedProvider } from "@apollo/client/testing/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/common/components/ui/dialog";
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
 * Keyboard recovery from a failed suggestions read, inside a real dialog
 * (w4/m35 t003): Tab from the field to Try Again and press Enter. The busy
 * retry button was disabled, so a failed attempt dropped focus to the dialog,
 * and a successful one removed the button and left focus there too.
 */
const ledgerId = "owner/ledger";
const cases = [
  {
    name: "Payee",
    Component: PayeesCombobox,
    query: GetLedgerPayeesDocument,
    variables: { ledgerId },
    data: { getLedgerPayees: ["Corner Cafe"] },
  },
  {
    name: "Narration",
    Component: NarrationsCombobox,
    query: GetLedgerNarrationsDocument,
    variables: { ledgerId },
    data: { getLedgerNarrations: ["Weekly groceries"] },
  },
  {
    name: "Account",
    Component: AccountCombobox,
    query: GetLedgerAccountsDocument,
    variables: { ledgerId, status: "open" },
    data: { getLedgerAccounts: ["Assets:Cash"] },
  },
  {
    name: "Currency",
    Component: CurrencyCombobox,
    query: GetLedgerCurrenciesDocument,
    variables: { ledgerId },
    data: { getLedgerCurrencies: ["EUR"] },
  },
] as const;

const NOTICE = "Suggestions couldn't load. You can still type a value.";

describe.each(cases)(
  "$name retry focus",
  ({ name, Component, query, variables, data }) => {
    function Entry() {
      const [value, setValue] = useState("");
      return (
        <Dialog open>
          <DialogContent>
            <DialogTitle>New Entry</DialogTitle>
            <DialogDescription>qa</DialogDescription>
            <label htmlFor="field">{name}</label>
            <Component
              id="field"
              ledgerId={ledgerId}
              value={value}
              onValueChange={setValue}
            />
          </DialogContent>
        </Dialog>
      );
    }

    it("keeps focus on Try Again after a failed retry, then returns it to the field", async () => {
      const failure = {
        request: { query, variables },
        error: new Error("down"),
        delay: 20,
      };
      const success = { request: { query, variables }, result: { data } };
      const user = userEvent.setup();
      render(
        <MockedProvider mocks={[failure, failure, success]}>
          <Entry />
        </MockedProvider>,
      );
      await screen.findByText(NOTICE);
      const field = screen.getByRole("combobox", { name });
      await user.click(field);
      await user.keyboard("qa{Escape}");

      // Tab from the field to Try Again, past any clear control.
      const retry = screen.getByRole("button", { name: "Try Again" });
      for (let i = 0; i < 4 && document.activeElement !== retry; i += 1) {
        await user.tab();
      }
      expect(retry).toHaveFocus();

      await user.keyboard("{Enter}");
      // While it runs, and after it fails, focus stays on the retry.
      expect(retry).toHaveFocus();
      await waitFor(() =>
        expect(retry).not.toHaveAttribute("aria-busy", "true"),
      );
      expect(screen.getByText(NOTICE)).toBeInTheDocument();
      expect(retry).toHaveFocus();

      await user.keyboard("{Enter}");
      await waitFor(() =>
        expect(screen.queryByText(NOTICE)).not.toBeInTheDocument(),
      );
      expect(screen.getByRole("combobox", { name })).toBe(field);
      expect(field).toHaveFocus();
    });
  },
);
