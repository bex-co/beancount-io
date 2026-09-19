/**
 * The interval and conversion selectors must be identifiable by name.
 *
 * Their trigger shows the selected value, so the localized placeholder never
 * renders once a value exists — the control ended up in the accessibility tree
 * with a value like "Monthly" or "At Cost" and no name at all, leaving a reader
 * no way to tell which one changes the period and which changes valuation.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { IntervalSelect } from "../interval-select";
import { ConversionSelect } from "../conversion-select";

// A non-English locale, to prove the name is translated rather than hardcoded.
const DE = {
  "component.intervalSelect.placeholder": "Zeitraum auswählen",
  "component.conversionSelect.placeholder": "Umrechnung auswählen",
};
let locale: Record<string, string> = {};

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => locale[key] ?? key }),
}));

describe("interval select", () => {
  it.each(["monthly", "yearly", "daily"])(
    "keeps its name with %s selected",
    (value) => {
      cleanup();
      locale = {};
      render(<IntervalSelect value={value as never} onValueChange={vi.fn()} />);
      expect(
        screen.getByRole("combobox", {
          name: "component.intervalSelect.placeholder",
        }),
      ).toBeInTheDocument();
    },
  );

  it("uses the localized name", () => {
    cleanup();
    locale = DE;
    render(
      <IntervalSelect value={"monthly" as never} onValueChange={vi.fn()} />,
    );
    expect(
      screen.getByRole("combobox", { name: "Zeitraum auswählen" }),
    ).toBeInTheDocument();
  });

  it("lets a caller name it something more specific", () => {
    cleanup();
    locale = {};
    render(
      <IntervalSelect
        value={"monthly" as never}
        onValueChange={vi.fn()}
        placeholder="Chart interval"
      />,
    );
    expect(
      screen.getByRole("combobox", { name: "Chart interval" }),
    ).toBeInTheDocument();
  });
});

describe("conversion select", () => {
  it.each(["at_cost", "at_value", "units"])(
    "keeps its name with %s selected",
    (value) => {
      cleanup();
      locale = {};
      render(
        <ConversionSelect value={value as never} onValueChange={vi.fn()} />,
      );
      expect(
        screen.getByRole("combobox", {
          name: "component.conversionSelect.placeholder",
        }),
      ).toBeInTheDocument();
    },
  );

  it("uses the localized name", () => {
    cleanup();
    locale = DE;
    render(
      <ConversionSelect value={"at_cost" as never} onValueChange={vi.fn()} />,
    );
    expect(
      screen.getByRole("combobox", { name: "Umrechnung auswählen" }),
    ).toBeInTheDocument();
  });

  it("names the two controls differently", () => {
    cleanup();
    locale = DE;
    render(
      <>
        <IntervalSelect value={"monthly" as never} onValueChange={vi.fn()} />
        <ConversionSelect value={"at_cost" as never} onValueChange={vi.fn()} />
      </>,
    );
    const names = screen
      .getAllByRole("combobox")
      .map((el) => el.getAttribute("aria-label"));
    expect(new Set(names).size).toBe(names.length);
  });
});
