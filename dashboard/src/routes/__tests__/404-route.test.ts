import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { createLocalization } from "@/i18n/init";
const i18n = createLocalization().i18n;
vi.spyOn(i18n, "t");

// Mock locale-map module
vi.mock("@/common/lib/seo/locale-map", () => ({
  getOgLocale: vi.fn(() => "en_US"),
}));

describe("404 Route SEO Metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have SEO metadata for 404 page", () => {
    const mockI18n = vi.mocked(i18n.t);
    mockI18n.mockImplementation((key: string) => {
      if (key === "seo.notFound.title") return "Page Not Found";
      if (key === "seo.notFound.description")
        return "The page you're looking for doesn't exist. It may have been moved or deleted.";
      return key;
    });

    const metadata = getSEOMetadata(
      i18n,
      "seo.notFound.title",
      "seo.notFound.description",
    );
    const headMeta = createHeadMeta(i18n, metadata);

    expect(metadata.title).toBe("Page Not Found");
    expect(metadata.description).toBe(
      "The page you're looking for doesn't exist. It may have been moved or deleted.",
    );
    expect(headMeta.meta).toHaveLength(3);
    expect(headMeta.meta[0]).toEqual({
      title: "Page Not Found",
    });
    expect(headMeta.meta[1]).toEqual({
      name: "description",
      content:
        "The page you're looking for doesn't exist. It may have been moved or deleted.",
    });
    expect(headMeta.meta[2]).toEqual({
      property: "og:locale",
      content: "en_US",
    });
  });

  it("should use correct translation keys for 404 page", () => {
    const mockI18n = vi.mocked(i18n.t);
    mockI18n.mockImplementation(() => "Test");

    getSEOMetadata(i18n, "seo.notFound.title", "seo.notFound.description");

    expect(mockI18n).toHaveBeenCalledWith("seo.notFound.title");
    expect(mockI18n).toHaveBeenCalledWith("seo.notFound.description");
  });
});
