import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PresentationCurrencySelect } from "../presentation-currency-select";

// jsdom has no Pointer Capture API; Radix UI's Select needs it to open on
// click. Polyfill as no-ops for this file only so the order test can drive
// the real interaction instead of asserting on `value` alone.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
});

afterAll(() => {
  delete (Element.prototype as { hasPointerCapture?: unknown })
    .hasPointerCapture;
  delete (Element.prototype as { setPointerCapture?: unknown })
    .setPointerCapture;
  delete (Element.prototype as { releasePointerCapture?: unknown })
    .releasePointerCapture;
});

describe("PresentationCurrencySelect", () => {
  it("lists Own currencies, every operating currency in order, then the two keywords", async () => {
    const user = userEvent.setup();
    render(
      <PresentationCurrencySelect
        value="at_cost"
        operatingCurrencies={["USD", "IRT", "EUR"]}
        onValueChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    const labels = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(labels).toEqual([
      "Own currencies",
      "Converted to USD",
      "Converted to IRT",
      "Converted to EUR",
      "At Market Value",
      "Units",
    ]);
  });

  it("shows Own currencies for at_cost", () => {
    render(
      <PresentationCurrencySelect
        value="at_cost"
        operatingCurrencies={["USD", "IRT"]}
        onValueChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Own currencies")).toBeInTheDocument();
  });

  it("shows the converted-to label for a currency value", () => {
    render(
      <PresentationCurrencySelect
        value="IRT"
        operatingCurrencies={["USD", "IRT"]}
        onValueChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Converted to IRT/)).toBeInTheDocument();
  });

  it("shows At market value / Units for the two keywords", () => {
    const { rerender } = render(
      <PresentationCurrencySelect
        value="at_value"
        operatingCurrencies={["USD"]}
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getByText("At Market Value")).toBeInTheDocument();

    rerender(
      <PresentationCurrencySelect
        value="units"
        operatingCurrencies={["USD"]}
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Units")).toBeInTheDocument();
  });
});
