import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CurrencySuggestionHint } from "../currency-suggestion-hint";

describe("CurrencySuggestionHint (ADR026)", () => {
  it("names the source while the suggestion is the value, and offers the time zone's currency", () => {
    const onPick = vi.fn();
    render(
      <CurrencySuggestionHint
        suggestion={{
          currency: "USD",
          source: "region",
          timeZoneCandidate: "CNY",
        }}
        value="usd"
        chosen={false}
        onPick={onPick}
      />,
    );
    expect(screen.getByTestId("ledger-currency-source")).toHaveTextContent(
      "From your browser region",
    );
    fireEvent.click(screen.getByTestId("ledger-currency-candidate"));
    expect(onPick).toHaveBeenCalledWith("CNY");
  });

  it("drops the label once the customer chose, and the candidate once it is the value", () => {
    render(
      <CurrencySuggestionHint
        suggestion={{
          currency: "USD",
          source: "region",
          timeZoneCandidate: "CNY",
        }}
        value="CNY"
        chosen
        onPick={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("ledger-currency-source")).toBeNull();
    expect(screen.queryByTestId("ledger-currency-candidate")).toBeNull();
  });

  it("labels a saved preference and leaves the USD fallback unlabelled", () => {
    const { rerender } = render(
      <CurrencySuggestionHint
        suggestion={{ currency: "EUR", source: "saved" }}
        value="EUR"
        chosen={false}
        onPick={vi.fn()}
      />,
    );
    expect(screen.getByTestId("ledger-currency-source")).toHaveTextContent(
      "From your saved preference",
    );
    rerender(
      <CurrencySuggestionHint
        suggestion={{ currency: "USD", source: "fallback" }}
        value="USD"
        chosen={false}
        onPick={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("ledger-currency-source")).toBeNull();
  });
});
