import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionConfigForm } from "../transaction-config-form";
import type { ParsedRow } from "../../../../types";

/**
 * A bank file's `€-1.25` was prepared as -1.25 USD: the symbol was stripped to
 * read the number, and every selected row took the one Currency (w4/m44).
 * Configure now refuses a selected row whose own symbol names other
 * currencies, says which rows and why, and sends nothing until the reader
 * chooses the matching currency or deselects the rows.
 */
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    // Parameters are echoed so assertions can see what the message names.
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: ({
    value,
    onValueChange,
    placeholder,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <input
      aria-label={placeholder ?? "account"}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
  CurrencyCombobox: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <input
      aria-label="currency"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
}));

vi.mock("../../../../hooks/use-ai-categorization", () => ({
  useAICategorization: () => ({
    categorizeTransactions: vi.fn(),
    loading: false,
  }),
}));

const row = (
  id: string,
  amountInput: string,
  options: Partial<ParsedRow> = {},
): ParsedRow => ({
  id,
  date: "2026-10-21",
  payee: `qa ${id}`,
  description: "qa currency token",
  amount: 0,
  amountInput,
  ...options,
});

const MIXED = [row("euro", "€-1.25"), row("pound", "£2.50")];

const onSubmit = vi.fn();

function renderForm(rows: ParsedRow[]) {
  render(
    <TransactionConfigForm
      rows={rows}
      ledgerId="owner/ledger"
      configDraft={null}
      onConfigDraftChange={() => {}}
      onSubmit={onSubmit}
      onBack={() => {}}
      isSubmitting={false}
    />,
  );
}

async function mapAccounts(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText("importer.configure.sourceAccountPlaceholder"),
    "Assets:Cash",
  );
  for (const target of screen.getAllByLabelText(
    "importer.accountMapping.selectAccountPlaceholder",
  )) {
    await user.type(target, "Expenses:Food");
  }
}

async function chooseCurrency(
  user: ReturnType<typeof userEvent.setup>,
  currency: string,
) {
  await user.clear(screen.getByLabelText("currency"));
  await user.type(screen.getByLabelText("currency"), currency);
}

const importButton = () =>
  screen.getByRole("button", { name: /importer\.configure\.importButton/ });

const conflictAlert = () =>
  screen
    .queryAllByRole("alert")
    .find((alert) => alert.textContent?.includes("currencyConflictRemedy"));

const conflictParams = () =>
  within(conflictAlert()!)
    .queryAllByText(/importer\.configure\.currencyConflict \{/)
    .map((line) => JSON.parse(line.textContent!.replace(/^[^{]*/, "")));

describe("Configure refuses a currency the bank file contradicts", () => {
  beforeEach(() => onSubmit.mockClear());

  it("names each conflicting row and sends nothing for a euro/pound file under USD", async () => {
    const user = userEvent.setup();
    renderForm(MIXED);
    await mapAccounts(user);

    expect(conflictParams()).toEqual([
      { count: 1, rows: "1", symbol: "€", currencies: "EUR", currency: "USD" },
      {
        count: 1,
        rows: "2",
        symbol: "£",
        currencies: "GBP, GIP, FKP, SHP, or EGP",
        currency: "USD",
      },
    ]);

    await user.click(importButton());
    // The refusal moves focus to the explanation, and nothing is sent.
    await waitFor(() => expect(conflictAlert()).toHaveFocus());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("still refuses the pound row under EUR, and imports the euro row once it is deselected", async () => {
    const user = userEvent.setup();
    renderForm(MIXED);
    await mapAccounts(user);
    await chooseCurrency(user, "EUR");

    expect(conflictParams().map((conflict) => conflict.symbol)).toEqual(["£"]);
    await user.click(importButton());
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectTransaction 2",
      }),
    );
    expect(conflictAlert()).toBeUndefined();
    await user.click(importButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual([
      expect.objectContaining({ amount: "-1.25", currency: "EUR" }),
    ]);
  });

  it.each([
    ["-€4.50£", "EUR", "£"],
    ["-€4.50£", "GBP", "€"],
    ["-£4.50€", "EUR", "£"],
    ["-£4.50€", "GBP", "€"],
  ])(
    "refuses %s under %s, naming the other symbol (w4/1002)",
    async (amountInput, currency, symbol) => {
      const user = userEvent.setup();
      renderForm([row("both", amountInput), row("plain", "-1")]);
      await mapAccounts(user);
      await chooseCurrency(user, currency);

      expect(conflictParams()).toEqual([
        expect.objectContaining({ rows: "1", symbol, currency }),
      ]);
      await user.click(importButton());
      await waitFor(() => expect(conflictAlert()).toHaveFocus());
      expect(onSubmit).not.toHaveBeenCalled();

      // Deselected, the contradicting row no longer holds the import back.
      await user.click(
        screen.getByRole("checkbox", {
          name: "importer.accountMapping.selectTransaction 1",
        }),
      );
      expect(conflictAlert()).toBeUndefined();
      await user.click(importButton());
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toEqual([
        expect.objectContaining({ amount: "-1", currency }),
      ]);
    },
  );

  it("refuses the five symbols the CLI already reads under USD", async () => {
    const user = userEvent.setup();
    const cells = ["-₾4.50", "-₸4.50", "-₮4.50", "-₼4.50", "-₲4.50"];
    renderForm(cells.map((cell, index) => row(`s${index}`, cell)));
    await mapAccounts(user);

    expect(
      conflictParams().map(({ symbol, currencies, rows }) => [
        symbol,
        currencies,
        rows,
      ]),
    ).toEqual([
      ["₾", "GEL", "1"],
      ["₸", "KZT", "2"],
      ["₮", "MNT", "3"],
      ["₼", "AZN", "4"],
      ["₲", "PYG", "5"],
    ]);
    await user.click(importButton());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears once the source amount no longer names a currency", async () => {
    const user = userEvent.setup();
    // What Preview hands Configure after the reader edits `€-1.25` to `-1.25`.
    renderForm([row("euro", "-1.25")]);
    await mapAccounts(user);

    expect(conflictAlert()).toBeUndefined();
    await user.click(importButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual([
      expect.objectContaining({ amount: "-1.25", currency: "USD" }),
    ]);
  });

  it.each([
    [
      "euro amounts under EUR",
      [row("a", "€-1.25"), row("b", "-4,50 €", { decimalComma: true })],
      "EUR",
      ["-1.25", "-4.50"],
    ],
    [
      "dollar and yen symbols under EUR",
      [row("a", "$-1.25"), row("b", "¥500")],
      "EUR",
      ["-1.25", "500"],
    ],
    [
      "repeated, ambiguous-dollar and suffix euros under EUR",
      [row("a", "-€4.50€"), row("b", "-$4.50€"), row("c", "-4.50€")],
      "EUR",
      ["-4.50", "-4.50", "-4.50"],
    ],
    ["a lari amount under GEL", [row("a", "-₾4.50")], "GEL", ["-4.50"]],
  ])(
    "imports %s with their exact amounts",
    async (_name, rows, currency, amounts) => {
      const user = userEvent.setup();
      renderForm(rows);
      await mapAccounts(user);
      await chooseCurrency(user, currency);

      expect(conflictAlert()).toBeUndefined();
      await user.click(importButton());
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(
        onSubmit.mock.calls[0]![0].map(
          (txn: { amount: string; currency: string }) => [
            txn.amount,
            txn.currency,
          ],
        ),
      ).toEqual(amounts.map((amount) => [amount, currency]));
    },
  );
});
