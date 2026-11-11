import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { ExactAmountInput } from "../exact-amount-input";

/**
 * Typing `4,50` in a native number field in an English browser booked 450,
 * silently (w2/120). The field now hands the form the decimal the reader
 * meant, says so when it differs from the text, and asks when it cannot tell.
 */
vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");

async function field(language: string) {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const sent: string[] = [];
  function Form() {
    const [value, setValue] = useState("");
    return (
      <ExactAmountInput
        aria-label="Amount"
        value={value}
        onChange={(event) => {
          sent.push(event.target.value);
          setValue(event.target.value);
        }}
      />
    );
  }
  render(
    <LocalizationProvider localization={localization}>
      <Form />
    </LocalizationProvider>,
  );
  const input = screen.getByRole("spinbutton", { name: "Amount" });
  const type = (text: string) =>
    fireEvent.change(input, { target: { value: text } });
  return { input, sent, type };
}

describe("ExactAmountInput reads typed separators", () => {
  it("records 4,50 as 4.50 in German and says so", async () => {
    const { input, sent, type } = await field("de");
    type("4,50");
    expect(sent.at(-1)).toBe("4.50");
    expect(input).toHaveValue("4,50");
    expect(input).toHaveAccessibleDescription("Wird als 4.50 gebucht");
  });

  it("records 4,50 as 4.50 in English too, never as 450", async () => {
    const { sent, type, input } = await field("en");
    type("4,50");
    expect(sent.at(-1)).toBe("4.50");
    expect(input).toHaveAccessibleDescription("Recorded as 4.50");
  });

  it("records 1.234,56 as 1234.56 in German", async () => {
    const { sent, type } = await field("de");
    type("1.234,56");
    expect(sent.at(-1)).toBe("1234.56");
  });

  it("asks about 4,500 in German instead of guessing", async () => {
    const { sent, type, input } = await field("de");
    type("4,500");
    // The form gets the text, which it refuses, rather than a number.
    expect(sent.at(-1)).toBe("4,500");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "„4,500“ kann 4500 oder 4.500 bedeuten. Geben Sie 4500 oder 4.500 ein.",
    );
  });

  it.each(["-12.50", "9007199254740993.01"])(
    "keeps %s as typed, with nothing to explain",
    async (text) => {
      const { sent, type, input } = await field("de");
      type(text);
      expect(sent.at(-1)).toBe(text);
      expect(input).toHaveValue(text);
      expect(input).not.toHaveAttribute("aria-describedby");
    },
  );

  it("steps the typed amount exactly from what it records", async () => {
    const { sent, type, input } = await field("de");
    type("4,50");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(sent.at(-1)).toBe("5.50");
    expect(input).toHaveValue("5.50");
  });
});
