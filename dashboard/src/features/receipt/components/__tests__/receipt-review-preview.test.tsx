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

/** The amount field accepts the precision the review's schema does (w4/982). */
describe("ReceiptReviewForm amount precision", () => {
  it.each(["12.345", "0.00000001", "12.34", "12.50"])(
    "lets %s through native validation and records it exactly",
    async (amount) => {
      const { onSubmit } = renderReview();
      const input = screen.getByRole("spinbutton", { name: "Amount" });
      fireEvent.change(input, { target: { value: amount } });
      expect((input as HTMLInputElement).validity.stepMismatch).toBe(false);
      expect((input as HTMLInputElement).validity.valid).toBe(true);

      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Record Transaction" }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0].amount).toBe(amount);
    },
  );

  it.each(["0", "-1"])("still refuses %s", async (amount) => {
    const { onSubmit } = renderReview();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Amount" }), {
      target: { value: amount },
    });
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Record Transaction" }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

/** The amount's arrow keys step exactly and stop at zero (w4/1021). */
describe("Receipt amount stepping", () => {
  it("records an exactly stepped amount and does not step below zero", async () => {
    const { onSubmit } = renderReview();
    const input = screen.getByRole("spinbutton", {
      name: "Amount",
    }) as HTMLInputElement;
    const user = userEvent.setup();

    fireEvent.change(input, { target: { value: "0.5" } });
    input.focus();
    await user.keyboard("{ArrowDown}");
    expect(input.value).toBe("0");

    fireEvent.change(input, { target: { value: "9007199254740993.01" } });
    input.focus();
    await user.keyboard("{ArrowUp}");
    expect(input.value).toBe("9007199254740994.01");
    await user.click(
      screen.getByRole("button", { name: "Record Transaction" }),
    );
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0].amount).toBe("9007199254740994.01");
  });
});
