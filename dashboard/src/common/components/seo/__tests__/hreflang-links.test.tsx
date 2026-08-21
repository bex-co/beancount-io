import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { HreflangLinks } from "../hreflang-links";
import { SUPPORTED_LANGUAGES } from "@/i18n";

// Mock TanStack Router's useLocation
vi.mock("@tanstack/react-router", () => ({
  useLocation: vi.fn(() => ({
    pathname: "/ledger/test",
    search: {}, // TanStack Router's search is a parsed object
    searchStr: "?editMode=true&lineNumber=12&lang=fr",
    hash: "",
  })),
}));

describe("HreflangLinks", () => {
  afterEach(() => {
    cleanup();
    // Clean up any link elements added to document head
    const links = document.querySelectorAll('link[rel="alternate"]');
    links.forEach((link) => link.remove());
  });

  it("should render without errors", () => {
    const { container } = render(<HreflangLinks />);
    expect(container).toBeTruthy();
  });

  it("should render hreflang links for all supported languages", () => {
    render(<HreflangLinks />);
    // React 19 hoists link elements to document.head
    const links = document.querySelectorAll('link[rel="alternate"]');

    // Should have one link per supported language plus x-default
    expect(links.length).toBe(SUPPORTED_LANGUAGES.length + 1);
  });

  it("should include all 13 supported languages", () => {
    render(<HreflangLinks />);

    SUPPORTED_LANGUAGES.forEach((lang) => {
      const link = document.querySelector(`link[hreflang="${lang}"]`);
      expect(link).toBeTruthy();
    });
  });

  it("should include x-default hreflang", () => {
    render(<HreflangLinks />);
    const xDefaultLink = document.querySelector('link[hreflang="x-default"]');
    expect(xDefaultLink).toBeTruthy();
  });

  it("should set correct href with lang query parameter for each language", () => {
    render(<HreflangLinks />);

    SUPPORTED_LANGUAGES.forEach((lang) => {
      const link = document.querySelector(`link[hreflang="${lang}"]`);
      expect(link?.getAttribute("href")).toContain(`lang=${lang}`);
    });
  });

  it("should set x-default href without lang parameter", () => {
    render(<HreflangLinks />);
    const xDefaultLink = document.querySelector('link[hreflang="x-default"]');
    const href = xDefaultLink?.getAttribute("href");

    // x-default should not have lang parameter
    expect(href).not.toContain("lang=");
  });

  it("should preserve existing URL path in hreflang hrefs", () => {
    render(<HreflangLinks />);
    const enLink = document.querySelector('link[hreflang="en"]');
    const href = enLink?.getAttribute("href");

    expect(href).toContain("/ledger/test");
  });

  it("should omit UI-state query parameters from alternate URLs", () => {
    render(<HreflangLinks />);
    const enLink = document.querySelector('link[hreflang="en"]');
    const href = enLink?.getAttribute("href");

    expect(href).not.toContain("editMode");
    expect(href).not.toContain("lineNumber");
    expect(href).toContain("lang=en");
  });

  it("should use production base URL in hreflang hrefs", () => {
    render(<HreflangLinks />);
    const enLink = document.querySelector('link[hreflang="en"]');
    const href = enLink?.getAttribute("href");

    expect(href).toContain("https://beancount.io");
  });

  it("should generate full absolute URLs for all hreflang links", () => {
    render(<HreflangLinks />);

    SUPPORTED_LANGUAGES.forEach((lang) => {
      const link = document.querySelector(`link[hreflang="${lang}"]`);
      const href = link?.getAttribute("href");
      expect(href).toMatch(/^https:\/\/beancount\.io/);
    });

    // Also check x-default
    const xDefaultLink = document.querySelector('link[hreflang="x-default"]');
    expect(xDefaultLink?.getAttribute("href")).toMatch(
      /^https:\/\/beancount\.io/,
    );
  });

  it("should set rel attribute to alternate for all links", () => {
    render(<HreflangLinks />);
    const links = document.querySelectorAll('link[rel="alternate"]');

    links.forEach((link) => {
      expect(link.getAttribute("rel")).toBe("alternate");
    });
  });

  it("should render correct number of link elements", () => {
    render(<HreflangLinks />);
    const links = document.querySelectorAll('link[rel="alternate"]');

    // 13 supported languages + 1 x-default = 14 total
    expect(links.length).toBe(14);
  });
});
