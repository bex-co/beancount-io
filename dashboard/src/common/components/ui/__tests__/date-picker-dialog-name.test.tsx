import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { de as deLocale, en } from "@/i18n/locales";
import { DatePicker } from "../date-picker";

/**
 * The calendar popup is a dialog; it had no name, so a reader met an unnamed
 * dialog around a named month grid (w4/1011). It is named in the app's
 * language, with the real catalog.
 */
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

async function renderIn(lng: "en" | "de", value?: string) {
  const i18n = createInstance();
  await i18n.init({
    lng,
    fallbackLng: "en",
    resources: { en: { translation: en }, de: { translation: deLocale } },
    interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <DatePicker id="date" value={value} onChange={vi.fn()} />
    </I18nextProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("DatePicker calendar dialog name", () => {
  it.each([
    ["en", "Select date", "2000-02-28"],
    ["en", "Select date", undefined],
    ["de", "Datum auswählen", "2000-02-28"],
  ] as const)(
    "names the %s calendar %s (value %s)",
    async (lng, name, value) => {
      const user = userEvent.setup();
      await renderIn(lng, value);

      const trigger = screen.getByRole("button", { name });
      trigger.focus();
      await user.keyboard("{Enter}");

      const dialog = await screen.findByRole("dialog", { name });
      expect(dialog).toContainElement(screen.getByRole("grid"));
      // Escape closes only the calendar and returns to its trigger.
      await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(trigger).toHaveFocus();
    },
  );

  it("is named when opened by pointer too", async () => {
    const user = userEvent.setup();
    await renderIn("en");
    await user.click(screen.getByRole("button", { name: "Select date" }));
    expect(
      await screen.findByRole("dialog", { name: "Select date" }),
    ).toBeInTheDocument();
  });
});
