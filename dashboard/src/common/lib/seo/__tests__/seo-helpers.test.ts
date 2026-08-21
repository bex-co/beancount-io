import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSEOMetadata,
  createHeadMeta,
  createNoIndexHead,
} from "../seo-helpers";
import i18n from "@/i18n/init";

// Mock i18n module
vi.mock("@/i18n/init", () => ({
  default: {
    t: vi.fn(),
    language: "en",
  },
}));

// Mock locale-map module
vi.mock("../locale-map", () => ({
  getOgLocale: vi.fn((lang: string) => {
    const map: Record<string, string> = {
      en: "en_US",
      zh: "zh_CN",
      fr: "fr_FR",
      de: "de_DE",
    };
    return map[lang] || "en_US";
  }),
}));

describe("getSEOMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return metadata with title and description", () => {
    const mockI18n = vi.mocked(i18n.t);
    mockI18n.mockImplementation((key: string) => {
      if (key === "common.seo.login.title") return "Login";
      if (key === "common.seo.login.description")
        return "Sign in to your account";
      return key;
    });

    const result = getSEOMetadata(
      "common.seo.login.title",
      "common.seo.login.description",
    );

    expect(result.title).toBe("Login");
    expect(result.description).toBe("Sign in to your account");
  });

  it("should use keys directly without modification", () => {
    const mockI18n = vi.mocked(i18n.t);
    mockI18n.mockImplementation(() => "Test");

    getSEOMetadata("common.seo.test.title", "common.seo.test.description");

    expect(mockI18n).toHaveBeenCalledWith("common.seo.test.title");
    expect(mockI18n).toHaveBeenCalledWith("common.seo.test.description");
  });

  it("should pass params to i18n.t when provided", () => {
    const mockI18n = vi.mocked(i18n.t);
    mockI18n.mockImplementation(() => "My Ledger");

    const params = { ledgerName: "My Ledger" };
    getSEOMetadata(
      "common.seo.ledger.title",
      "common.seo.ledger.description",
      params,
    );

    expect(mockI18n).toHaveBeenCalledWith("common.seo.ledger.title", params);
    expect(mockI18n).toHaveBeenCalledWith(
      "common.seo.ledger.description",
      params,
    );
  });

  it("should not pass params when not provided", () => {
    const mockI18n = vi.mocked(i18n.t);
    mockI18n.mockImplementation(() => "Test");

    getSEOMetadata("common.seo.home.title", "common.seo.home.description");

    expect(mockI18n).toHaveBeenCalledWith("common.seo.home.title");
    expect(mockI18n).toHaveBeenCalledWith("common.seo.home.description");
  });

  it("should not append domain suffix to title", () => {
    const mockI18n = vi.mocked(i18n.t);
    mockI18n.mockImplementation((key: string) => {
      if (key.includes("title")) return "Dashboard";
      return "Description text";
    });

    const result = getSEOMetadata(
      "common.seo.dashboard.title",
      "common.seo.dashboard.description",
    );

    expect(result.title).not.toContain("| beancount.io");
    expect(result.title).toBe("Dashboard");
  });

  it("should handle empty translation values", () => {
    const mockI18n = vi.mocked(i18n.t);
    mockI18n.mockImplementation(() => "");

    const result = getSEOMetadata(
      "common.seo.empty.title",
      "common.seo.empty.description",
    );

    expect(result.title).toBe("");
    expect(result.description).toBe("");
  });

  it("should interpolate ledgerCommit shortSha and ledgerName", () => {
    const mockI18n = vi.mocked(i18n.t);
    mockI18n.mockImplementation(
      (key: string, params?: Record<string, string>) => {
        if (key === "seo.ledgerCommit.title")
          return `Commit ${params?.shortSha} - ${params?.ledgerName}`;
        if (key === "seo.ledgerCommit.description")
          return `Changes in commit ${params?.shortSha} for ${params?.ledgerName}. Review modified files and diffs.`;
        return key;
      },
    );

    const result = getSEOMetadata(
      "seo.ledgerCommit.title",
      "seo.ledgerCommit.description",
      { ledgerName: "amazon", shortSha: "c121e11" },
    );

    expect(result.title).toBe("Commit c121e11 - amazon");
    expect(result.title).toContain("c121e11");
    expect(result.title).toContain("amazon");
    expect(result.description).toContain("c121e11");
    expect(result.description).not.toBe(
      "View commit history and version control for amazon. Track changes to your ledger files over time.",
    );
  });
});

