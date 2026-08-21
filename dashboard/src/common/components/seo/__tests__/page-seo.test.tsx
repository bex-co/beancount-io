import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { PageSEO } from "../page-seo";

// Mock useTranslations hook
const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  // Simple mock that returns the key with interpolated params for testing
  if (!params) return key;

  let result = key;
  Object.entries(params).forEach(([paramKey, paramValue]) => {
    result = result.replace(`{${paramKey}}`, paramValue);
  });
  return result;
});

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: mockT,
    i18n: { language: "en" },
  }),
}));

// Mock i18n for og:locale
vi.mock("@/i18n", () => ({
  default: {
    language: "en",
  },
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
}));

// Mock locale-map
vi.mock("@/common/lib/seo/locale-map", () => ({
  getOgLocale: vi.fn((lang: string) => {
    const map: Record<string, string> = {
      en: "en_US",
      zh: "zh_CN",
      fr: "fr_FR",
    };
    return map[lang] || "en_US";
  }),
}));

// Mock HreflangLinks to a detectable stub (avoids window issues in tests)
vi.mock("../hreflang-links", () => ({
  HreflangLinks: () => (
    <link data-testid="hreflang" rel="alternate" hrefLang="en" href="/" />
  ),
}));

describe("PageSEO Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.head.innerHTML = "";
  });

  describe("Basic Props", () => {
    it("should render without errors", () => {
      const { container } = render(
        <PageSEO
          titleKey="seo.login.title"
          descriptionKey="seo.login.description"
        />,
      );

      expect(container).toBeTruthy();
    });

    it("should call translation function with titleKey", () => {
      render(
        <PageSEO
          titleKey="seo.login.title"
          descriptionKey="seo.login.description"
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.login.title");
    });

    it("should call translation function for description", () => {
      render(
        <PageSEO
          titleKey="seo.login.title"
          descriptionKey="seo.login.description"
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.login.description");
    });
  });

  describe("Params Interpolation", () => {
    it("should pass params to title translation", () => {
      render(
        <PageSEO
          titleKey="seo.test.title"
          descriptionKey="seo.test.description"
          params={{ testParam: "testValue" }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.test.title", {
        testParam: "testValue",
      });
    });

    it("should pass params to description translation", () => {
      render(
        <PageSEO
          titleKey="seo.test.title"
          descriptionKey="seo.test.description"
          params={{ testParam: "testValue" }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.test.description", {
        testParam: "testValue",
      });
    });

    it("should handle empty params object", () => {
      render(
        <PageSEO
          titleKey="seo.test.title"
          descriptionKey="seo.test.description"
          params={{}}
        />,
      );

      // With empty params, it still passes the params object
      expect(mockT).toHaveBeenCalledWith("seo.test.title", {});
    });

    it("should handle undefined params", () => {
      render(
        <PageSEO
          titleKey="seo.test.title"
          descriptionKey="seo.test.description"
        />,
      );

      // Without params, it's called without the second argument
      expect(mockT).toHaveBeenCalledWith("seo.test.title");
    });

    it("should handle params with special characters", () => {
      render(
        <PageSEO
          titleKey="seo.test.title"
          params={{ special: "test<>&\"'" }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.test.title", {
        special: "test<>&\"'",
      });
    });
  });

  describe("Optional Description", () => {
    it("should not call translation for description when descriptionKey is not provided", () => {
      mockT.mockClear();
      render(<PageSEO titleKey="seo.test.title" />);

      // Should only be called for title, not description
      expect(mockT).toHaveBeenCalledTimes(1);
      expect(mockT).toHaveBeenCalledWith("seo.test.title");
    });

    it("should call translation for description when descriptionKey is provided", () => {
      mockT.mockClear();
      render(
        <PageSEO
          titleKey="seo.test.title"
          descriptionKey="seo.test.description"
        />,
      );

      // Should be called for both title and description
      expect(mockT).toHaveBeenCalledTimes(2);
      expect(mockT).toHaveBeenCalledWith("seo.test.title");
      expect(mockT).toHaveBeenCalledWith("seo.test.description");
    });
  });

  describe("Multiple Renders", () => {
    it("should call translation on each render with different props", () => {
      mockT.mockClear();

      const { rerender } = render(
        <PageSEO
          titleKey="seo.login.title"
          descriptionKey="seo.login.description"
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.login.title");
      expect(mockT).toHaveBeenCalledWith("seo.login.description");

      mockT.mockClear();

      rerender(
        <PageSEO
          titleKey="seo.signUp.title"
          descriptionKey="seo.signUp.description"
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.signUp.title");
      expect(mockT).toHaveBeenCalledWith("seo.signUp.description");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long values in params", () => {
      const longValue = "a".repeat(1000);
      render(
        <PageSEO titleKey="seo.test.title" params={{ long: longValue }} />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.test.title", { long: longValue });
    });

    it("should handle multiple params", () => {
      render(
        <PageSEO
          titleKey="seo.test.title"
          params={{ param1: "value1", param2: "value2", param3: "value3" }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.test.title", {
        param1: "value1",
        param2: "value2",
        param3: "value3",
      });
    });
  });

  describe("Return Value Structure", () => {
    it("should always return a valid React fragment", () => {
      const { container } = render(
        <PageSEO
          titleKey="seo.test.title"
          descriptionKey="seo.test.description"
        />,
      );

      // Component should render without errors
      expect(container).toBeDefined();
    });
  });

  describe("Indexability", () => {
    it("should emit robots noindex and skip hreflang when noIndex is true", () => {
      render(
        <PageSEO
          titleKey="seo.login.title"
          descriptionKey="seo.login.description"
          noIndex
        />,
      );

      expect(
        document.head
          .querySelector('meta[name="robots"]')
          ?.getAttribute("content"),
      ).toBe("noindex, follow");
      expect(
        document.head.querySelector('[data-testid="hreflang"]'),
      ).toBeNull();
    });

    it("should keep hreflang when noIndex is unset", () => {
      render(
        <PageSEO
          titleKey="seo.test.title"
          descriptionKey="seo.test.description"
        />,
      );

      expect(
        document.head.querySelector('meta[name="robots"]'),
      ).toBeNull();
      expect(
        document.head.querySelector('[data-testid="hreflang"]'),
      ).not.toBeNull();
    });
  });
});
