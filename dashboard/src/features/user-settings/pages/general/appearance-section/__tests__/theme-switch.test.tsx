import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render as renderComponent,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";
import * as catalogs from "@/i18n/locales";
import { ThemeSwitch } from "../theme-switch";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

// Mock useTheme hook
const mockSetTheme = vi.fn();
let mockTheme = "system";

vi.mock("@/common/hooks/use-theme", () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

function renderTheme(localization = createLocalization()) {
  return renderComponent(<ThemeSwitch />, {
    wrapper: ({ children }) => (
      <LocalizationProvider localization={localization}>
        {children}
      </LocalizationProvider>
    ),
  });
}

describe("ThemeSwitch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = "system";
  });

  describe("trigger button label", () => {
    it("should display 'System' label when theme is 'system'", () => {
      mockTheme = "system";
      renderTheme();
      expect(
        screen.getByRole("button", { name: "Theme System" }),
      ).toHaveTextContent("System");
    });

    it("should display 'Light' label when theme is 'light'", () => {
      mockTheme = "light";
      renderTheme();
      expect(
        screen.getByRole("button", { name: "Theme Light" }),
      ).toHaveTextContent("Light");
    });

    it("should display 'Dark' label when theme is 'dark'", () => {
      mockTheme = "dark";
      renderTheme();
      expect(
        screen.getByRole("button", { name: "Theme Dark" }),
      ).toHaveTextContent("Dark");
    });

    it.each(SUPPORTED_LANGUAGES)(
      "includes the localized Theme and choice in %s",
      async (language) => {
        const localization = createLocalization();
        await localization.changeLanguage(language);
        renderTheme(localization);
        const catalog = catalogs[language];
        expect(
          screen.getByRole("button", {
            name: `${catalog["userSettings.theme"]} ${catalog["userSettings.system"]}`,
          }),
        ).toBeVisible();
      },
    );
  });

  describe("dropdown menu items", () => {
    it("exposes three radio items with only System checked", async () => {
      renderTheme();
      await userEvent.click(screen.getByRole("button"));
      const menu = within(await screen.findByRole("menu"));
      expect(menu.getAllByRole("menuitemradio")).toHaveLength(3);
      expect(menu.getAllByRole("menuitemradio", { checked: true })).toEqual([
        menu.getByRole("menuitemradio", { name: "System" }),
      ]);
      expect(
        menu
          .getByRole("menuitemradio", { name: "System" })
          .querySelector("svg.lucide-check"),
      ).toBeInTheDocument();
    });

    it("should call setTheme('light') when Light option is clicked", async () => {
      renderTheme();
      await userEvent.click(screen.getByRole("button"));
      const lightItems = screen.getAllByText("Light");
      await userEvent.click(lightItems[lightItems.length - 1]);
      expect(mockSetTheme).toHaveBeenCalledWith("light");
    });

    it("should call setTheme('dark') when Dark option is clicked", async () => {
      renderTheme();
      await userEvent.click(screen.getByRole("button"));
      const darkItems = screen.getAllByText("Dark");
      await userEvent.click(darkItems[darkItems.length - 1]);
      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });

    it("should call setTheme('system') when System option is clicked", async () => {
      mockTheme = "light";
      renderTheme();
      await userEvent.click(screen.getByRole("button"));
      const systemItems = screen.getAllByText("System");
      await userEvent.click(systemItems[systemItems.length - 1]);
      expect(mockSetTheme).toHaveBeenCalledWith("system");
    });
  });

  describe("icons", () => {
    it("should render an SVG icon in the trigger button", () => {
      mockTheme = "system";
      const { container } = renderTheme();
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });
  });
});
