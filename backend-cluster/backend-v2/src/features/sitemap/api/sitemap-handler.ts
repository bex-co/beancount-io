import Router from "@koa/router";
import { type AppLayers } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { SitemapService } from "../service/sitemap-service";
import { registerRoute } from "@/server/rest/openapi-registry";
import { sitemapResponseSchema } from "./sitemap-schemas";
import { logger } from "@/shared/logger";

export function setSitemapHandler(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  // GET /api-gateway/sitemap.xml
  router.get("/api-gateway/sitemap.xml", async (ctx) => {
    try {
      const sitemapService = new SitemapService(layers.database, config);
      const xml = await sitemapService.generateSitemap();

      // Set appropriate headers
      ctx.type = "application/xml";
      ctx.set("Cache-Control", "public, max-age=3600"); // 1 hour browser cache
      ctx.body = xml;
    } catch (error) {
      logger.error("Error generating sitemap", { error });
      ctx.status = 500;
      ctx.body = "Internal server error generating sitemap";
    }
  });

  // Register OpenAPI documentation
  registerSitemapOpenAPI();
}

function registerSitemapOpenAPI() {
  registerRoute({
    method: "get",
    path: "/api-gateway/sitemap.xml",
    summary: "Get sitemap.xml for SEO",
    description: `Returns a sitemap.xml file containing all public ledger pages for search engine indexing.

The sitemap includes:
- User profile pages (/ledger/{username}/)
- Repository pages (/ledger/{username}/{repoName}/)
- Repository subpages (journal, balance-sheet, income-statement, trial-balance, statistics, holdings)

Only public repositories and active users are included.

The sitemap is cached for 1 hour to optimize performance.`,
    tags: ["SEO"],
    responses: {
      200: {
        description: "Sitemap XML document",
        content: {
          "application/xml": {
            schema: sitemapResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
      },
    },
  });
}
