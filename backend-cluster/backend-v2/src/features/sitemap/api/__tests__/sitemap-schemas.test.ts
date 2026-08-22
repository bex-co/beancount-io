import { sitemapResponseSchema } from "../sitemap-schemas";

describe("Sitemap Schemas", () => {
  describe("sitemapResponseSchema", () => {
    it("should validate a valid sitemap XML string", () => {
      const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://beancount.io/ledger/john/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;

      const result = sitemapResponseSchema.safeParse(validXml);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(validXml);
      }
    });

    it("should validate an empty sitemap", () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

      const result = sitemapResponseSchema.safeParse(emptyXml);

      expect(result.success).toBe(true);
    });

    it("should validate a sitemap with multiple URLs", () => {
      const multipleUrlsXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://beancount.io/ledger/john/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://beancount.io/ledger/john/my-ledger/</loc>
    <lastmod>2025-01-10T12:00:00Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://beancount.io/ledger/john/my-ledger/journal</loc>
    <lastmod>2025-01-10T12:00:00Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

      const result = sitemapResponseSchema.safeParse(multipleUrlsXml);

      expect(result.success).toBe(true);
    });

    it("should fail validation for non-string input", () => {
      const result = sitemapResponseSchema.safeParse(123);

      expect(result.success).toBe(false);
    });

    it("should fail validation for null", () => {
      const result = sitemapResponseSchema.safeParse(null);

      expect(result.success).toBe(false);
    });

    it("should fail validation for undefined", () => {
      const result = sitemapResponseSchema.safeParse(undefined);

      expect(result.success).toBe(false);
    });

    it("should fail validation for object", () => {
      const result = sitemapResponseSchema.safeParse({ xml: "test" });

      expect(result.success).toBe(false);
    });

    it("should validate sitemap with escaped XML characters", () => {
      const escapedXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://beancount.io/ledger/john&amp;doe/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;

      const result = sitemapResponseSchema.safeParse(escapedXml);

      expect(result.success).toBe(true);
    });

    it("should be a string schema", () => {
      // Verify it validates strings
      expect(sitemapResponseSchema.safeParse("test").success).toBe(true);
      expect(sitemapResponseSchema.safeParse(123).success).toBe(false);
    });

    it("should validate very long XML strings", () => {
      // Generate a large sitemap
      const urls = Array.from(
        { length: 100 },
        (_, i) => `
  <url>
    <loc>https://beancount.io/ledger/user${i}/repo${i}/</loc>
    <lastmod>2025-01-10T12:00:00.000Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
      ).join("");

      const largeXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

      const result = sitemapResponseSchema.safeParse(largeXml);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeGreaterThan(1000);
      }
    });
  });
});
