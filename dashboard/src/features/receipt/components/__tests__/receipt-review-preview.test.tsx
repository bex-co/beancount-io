import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { enUS } from "react-day-picker/locale/en-US";
import { ReceiptReviewForm } from "../receipt-review-form";

vi.mock("@/common/hooks/use-date-locale", () => ({
  useDateLocale: () => enUS,
}));
vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: ({ value }: { value: string }) => (
    <input aria-label="Account" value={value} readOnly />
  ),
  CurrencyCombobox: ({ value }: { value: string }) => (
    <input aria-label="Currency" value={value} readOnly />
  ),
}));

function renderReview() {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <ReceiptReviewForm
      ledgerId="owner/ledger"
      parsed={{
        date: "2026-08-01",
        payee: "Cafe",
        description: "Coffee",
        amount: -12.5,
        sourceAccount: "Assets:Cash",
        targetAccount: "Expenses:Food",
      }}
      primaryCurrency="USD"
      onSubmit={onSubmit}
      onReset={() => {}}
    />,
  );
  const header = () =>
    view.container.querySelector("pre")?.textContent?.split("\n")[0];
  return { onSubmit, header };
}

/** The Preview writes the reader's text as valid Beancount strings (w4/981). */
describe("ReceiptReviewForm preview strings", () => {
  it("escapes quotes and backslashes, and submits the text exactly as typed", async () => {
    const { onSubmit, header } = renderReview();
    fireEvent.change(screen.getByRole("textbox", { name: "Payee" }), {
      target: { value: 'qa Bob "Cafe"' },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
      target: { value: "qa folder C:\\temp\\receipt" },
    });

    await waitFor(() =>
      expect(header()).toBe(
        '2026-08-01 * "qa Bob \\"Cafe\\"" "qa folder C:\\\\temp\\\\receipt"',
      ),
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Record Transaction" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      payee: 'qa Bob "Cafe"',
      description: "qa folder C:\\temp\\receipt",
    });
  });

  it("keeps plain and Unicode text readable", async () => {
    const { header } = renderReview();
    fireEvent.change(screen.getByRole("textbox", { name: "Payee" }), {
      target: { value: "Café Zürich 日本" },
    });
    await waitFor(() =>
      expect(header()).toBe('2026-08-01 * "Café Zürich 日本" "Coffee"'),
    );
  });
});
