import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { LedgerSEO } from "../ledger-seo";

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

// Mock TanStack Router location (SSR-safe pattern used by HreflangLinks)
vi.mock("@tanstack/react-router", () => ({
  useLocation: vi.fn(() => ({
    pathname: "/ledger/test",
    search: {},
    hash: "",
  })),
}));

// Mock HreflangLinks to a detectable stub (avoids window issues in tests)
vi.mock("../hreflang-links", () => ({
  HreflangLinks: () => (
    <link data-testid="hreflang" rel="alternate" hrefLang="en" href="/" />
  ),
}));

describe("LedgerSEO Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.head.innerHTML = "";
  });

  describe("Basic Props", () => {
    it("should render without errors", () => {
      const { container } = render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
        />,
      );

      expect(container).toBeTruthy();
    });

    it("should call translation function with ledgerName", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="test-ledger"
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerOverview.title", {
        ledgerName: "test-ledger",
      });
    });

    it("should call translation function for description", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerOverview.description", {
        ledgerName: "my-ledger",
      });
    });
  });

  describe("Params Interpolation", () => {
    it("should pass params to title translation", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="my-ledger"
          params={{ accountName: "Assets:Bank" }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.title", {
        ledgerName: "my-ledger",
        accountName: "Assets:Bank",
      });
    });

    it("should pass params to description translation", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="my-ledger"
          params={{ accountName: "Assets:Bank" }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.description", {
        ledgerName: "my-ledger",
        accountName: "Assets:Bank",
      });
    });

    it("should merge ledgerName with additional params", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="my-ledger"
          params={{
            ledgerName: "my-ledger",
            accountName: "Assets:Cash",
          }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.title", {
        ledgerName: "my-ledger",
        accountName: "Assets:Cash",
      });
    });

    it("should handle empty params object", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
          params={{}}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerOverview.title", {
        ledgerName: "my-ledger",
      });
    });

    it("should handle undefined params", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
          params={undefined}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerOverview.title", {
        ledgerName: "my-ledger",
      });
    });

    it("should handle params with special characters", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="my-ledger"
          params={{ accountName: "Expenses:Food&Dining" }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.title", {
        ledgerName: "my-ledger",
        accountName: "Expenses:Food&Dining",
      });
    });

    it("should handle params with colons in account names", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="my-ledger"
          params={{ accountName: "Assets:US:Bank:Checking" }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.title", {
        ledgerName: "my-ledger",
        accountName: "Assets:US:Bank:Checking",
      });
    });
  });

  describe("Custom Description", () => {
    it("should use custom ledgerDescription when provided", () => {
      const customDesc = "Custom ledger description";
      render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
          ledgerDescription={customDesc}
        />,
      );

      // Should not call t for description when custom description is provided
      expect(mockT).toHaveBeenCalledWith("seo.ledgerOverview.title", {
        ledgerName: "my-ledger",
      });
      expect(mockT).not.toHaveBeenCalledWith(
        "seo.ledgerOverview.description",
        expect.anything(),
      );
    });

    it("should use custom description even when params are provided", () => {
      const customDesc = "Custom description";
      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="my-ledger"
          ledgerDescription={customDesc}
          params={{ accountName: "Assets:Bank" }}
        />,
      );

      // Should still call t for title
      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.title", {
        ledgerName: "my-ledger",
        accountName: "Assets:Bank",
      });
      // But not for description
      expect(mockT).not.toHaveBeenCalledWith(
        "seo.ledgerAccount.description",
        expect.anything(),
      );
    });

    it("should fallback to translated description when ledgerDescription is null", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
          ledgerDescription={null}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerOverview.description", {
        ledgerName: "my-ledger",
      });
    });

    it("should fallback to translated description when ledgerDescription is undefined", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
          ledgerDescription={undefined}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerOverview.description", {
        ledgerName: "my-ledger",
      });
    });
  });

  describe("Integration - Account Page", () => {
    it("should properly handle account page with all params", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="my-book"
          params={{
            ledgerName: "my-book",
            accountName: "Assets:Bank",
          }}
        />,
      );

      // Verify title called with both params
      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.title", {
        ledgerName: "my-book",
        accountName: "Assets:Bank",
      });

      // Verify description called with both params
      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.description", {
        ledgerName: "my-book",
        accountName: "Assets:Bank",
      });
    });

    it("should handle complex account names in account page SEO", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="my-ledger"
          params={{
            ledgerName: "my-ledger",
            accountName: "Liabilities:CreditCard:Chase:Freedom",
          }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.title", {
        ledgerName: "my-ledger",
        accountName: "Liabilities:CreditCard:Chase:Freedom",
      });
    });
  });

  describe("Integration - Non-Account Pages", () => {
    it("should properly handle overview page", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-book"
          params={{
            ledgerName: "my-book",
          }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerOverview.title", {
        ledgerName: "my-book",
      });
      expect(mockT).toHaveBeenCalledWith("seo.ledgerOverview.description", {
        ledgerName: "my-book",
      });
    });

    it("should handle multiple different page types", () => {
      const { rerender } = render(
        <LedgerSEO
          titleKey="seo.ledgerBalanceSheet.title"
          descriptionKey="seo.ledgerBalanceSheet.description"
          ledgerName="ledger1"
          params={{ ledgerName: "ledger1" }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerBalanceSheet.title", {
        ledgerName: "ledger1",
      });

      mockT.mockClear();

      rerender(
        <LedgerSEO
          titleKey="seo.ledgerJournal.title"
          descriptionKey="seo.ledgerJournal.description"
          ledgerName="ledger2"
          params={{ ledgerName: "ledger2" }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerJournal.title", {
        ledgerName: "ledger2",
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long account names", () => {
      const longAccountName =
        "Assets:Banks:US:BankOfAmerica:Checking:Primary:Joint:Account";
      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="my-ledger"
          params={{
            accountName: longAccountName,
          }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.title", {
        ledgerName: "my-ledger",
        accountName: longAccountName,
      });
    });

    it("should handle ledger names with special characters", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger-2024_v2"
          params={{
            ledgerName: "my-ledger-2024_v2",
          }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerOverview.title", {
        ledgerName: "my-ledger-2024_v2",
      });
    });

    it("should handle empty string in accountName", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="my-ledger"
          params={{
            ledgerName: "my-ledger",
            accountName: "",
          }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.title", {
        ledgerName: "my-ledger",
        accountName: "",
      });
    });

    it("should properly spread params", () => {
      const params = {
        ledgerName: "test",
        accountName: "Assets:Bank",
        extra: "value",
      };

      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="test"
          params={params}
        />,
      );

      expect(mockT).toHaveBeenCalledWith(
        "seo.ledgerAccount.title",
        expect.objectContaining({
          ledgerName: "test",
          accountName: "Assets:Bank",
          extra: "value",
        }),
      );
    });
  });

  describe("Component Re-rendering", () => {
    it("should update translations when props change", () => {
      const { rerender } = render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="ledger1"
          params={{ accountName: "Assets:Bank" }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.title", {
        ledgerName: "ledger1",
        accountName: "Assets:Bank",
      });

      mockT.mockClear();

      rerender(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="ledger1"
          params={{ accountName: "Assets:Cash" }}
        />,
      );

      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.title", {
        ledgerName: "ledger1",
        accountName: "Assets:Cash",
      });
    });
  });

  describe("Params Priority", () => {
    it("should override ledgerName in params if provided", () => {
      // If params contains ledgerName, it should be used in spread
      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="prop-ledger"
          params={{
            ledgerName: "params-ledger",
            accountName: "Assets:Bank",
          }}
        />,
      );

      // The params spread should include params-ledger, not prop-ledger
      // because params is spread after ledgerName in the component
      expect(mockT).toHaveBeenCalledWith("seo.ledgerAccount.title", {
        ledgerName: "params-ledger",
        accountName: "Assets:Bank",
      });
    });
  });

  describe("Indexability", () => {
    it("should emit robots noindex and skip hreflang when noIndex is true", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerAccount.title"
          descriptionKey="seo.ledgerAccount.description"
          ledgerName="my-ledger"
          params={{ accountName: "Assets:Bank" }}
          noIndex
        />,
      );

      const robots = document.head.querySelector('meta[name="robots"]');
      expect(robots?.getAttribute("content")).toBe("noindex, follow");
      expect(
        document.head.querySelector('[data-testid="hreflang"]'),
      ).toBeNull();
    });

    it("should keep hreflang and omit robots when noIndex is false", () => {
      render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
        />,
      );

      expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
      expect(
        document.head.querySelector('[data-testid="hreflang"]'),
      ).not.toBeNull();
    });
  });

  describe("Canonical", () => {
    it("should emit exactly one self-canonical on indexable pages", async () => {
      const { unmount } = render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
        />,
      );
      const links = document.head.querySelectorAll('link[rel="canonical"]');
      expect(links.length).toBe(1);
      expect(links[0]?.getAttribute("href")).toBe(
        "https://beancount.io/ledger/test",
      );
      unmount();
    });

    it("should emit no canonical when noIndex is true", async () => {
      const { unmount } = render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
          noIndex
        />,
      );
      expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
      unmount();
    });

    it("should honor canonicalUrl override even with noIndex", async () => {
      const custom =
        "https://beancount.io/ledger/open_ledger/example/commit/abc123";
      const { unmount } = render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
          canonicalUrl={custom}
        />,
      );
      const link = document.head.querySelector('link[rel="canonical"]');
      expect(link?.getAttribute("href")).toBe(custom);
      unmount();
      const { unmount: u2 } = render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
          noIndex
          canonicalUrl={custom}
        />,
      );
      expect(
        document.head
          .querySelector('link[rel="canonical"]')
          ?.getAttribute("href"),
      ).toBe(custom);
      u2();
    });

    it("should never emit two canonical tags", async () => {
      const { unmount } = render(
        <LedgerSEO
          titleKey="seo.ledgerOverview.title"
          descriptionKey="seo.ledgerOverview.description"
          ledgerName="my-ledger"
          canonicalUrl="https://beancount.io/ledger/open_ledger/example/agent"
        />,
      );
      expect(
        document.head.querySelectorAll('link[rel="canonical"]').length,
      ).toBe(1);
      unmount();
    });
  });
});
