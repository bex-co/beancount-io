import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BalanceForm } from "../balance-form";
import { NoteForm } from "../note-form";
import { OpenAccountForm } from "../open-account-form";
import { TransactionForm } from "../transaction-form";

// The real comboboxes and date picker render; only the network is stubbed.
vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useQuery: () => ({ data: undefined, loading: false, error: undefined }),
  useMutation: () => [vi.fn(), { loading: false }],
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD", ledger: undefined }),
}));

/** Every name must resolve to exactly one control, or getByLabelText throws. */
function expectLabelled(names: string[]) {
  for (const name of names) {
    expect(
      screen.getByLabelText(name, { selector: "input, textarea" }),
    ).toBeInTheDocument();
  }
}

describe("New Entry field labels (w3/498)", () => {
  it("names every Transaction field, with posting fields numbered", () => {
    render(<TransactionForm ledgerId="owner/ledger" />);

    expectLabelled(["Date", "Payee", "Narration"]);
    for (const n of [1, 2]) {
      expect(
        screen.getByRole("combobox", { name: `Posting ${n} account` }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("spinbutton", { name: `Posting ${n} amount` }),
      ).toHaveAttribute("name", `postings.${n - 1}.amount`);
      expect(
        screen.getByRole("combobox", { name: `Posting ${n} currency` }),
      ).toBeInTheDocument();
    }
    // Placeholders stay as examples, not as the only name.
    expect(
      screen.getByRole("combobox", { name: "Posting 2 account" }),
    ).toHaveAttribute("placeholder", "Account (e.g., Assets:Bank:Checking)");
  });

  it("keeps the names once values are typed", async () => {
    const user = userEvent.setup();
    render(<TransactionForm ledgerId="owner/ledger" />);
    // The form moves focus to Payee on a mount timer; let it land first.
    const payee = () => screen.getByRole("combobox", { name: "Payee" });
    await waitFor(() => expect(payee()).toHaveFocus());

    await user.type(payee(), "Grocer");
    await user.type(
      screen.getByRole("combobox", { name: "Posting 2 account" }),
      "Assets:Cash",
    );
    await user.type(
      screen.getByRole("spinbutton", { name: "Posting 2 amount" }),
      "12.5",
    );

    expect(payee()).toHaveValue("Grocer");
    expect(
      screen.getByRole("combobox", { name: "Posting 2 account" }),
    ).toHaveValue("Assets:Cash");
    expect(
      screen.getByRole("spinbutton", { name: "Posting 2 amount" }),
    ).toHaveValue(12.5);
  });

  it("numbers a posting added after the first two", async () => {
    const user = userEvent.setup();
    render(<TransactionForm ledgerId="owner/ledger" />);

    await user.click(screen.getByRole("button", { name: "Add posting" }));

    expect(
      screen.getByRole("spinbutton", { name: "Posting 3 amount" }),
    ).toHaveAttribute("name", "postings.2.amount");
    expect(
      screen.getByRole("combobox", { name: "Posting 3 currency" }),
    ).toBeInTheDocument();
  });

  it("names every Balance field", () => {
    render(<BalanceForm ledgerId="owner/ledger" />);

    expectLabelled(["Date", "Account", "Currency"]);
    expect(screen.getByRole("spinbutton", { name: "Amount" })).toHaveAttribute(
      "name",
      "amount",
    );
  });

  it("names every Note field", () => {
    render(<NoteForm ledgerId="owner/ledger" />);

    expectLabelled(["Date", "Account"]);
    expect(
      screen.getByRole("textbox", { name: "Note content" }),
    ).toHaveAttribute("name", "content");
  });

  it("names every Open Account field", () => {
    render(<OpenAccountForm ledgerId="owner/ledger" />);

    expectLabelled(["Date", "Account"]);
  });
});