describe("createHeadMeta", () => {
  it("should create head meta configuration with title, description, and og:locale", () => {
    const metadata = {
      title: "Test Title",
      description: "Test description for the page",
    };

    const result = createHeadMeta(metadata);

    expect(result.meta).toHaveLength(3);
    expect(result.meta[0]).toEqual({ title: "Test Title" });
    expect(result.meta[1]).toEqual({
      name: "description",
      content: "Test description for the page",
    });
    expect(result.meta[2]).toEqual({
      property: "og:locale",
      content: "en_US",
    });
  });

  it("should include og:locale meta tag", () => {
    const metadata = {
      title: "Test",
      description: "Test",
    };

    const result = createHeadMeta(metadata);

    const ogLocaleMeta = result.meta.find(
      (meta) => "property" in meta && meta.property === "og:locale",
    );
    expect(ogLocaleMeta).toBeDefined();
    expect(ogLocaleMeta).toHaveProperty("content");
  });

  it("should preserve exact metadata values", () => {
    const metadata = {
      title: "Special <chars> & symbols",
      description: "Description with special <chars> & symbols",
    };

    const result = createHeadMeta(metadata);

    expect(result.meta[0].title).toBe("Special <chars> & symbols");
    expect(result.meta[1].content).toBe(
      "Description with special <chars> & symbols",
    );
  });

  it("should return correct structure for TanStack Router head property", () => {
    const metadata = {
      title: "Page Title",
      description: "Page description",
    };

    const result = createHeadMeta(metadata);

    expect(result).toHaveProperty("meta");
    expect(Array.isArray(result.meta)).toBe(true);
  });

  it("should handle empty strings", () => {
    const metadata = {
      title: "",
      description: "",
    };

    const result = createHeadMeta(metadata);

    expect(result.meta[0].title).toBe("");
    expect(result.meta[1].content).toBe("");
  });

  it("should handle long content", () => {
    const longDescription = "A".repeat(500);
    const metadata = {
      title: "Test Title",
      description: longDescription,
    };

    const result = createHeadMeta(metadata);

    expect(result.meta[1].content).toBe(longDescription);
    expect(result.meta[1].content).toHaveLength(500);
  });

  it("should have og:locale as the third meta entry", () => {
    const metadata = {
      title: "Test",
      description: "Test description",
    };

    const result = createHeadMeta(metadata);

    expect(result.meta[2]).toHaveProperty("property", "og:locale");
  });

  it("should omit robots meta when noIndex is unset", () => {
    const result = createHeadMeta({
      title: "Overview",
      description: "Public overview",
    });

    expect(
      result.meta.find((meta) => "name" in meta && meta.name === "robots"),
    ).toBeUndefined();
    expect(result.meta).toHaveLength(3);
  });

  it("should emit robots noindex when noIndex is true", () => {
    const result = createHeadMeta(
      {
        title: "Account",
        description: "Deep route",
      },
      { noIndex: true },
    );

    expect(result.meta).toHaveLength(4);
    expect(result.meta[3]).toEqual({
      name: "robots",
      content: "noindex, follow",
    });
  });
});

describe("createNoIndexHead", () => {
  it("emits noindex for transactional routes without dedicated metadata", () => {
    expect(createNoIndexHead()).toEqual({
      meta: [{ name: "robots", content: "noindex, follow" }],
    });
  });
});
