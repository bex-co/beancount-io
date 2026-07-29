import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock DOM-specific globals only in DOM environments
if (typeof window !== "undefined") {
  // Mock localStorage with proper typing
  const localStorageMock: Storage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  };

  global.localStorage = localStorageMock;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock scrollIntoView
  if (typeof Element !== "undefined") {
    Element.prototype.scrollIntoView = vi.fn();
  }
}

// Mock SEO components (metadata-only, no functional impact on tests)
vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));

// Mock monaco-editor
vi.mock("monaco-editor", () => ({
  default: {},
  languages: {
    FoldingRangeKind: {
      Region: 1,
    },
  },
  editor: {},
}));

// Global translation mock - returns English translations with parameter replacement
vi.mock("@/common/hooks/use-translations", async () => {
  const { en } = await import("@/i18n/locales");

  return {
    useTranslations: () => ({
      t: (key: string, params?: Record<string, string | number>) => {
        // Get the translation entry from English translations
        const entry = en[key];

        // Extract message from structured format or use key as fallback
        let text: string;
        if (typeof entry === "object" && entry !== null && "message" in entry) {
          text = (entry as { message: string }).message;
        } else if (typeof entry === "string") {
          text = entry;
        } else {
          text = key;
        }

        // Handle parameter replacement for dynamic strings (single braces)
        if (params) {
          Object.entries(params).forEach(([param, value]) => {
            text = text.replace(
              new RegExp(`\\{${param}\\}`, "g"),
              String(value),
            );
          });
        }
        return text;
      },
      i18n: mockI18n,
    }),
  };
});

// Mock i18n instance
const mockI18n = {
  language: "en",
  changeLanguage: vi.fn((lang: string) => {
    mockI18n.language = lang;
    return Promise.resolve();
  }),
  on: vi.fn(),
  off: vi.fn(),
  options: {
    supportedLngs: [
      "en",
      "zh",
      "es",
      "fr",
      "de",
      "pt",
      "ru",
      "nl",
      "bg",
      "ca",
      "fa",
      "sk",
      "uk",
    ],
  },
};

// Mock the i18n module
vi.mock("@/i18n", () => ({
  default: mockI18n,
  SUPPORTED_LANGUAGES: [
    "en",
    "zh",
    "es",
    "fr",
    "de",
    "pt",
    "ru",
    "nl",
    "bg",
    "ca",
    "fa",
    "sk",
    "uk",
  ],
  LANGUAGE_NAMES: {
    en: "English",
    zh: "中文",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    pt: "Português",
    ru: "Русский",
    nl: "Nederlands",
    bg: "Български",
    ca: "Català",
    fa: "فارسی",
    sk: "Slovenčina",
    uk: "Українська",
  },
}));

// Mock react-i18next for components using useTranslation
vi.mock("react-i18next", async () => {
  const { en } = await import("@/i18n/locales");

  return {
    useTranslation: () => ({
      t: (key: string, params?: Record<string, string | number>) => {
        // Get the translation entry from English translations
        const entry = en[key];

        // Extract message from structured format or use key as fallback
        let text: string;
        if (typeof entry === "object" && entry !== null && "message" in entry) {
          text = (entry as { message: string }).message;
        } else if (typeof entry === "string") {
          text = entry;
        } else {
          text = key;
        }

        // Handle parameter replacement for dynamic strings (single braces)
        if (params) {
          Object.entries(params).forEach(([param, value]) => {
            text = text.replace(
              new RegExp(`\\{${param}\\}`, "g"),
              String(value),
            );
          });
        }
        return text;
      },
      i18n: mockI18n,
    }),
    Trans: ({ children }: { children: React.ReactNode }) => children,
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: {
      type: "3rdParty",
      init: vi.fn(),
    },
  };
});
