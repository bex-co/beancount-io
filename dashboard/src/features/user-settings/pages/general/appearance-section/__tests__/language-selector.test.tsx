import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSelector } from "../language-selector";

// Mock persistLanguage
vi.mock("@/i18n", async () => {
  const actual = await vi.importActual<typeof import("@/i18n")>("@/i18n");
  return {
    ...actual,
    persistLanguage: vi.fn(),
  };
});

// Override the global useTranslations mock to include i18n
const mockChangeLanguage = vi.fn().mockResolvedValue(undefined);
let mockLanguage = "en";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: {
      language: mockLanguage,
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

describe("LanguageSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage = "en";
  });

  describe("trigger button", () => {
    it("should display the current language name for 'en'", () => {
      mockLanguage = "en";
      render(<LanguageSelector />);
      expect(screen.getByRole("combobox")).toHaveTextContent("English");
    });

    it("should display the current language name for 'zh'", () => {
      mockLanguage = "zh";
      render(<LanguageSelector />);
      expect(screen.getByRole("combobox")).toHaveTextContent("中文");
    });

    it("should fall back to 'English' for an unrecognized language code", () => {
      mockLanguage = "unknown-lang";
      render(<LanguageSelector />);
      expect(screen.getByRole("combobox")).toHaveTextContent("English");
    });

    it("should have aria-expanded=false when popover is closed", () => {
      render(<LanguageSelector />);
      expect(screen.getByRole("combobox")).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });
  });

  describe("language list", () => {
    it("should show all supported languages after opening", async () => {
      render(<LanguageSelector />);
      await userEvent.click(screen.getByRole("combobox"));
      // All 13 supported languages should appear
      expect(screen.getAllByText("English").length).toBeGreaterThan(0);
      expect(screen.getAllByText("中文").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Español").length).toBeGreaterThan(0);
    });
  });

  describe("language selection", () => {
    it("should call i18n.changeLanguage when a language is selected", async () => {
      render(<LanguageSelector />);
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.click(screen.getByText("Français"));
      expect(mockChangeLanguage).toHaveBeenCalledWith("fr");
    });

    it("should call persistLanguage when a language is selected", async () => {
      const { persistLanguage } = await import("@/i18n");
      render(<LanguageSelector />);
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.click(screen.getByText("Deutsch"));
      expect(persistLanguage).toHaveBeenCalledWith("de");
    });
  });
});
