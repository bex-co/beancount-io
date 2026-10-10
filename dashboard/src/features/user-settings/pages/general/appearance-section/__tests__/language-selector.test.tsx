import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { LanguageSelector } from "../language-selector";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { LANGUAGE_NAMES } from "@/i18n/config";
import en from "@/features/user-settings/locales/en";
import fr from "@/features/user-settings/locales/fr";
import zh from "@/features/user-settings/locales/zh";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.unmock("@/i18n");

async function setup(entry = "/settings/general") {
  const localization = createLocalization();
  const rootRoute = createRootRoute({
    component: () => (
      <LocalizationProvider localization={localization}>
        <LanguageSelector />
      </LocalizationProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [entry] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return { localization, router };
}

describe("LanguageSelector", () => {
  beforeEach(() => localStorage.clear());

  it("offers every supported language and starts collapsed in English", async () => {
    await setup();
    const trigger = screen.getByRole("combobox", {
      name: en["userSettings.currentLanguage"].message,
      exact: true,
    });
    expect(trigger).toHaveTextContent("English");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-busy", "false");
    await userEvent.click(trigger);
    for (const name of Object.values(LANGUAGE_NAMES)) {
      expect(
        screen.getByRole("button", { name, exact: true }),
      ).toBeInTheDocument();
    }
  });

  it("keeps the localized setting name separate from the value and returns keyboard focus after changing the current marker", async () => {
    await import("@/i18n/locales/fr");
    await setup();
    const row = (name: string) =>
      screen.getByRole("button", { name, exact: true });

    const user = userEvent.setup();
    const trigger = screen.getByRole("combobox", {
      name: en["userSettings.currentLanguage"].message,
      exact: true,
    });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(row("English")).toHaveAttribute("aria-current", "true");
    expect(row("Français")).not.toHaveAttribute("aria-current");
    await waitFor(() => expect(row("English")).toHaveFocus());
    await user.tab();
    await user.tab();
    await user.tab();
    expect(row("Français")).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", {
          name: fr["userSettings.currentLanguage"].message,
          exact: true,
        }),
      ).toBe(trigger),
    );
    expect(trigger).toHaveTextContent("Français");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-busy", "false");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(trigger);
    expect(row("Français")).toHaveAttribute("aria-current", "true");
    expect(row("English")).not.toHaveAttribute("aria-current");
  });

  it("loads a selected locale before updating and persisting the selection", async () => {
    // Transform the real module before the interaction; the instance still
    // has only English resources until the selection loads it.
    await import("@/i18n/locales/fr");
    const { localization } = await setup();
    await userEvent.click(
      screen.getByRole("combobox", {
        name: en["userSettings.currentLanguage"].message,
        exact: true,
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Français", exact: true }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", {
          name: fr["userSettings.currentLanguage"].message,
          exact: true,
        }),
      ).toHaveTextContent("Français"),
    );
    expect(localization.i18n.hasResourceBundle("fr", "translation")).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith("i18nextLng", "fr");
    expect(document.cookie).toContain("i18nextLng=fr");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-busy", "false");
  });

  it("replaces an authoritative lang query when the user picks English", async () => {
    const localization = createLocalization();
    await localization.changeLanguage("zh");
    window.history.replaceState(
      window.history.state,
      "",
      "/settings/general?lang=zh",
    );
    const rootRoute = createRootRoute({
      component: () => (
        <LocalizationProvider localization={localization}>
          <LanguageSelector />
        </LocalizationProvider>
      ),
    });
    const router = createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({
        initialEntries: ["/settings/general?lang=zh"],
      }),
    });
    await router.load();
    render(<RouterProvider router={router} />);

    const trigger = screen.getByRole("combobox", {
      name: zh["userSettings.currentLanguage"].message,
      exact: true,
    });
    expect(trigger).toHaveTextContent("中文");
    await userEvent.click(trigger);
    await userEvent.click(
      screen.getByRole("button", { name: "English", exact: true }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", {
          name: en["userSettings.currentLanguage"].message,
          exact: true,
        }),
      ).toHaveTextContent("English"),
    );
    expect(window.location.search).toMatch(/[?&]lang=en(?:&|$)/);
    expect(localization.i18n.language).toBe("en");
  });
});
