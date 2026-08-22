import { z } from "@/shared/zod-openapi-setup";

export const sitemapResponseSchema = z.string().openapi("SitemapXmlResponse", {
  description: "XML sitemap document following the sitemaps.org protocol",
  example: `<?xml version="1.0" encoding="UTF-8"?>
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
</urlset>`,
});
