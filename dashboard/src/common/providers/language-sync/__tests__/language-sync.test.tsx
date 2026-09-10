import { act, render, screen, waitFor } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { LanguageSync } from "../index";
import { useChangeLanguage } from "@/common/hooks/use-change-language";
import { useTranslation } from "react-i18next";
import { buildUrlWithLanguage } from "@/i18n/sync-language-search-param";

vi.unmock("react-i18next");
vi.unmock("@/i18n");

function Probe() {
  const { i18n } = useTranslation();
  const { changeLanguage } = useChangeLanguage();
  return (
    <div>
      <div data-testid="lang">{i18n.language}</div>
      <button type="button" onClick={() => void changeLanguage("en")}>
        pick-en
      </button>
      <LanguageSync />
    </div>
  );
}

async function mountLanguageHarness(initialEntry: string) {
  const localization = createLocalization();
  if (initialEntry.includes("lang=zh")) {
    await localization.changeLanguage("zh");
  }

  window.history.replaceState(window.history.state, "", initialEntry);

  const rootRoute = createRootRoute({
    component: () => (
      <LocalizationProvider localization={localization}>
        <Probe />
      </LocalizationProvider>
    ),
  });

  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });

  await router.load();
  render(<RouterProvider router={router} />);

  await waitFor(() => {
    expect(screen.getByTestId("lang")).toBeInTheDocument();
  });

  return { router, localization };
}

describe("buildUrlWithLanguage", () => {
  it("sets lang while preserving other params and returns null when unchanged", () => {
    expect(buildUrlWithLanguage("/report?time=2016&lang=zh", "en")).toBe(
      "/report?time=2016&lang=en",
    );
    expect(buildUrlWithLanguage("/report?time=2016&lang=en", "en")).toBeNull();
  });
});

describe("LanguageSync with URL lang", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("lets an explicit English choice win over an existing ?lang=zh", async () => {
    const { router, localization } = await mountLanguageHarness(
      "/settings/general?lang=zh",
    );

    expect(screen.getByTestId("lang")).toHaveTextContent("zh");
    expect(router.state.location.searchStr).toContain("lang=zh");

    await act(async () => {
      screen.getByRole("button", { name: "pick-en" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("lang")).toHaveTextContent("en");
    });
    expect(localization.i18n.language).toBe("en");
    expect(localStorage.setItem).toHaveBeenCalledWith("i18nextLng", "en");
    expect(window.location.search).toMatch(/[?&]lang=en(?:&|$)/);

    await act(async () => {
      await Promise.resolve();
    });
    expect(localization.i18n.language).toBe("en");
    expect(window.location.search).toMatch(/[?&]lang=en(?:&|$)/);
  });
});
