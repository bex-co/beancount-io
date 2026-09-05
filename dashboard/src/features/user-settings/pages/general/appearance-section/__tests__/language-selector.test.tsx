import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSelector } from "../language-selector";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { LANGUAGE_NAMES } from "@/i18n/config";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.unmock("@/i18n");

function setup() {
  const localization = createLocalization();
  render(
    <LocalizationProvider localization={localization}>
      <LanguageSelector />
    </LocalizationProvider>,
  );
  return localization;
}

describe("LanguageSelector", () => {
  beforeEach(() => localStorage.clear());

  it("offers every supported language and starts collapsed in English", async () => {
    setup();
    expect(screen.getByRole("combobox")).toHaveTextContent("English");
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await userEvent.click(screen.getByRole("combobox"));
    for (const name of Object.values(LANGUAGE_NAMES)) {
      expect(
        screen.getByRole("button", { name, exact: true }),
      ).toBeInTheDocument();
    }
  });

  it("loads a selected locale before updating and persisting the selection", async () => {
    // Transform the real module before the interaction; the instance still
    // has only English resources until the selection loads it.
    await import("@/i18n/locales/fr");
    const localization = setup();
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(
      screen.getByRole("button", { name: "Français", exact: true }),
    );
    await waitFor(() =>
      expect(screen.getByRole("combobox")).toHaveTextContent("Français"),
    );
    expect(localization.i18n.hasResourceBundle("fr", "translation")).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith("i18nextLng", "fr");
    expect(document.cookie).toContain("i18nextLng=fr");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-busy", "false");
  });
});
