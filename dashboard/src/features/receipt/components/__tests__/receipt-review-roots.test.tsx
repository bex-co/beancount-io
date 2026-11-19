import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { enUS } from "react-day-picker/locale/en-US";
import { ReceiptReviewForm } from "../receipt-review-form";

vi.mock("@/common/hooks/use-date-locale", () => ({
  useDateLocale: () => enUS,
}));

// A ledger with renamed roots: no `Assets:`, `Liabilities:` or `Expenses:`
// account exists on it (w5/1189).
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerData: {
      options: {
        nameAssets: "Activos",
        nameLiabilities: "Pasivos",
        nameExpenses: "Gastos",
      },
    },
  }),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: ({
    value,
    placeholder,
    filterRoots,
  }: {
    value: string;
    placeholder?: string;
    filterRoots?: readonly string[];
  }) => (
    <input
      aria-label={placeholder ?? "Account"}
      value={value}
      data-filter-roots={(filterRoots ?? []).join(",")}
      readOnly
    />
  ),
  CurrencyCombobox: ({ value }: { value: string }) => (
    <input aria-label="Currency" value={value} readOnly />
  ),
}));

function renderReview(parsed: {
  sourceAccount?: string;
  targetAccount?: string;
}) {
  return render(
    <ReceiptReviewForm
      ledgerId="owner/ledger"
      parsed={{
        date: "2026-08-01",
        payee: "Cafe",
        description: "Coffee",
        amount: -12.5,
        ...parsed,
      }}
      primaryCurrency="USD"
      onSubmit={vi.fn().mockResolvedValue(undefined)}
      onReset={() => {}}
    />,
  );
}

/** The review filters by the ledger's own roots, and previews under them. */
describe("ReceiptReviewForm account roots", () => {
  it("offers the reader's card under Payment and the category under Expense", () => {
    renderReview({
      sourceAccount: "Pasivos:Visa",
      targetAccount: "Gastos:Comida",
    });
    expect(screen.getByDisplayValue("Pasivos:Visa")).toHaveAttribute(
      "data-filter-roots",
      "Activos,Pasivos",
    );
    const expenses = screen.getAllByDisplayValue("Gastos:Comida");
    expect(
      expenses.map((input) => input.getAttribute("data-filter-roots")),
    ).toContain("Gastos");
  });

  it("leaves the Document Account unfiltered", () => {
    renderReview({
      sourceAccount: "Pasivos:Visa",
      targetAccount: "Gastos:Comida",
    });
    const expenses = screen.getAllByDisplayValue("Gastos:Comida");
    expect(
      expenses.map((input) => input.getAttribute("data-filter-roots")),
    ).toContain("");
  });

  it("previews empty accounts under the ledger's root names", () => {
    const view = renderReview({ sourceAccount: "", targetAccount: "" });
    const preview = view.container.querySelector("pre")?.textContent ?? "";
    expect(preview).toContain("Gastos:Account");
    expect(preview).toContain("Activos:Account");
    expect(preview).not.toContain("Expenses:Account");
    expect(preview).not.toContain("Assets:Account");
  });
});
