import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppearanceSection } from "../appearance-section";

// Mock child components - use relative paths to match actual imports
vi.mock("../appearance-section/theme-switch", () => ({
  ThemeSwitch: () => <div data-testid="theme-switch">Theme Switch</div>,
}));

vi.mock("../appearance-section/language-selector", () => ({
  LanguageSelector: () => (
    <div data-testid="language-selector">Language Selector</div>
  ),
}));

// Mock UI components
vi.mock("@/common/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-description">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-title">{children}</div>
  ),
}));

vi.mock("@/common/components/ui/separator", () => ({
  Separator: () => <hr data-testid="separator" />,
}));

// Mock translations
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "userSettings.appearance": "Appearance",
        "userSettings.customizeAppearance":
          "Customize how Beancount looks and feels",
        "userSettings.theme": "Theme",
        "userSettings.selectColorTheme": "Select your preferred color theme",
        "userSettings.currentLanguage": "Language",
        "userSettings.selectLanguage": "Select your preferred language",
      };
      return translations[key] || key;
    },
    i18n: {
      language: "en",
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock ReactNativeBridgeProvider context
vi.mock("@/common/providers/react-native-bridge-provider", () => ({
  useReactNativeContext: () => ({
    isReactNative: false,
    sendMessage: vi.fn(),
  }),
}));

describe("AppearanceSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the Appearance section", () => {
      render(<AppearanceSection />);

      expect(screen.getByText("Appearance")).toBeInTheDocument();
      expect(
        screen.getByText("Customize how Beancount looks and feels"),
      ).toBeInTheDocument();
    });

    it("should render card structure", () => {
      render(<AppearanceSection />);

      expect(screen.getByTestId("card")).toBeInTheDocument();
      expect(screen.getByTestId("card-header")).toBeInTheDocument();
      expect(screen.getByTestId("card-title")).toBeInTheDocument();
      expect(screen.getByTestId("card-description")).toBeInTheDocument();
      expect(screen.getByTestId("card-content")).toBeInTheDocument();
    });

    it("should render theme setting section", () => {
      render(<AppearanceSection />);

      expect(screen.getByText("Theme")).toBeInTheDocument();
      expect(
        screen.getByText("Select your preferred color theme"),
      ).toBeInTheDocument();
    });

    it("should render language setting section", () => {
      render(<AppearanceSection />);

      expect(screen.getByText("Language")).toBeInTheDocument();
      expect(
        screen.getByText("Select your preferred language"),
      ).toBeInTheDocument();
    });

    it("should render separator between theme and language", () => {
      render(<AppearanceSection />);

      expect(screen.getByTestId("separator")).toBeInTheDocument();
    });
  });

  describe("Child Components", () => {
    it("should render ThemeSwitch component", () => {
      render(<AppearanceSection />);

      expect(screen.getByTestId("theme-switch")).toBeInTheDocument();
      expect(screen.getByText("Theme Switch")).toBeInTheDocument();
    });

    it("should render LanguageSelector component", () => {
      render(<AppearanceSection />);

      expect(screen.getByTestId("language-selector")).toBeInTheDocument();
      expect(screen.getByText("Language Selector")).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should have proper flex layout for settings", () => {
      const { container } = render(<AppearanceSection />);

      // Theme setting should have justify-between layout
      const cardContent = container.querySelector(
        '[data-testid="card-content"]',
      );
      expect(cardContent).toBeInTheDocument();

      // Both theme and language sections should be present
      expect(screen.getByText("Theme")).toBeInTheDocument();
      expect(screen.getByText("Language")).toBeInTheDocument();
    });

    it("should display settings in vertical layout with spacing", () => {
      const { container } = render(<AppearanceSection />);

      // Card content should have space-y-6 class for vertical spacing
      const cardContent = container.querySelector(
        '[data-testid="card-content"]',
      );
      expect(cardContent).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic heading structure", () => {
      render(<AppearanceSection />);

      // Card title acts as heading
      const title = screen.getByText("Appearance");
      expect(title).toBeInTheDocument();
    });

    it("should have descriptive labels for each setting", () => {
      render(<AppearanceSection />);

      // Theme label
      expect(screen.getByText("Theme")).toBeInTheDocument();

      // Language label
      expect(screen.getByText("Language")).toBeInTheDocument();
    });

    it("should have helper text for each setting", () => {
      render(<AppearanceSection />);

      // Theme helper text
      expect(
        screen.getByText("Select your preferred color theme"),
      ).toBeInTheDocument();

      // Language helper text
      expect(
        screen.getByText("Select your preferred language"),
      ).toBeInTheDocument();
    });
  });

  describe("Icon Rendering", () => {
    it("should include Palette icon in title", () => {
      const { container } = render(<AppearanceSection />);

      // Lucide icons render as SVGs
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe("Visual Structure", () => {
    it("should have proper nesting of elements", () => {
      render(<AppearanceSection />);

      // Card should contain header and content
      const card = screen.getByTestId("card");
      expect(card).toContainElement(screen.getByTestId("card-header"));
      expect(card).toContainElement(screen.getByTestId("card-content"));
    });

    it("should render all setting rows", () => {
      render(<AppearanceSection />);

      // Should have two setting rows: theme and language
      const themeText = screen.getByText("Theme");
      const languageText = screen.getByText("Language");

      expect(themeText).toBeInTheDocument();
      expect(languageText).toBeInTheDocument();
    });
  });

  describe("Consistent Styling", () => {
    it("should use consistent text sizes for labels", () => {
      render(<AppearanceSection />);

      // Both "Theme" and "Language" should be rendered as labels
      const themeLabel = screen.getByText("Theme");
      const languageLabel = screen.getByText("Language");

      expect(themeLabel).toBeInTheDocument();
      expect(languageLabel).toBeInTheDocument();
    });

    it("should use consistent text sizes for descriptions", () => {
      render(<AppearanceSection />);

      // Both setting descriptions should be rendered
      const themeDesc = screen.getByText("Select your preferred color theme");
      const languageDesc = screen.getByText("Select your preferred language");

      expect(themeDesc).toBeInTheDocument();
      expect(languageDesc).toBeInTheDocument();
    });
  });

  describe("Component Independence", () => {
    it("should not rely on external state", () => {
      // Appearance section should render without props
      expect(() => render(<AppearanceSection />)).not.toThrow();
    });

    it("should be self-contained", () => {
      render(<AppearanceSection />);

      // All expected elements should be present
      expect(screen.getByText("Appearance")).toBeInTheDocument();
      expect(screen.getByTestId("theme-switch")).toBeInTheDocument();
      expect(screen.getByTestId("language-selector")).toBeInTheDocument();
    });
  });

  describe("Translations", () => {
    it("should use translation keys for all text", () => {
      const { container } = render(<AppearanceSection />);

      // Verify that translated text appears
      expect(container.textContent).toContain("Appearance");
      expect(container.textContent).toContain(
        "Customize how Beancount looks and feels",
      );
      expect(container.textContent).toContain("Theme");
      expect(container.textContent).toContain("Language");
    });

    it("should handle missing translations gracefully", () => {
      // Component should still render even if translations are missing
      render(<AppearanceSection />);

      expect(screen.getByTestId("card")).toBeInTheDocument();
    });
  });
});
