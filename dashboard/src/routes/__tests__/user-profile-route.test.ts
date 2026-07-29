import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import i18n from "@/i18n/init";

// Mock i18n module
vi.mock("@/i18n/init", () => ({
  default: {
    t: vi.fn(),
    language: "en",
  },
}));

// Mock locale-map module
vi.mock("@/common/lib/seo/locale-map", () => ({
  getOgLocale: vi.fn(() => "en_US"),
}));

describe("User Profile Route SEO Metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have SEO metadata for user profile page", () => {
    const mockI18n = vi.mocked(i18n.t);
    mockI18n.mockImplementation(
      (key: string, params?: Record<string, string>) => {
        if (key === "seo.userProfile.title")
          return `${params?.username} - User Profile`;
        if (key === "seo.userProfile.description")
          return `View ${params?.username}'s profile, repositories, and activity on beancount.io.`;
        return key;
      },
    );

    const metadata = getSEOMetadata(
      "seo.userProfile.title",
      "seo.userProfile.description",
      { username: "testuser" },
    );
    const headMeta = createHeadMeta(metadata);

    expect(metadata.title).toBe("testuser - User Profile");
    expect(metadata.description).toBe(
      "View testuser's profile, repositories, and activity on beancount.io.",
    );
    expect(headMeta.meta).toHaveLength(3);
    expect(headMeta.meta[0]).toEqual({
      title: "testuser - User Profile",
    });
    expect(headMeta.meta[1]).toEqual({
      name: "description",
      content:
        "View testuser's profile, repositories, and activity on beancount.io.",
    });
    expect(headMeta.meta[2]).toEqual({
      property: "og:locale",
      content: "en_US",
    });
  });

  it("should use correct translation keys with params for user profile page", () => {
    const mockI18n = vi.mocked(i18n.t);
    mockI18n.mockImplementation(() => "Test");

    const params = { username: "johndoe" };
    getSEOMetadata(
      "seo.userProfile.title",
      "seo.userProfile.description",
      params,
    );

    expect(mockI18n).toHaveBeenCalledWith("seo.userProfile.title", params);
    expect(mockI18n).toHaveBeenCalledWith(
      "seo.userProfile.description",
      params,
    );
  });

  it("should handle special characters in username", () => {
    const mockI18n = vi.mocked(i18n.t);
    mockI18n.mockImplementation(
      (key: string, params?: Record<string, string>) => {
        if (key === "seo.userProfile.title")
          return `${params?.username} - User Profile`;
        if (key === "seo.userProfile.description")
          return `View ${params?.username}'s profile, repositories, and activity on beancount.io.`;
        return key;
      },
    );

    const metadata = getSEOMetadata(
      "seo.userProfile.title",
      "seo.userProfile.description",
      { username: "user-name_123" },
    );

    expect(metadata.title).toBe("user-name_123 - User Profile");
    expect(metadata.description).toContain("user-name_123");
  });
});
