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
    const { localization } = await setup();
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

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(
      screen.getByRole("button", { name: "English", exact: true }),
    );
    await waitFor(() =>
      expect(screen.getByRole("combobox")).toHaveTextContent("English"),
    );
    expect(window.location.search).toMatch(/[?&]lang=en(?:&|$)/);
    expect(localization.i18n.language).toBe("en");
  });
});
