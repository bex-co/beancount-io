import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { enUS } from "react-day-picker/locale/en-US";
import { ReceiptReviewForm } from "../receipt-review-form";

vi.mock("@/common/hooks/use-date-locale", () => ({
  useDateLocale: () => enUS,
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerData: {
      options: {
        nameAssets: "Assets",
        nameLiabilities: "Liabilities",
        nameExpenses: "Expenses",
      },
    },
  }),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: ({ value }: { value: string }) => (
    <input aria-label="Account" value={value} readOnly />
  ),
  CurrencyCombobox: ({ value }: { value: string }) => (
    <input aria-label="Currency" value={value} readOnly />
  ),
}));

const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Pacific/Apia";
});
afterAll(() => {
  process.env.TZ = originalTz;
});

/** A receipt dated on a day Pacific/Apia skipped keeps that day (w4/m32). */
describe("ReceiptReviewForm date prefill", () => {
  it("keeps 2011-12-30 through display, preview and submission", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ReceiptReviewForm
        ledgerId="owner/ledger"
        parsed={{
          date: "2011-12-30",
          payee: "Cafe",
          description: "Coffee",
          amount: -4.5,
          sourceAccount: "Assets:Cash",
          targetAccount: "Expenses:Food",
        }}
        primaryCurrency="USD"
        onSubmit={onSubmit}
        onReset={() => {}}
      />,
    );

    expect(container.querySelector("#receipt-date")).toHaveValue("12/30/2011");
    expect(screen.getByText(/^2011-12-30 \* "Cafe"/)).toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Record Transaction" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0].date).toBe("2011-12-30");
  });
});
