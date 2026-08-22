import Router from "@koa/router";
import { setSitemapHandler } from "../sitemap-handler";
import type { AppLayers } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { SitemapService } from "../../service/sitemap-service";
import { logger } from "@/shared/logger";

// Mock the SitemapService
jest.mock("../../service/sitemap-service");

interface MockContext {
  type: string;
  set: jest.Mock;
  body: string;
  status: number;
}

describe("Sitemap Handler", () => {
  let router: Router;
  let mockLayers: AppLayers;
  let mockConfig: AppConfig;
  let mockCtx: MockContext;

  beforeEach(() => {
    jest.clearAllMocks();

    router = new Router();
    mockLayers = {
      database: { db: {} as any, models: {} as any },
      clients: {},
      services: {},
      workflows: {},
    } as unknown as AppLayers;
    mockConfig = {
      dashboard: {
        url: "https://beancount.io",
      },
      gitea: {
        internalHostname: "gitea",
        httpPort: 3000,
        hostname: "git.beancount.io",
        sshPort: 2222,
      },
    } as AppConfig;

    mockCtx = {
      type: "",
      set: jest.fn(),
      body: "",
      status: 200,
    };
  });

  describe("setSitemapHandler", () => {
    it("should register GET /api-gateway/sitemap.xml route", () => {
      setSitemapHandler(router, mockLayers, mockConfig);

      const routes = router.stack.map((layer) => ({
        path: layer.path,
        methods: layer.methods,
      }));

      expect(routes).toContainEqual({
        path: "/api-gateway/sitemap.xml",
        methods: expect.arrayContaining(["GET"]),
      });
    });

    it("should set correct content type", async () => {
      const mockGenerateSitemap = jest
        .fn()
        .mockResolvedValue("<urlset></urlset>");
      (SitemapService as unknown as jest.Mock).mockImplementation(() => ({
        generateSitemap: mockGenerateSitemap,
      }));

      setSitemapHandler(router, mockLayers, mockConfig);

      // Find the handler
      const route = router.stack.find(
        (layer) => layer.path === "/api-gateway/sitemap.xml",
      );
      expect(route).toBeDefined();

      // Execute the handler
      await route!.stack[0](mockCtx as any, jest.fn());

      expect(mockCtx.type).toBe("application/xml");
    });

    it("should set Cache-Control header", async () => {
      const mockGenerateSitemap = jest
        .fn()
        .mockResolvedValue("<urlset></urlset>");
      (SitemapService as unknown as jest.Mock).mockImplementation(() => ({
        generateSitemap: mockGenerateSitemap,
      }));

      setSitemapHandler(router, mockLayers, mockConfig);

      const route = router.stack.find(
        (layer) => layer.path === "/api-gateway/sitemap.xml",
      );

      await route!.stack[0](mockCtx as any, jest.fn());

      expect(mockCtx.set).toHaveBeenCalledWith(
        "Cache-Control",
        "public, max-age=3600",
      );
    });

    it("should return sitemap XML as response body", async () => {
      const mockXml = '<?xml version="1.0"?><urlset></urlset>';
      const mockGenerateSitemap = jest.fn().mockResolvedValue(mockXml);
      (SitemapService as unknown as jest.Mock).mockImplementation(() => ({
        generateSitemap: mockGenerateSitemap,
      }));

      setSitemapHandler(router, mockLayers, mockConfig);

      const route = router.stack.find(
        (layer) => layer.path === "/api-gateway/sitemap.xml",
      );

      await route!.stack[0](mockCtx as any, jest.fn());

      expect(mockCtx.body).toBe(mockXml);
    });

    it("should handle errors and return 500 status", async () => {
      const mockGenerateSitemap = jest
        .fn()
        .mockRejectedValue(new Error("Test error"));
      (SitemapService as unknown as jest.Mock).mockImplementation(() => ({
        generateSitemap: mockGenerateSitemap,
      }));

      // Suppress logger output during tests
      jest.spyOn(logger, "error").mockImplementation(() => {});

      setSitemapHandler(router, mockLayers, mockConfig);

      const route = router.stack.find(
        (layer) => layer.path === "/api-gateway/sitemap.xml",
      );

      await route!.stack[0](mockCtx as any, jest.fn());

      // Test error handling behavior, not logging details
      expect(mockCtx.status).toBe(500);
      expect(mockCtx.body).toBe("Internal server error generating sitemap");
    });

    it("should create SitemapService with correct parameters", async () => {
      const mockGenerateSitemap = jest
        .fn()
        .mockResolvedValue("<urlset></urlset>");

      const SitemapServiceMock = jest.fn().mockImplementation(() => ({
        generateSitemap: mockGenerateSitemap,
      }));

      (SitemapService as unknown as jest.Mock).mockImplementation(
        SitemapServiceMock,
      );

      setSitemapHandler(router, mockLayers, mockConfig);

      const route = router.stack.find(
        (layer) => layer.path === "/api-gateway/sitemap.xml",
      );

      await route!.stack[0](mockCtx as any, jest.fn());

      expect(SitemapServiceMock).toHaveBeenCalledWith(
        expect.any(Object),
        mockConfig,
      );
    });

    it("should call generateSitemap on service", async () => {
      const mockGenerateSitemap = jest
        .fn()
        .mockResolvedValue("<urlset></urlset>");
      (SitemapService as unknown as jest.Mock).mockImplementation(() => ({
        generateSitemap: mockGenerateSitemap,
      }));

      setSitemapHandler(router, mockLayers, mockConfig);

      const route = router.stack.find(
        (layer) => layer.path === "/api-gateway/sitemap.xml",
      );

      await route!.stack[0](mockCtx as any, jest.fn());

      expect(mockGenerateSitemap).toHaveBeenCalledTimes(1);
    });

    it("should handle empty sitemap response", async () => {
      const mockXml =
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>';
      const mockGenerateSitemap = jest.fn().mockResolvedValue(mockXml);
      (SitemapService as unknown as jest.Mock).mockImplementation(() => ({
        generateSitemap: mockGenerateSitemap,
      }));

      setSitemapHandler(router, mockLayers, mockConfig);

      const route = router.stack.find(
        (layer) => layer.path === "/api-gateway/sitemap.xml",
      );

      await route!.stack[0](mockCtx as any, jest.fn());

      expect(mockCtx.status).toBe(200);
      expect(mockCtx.body).toBe(mockXml);
      expect(mockCtx.type).toBe("application/xml");
    });

    it("should handle large sitemap response", async () => {
      // Generate a large sitemap with many URLs
      const urls = Array.from(
        { length: 1000 },
        (_, i) => `
  <url>
    <loc>https://beancount.io/ledger/user${i}/repo${i}/</loc>
    <lastmod>2025-01-10T12:00:00.000Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
      ).join("\n");

      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

      const mockGenerateSitemap = jest.fn().mockResolvedValue(mockXml);
      (SitemapService as unknown as jest.Mock).mockImplementation(() => ({
        generateSitemap: mockGenerateSitemap,
      }));

      setSitemapHandler(router, mockLayers, mockConfig);

      const route = router.stack.find(
        (layer) => layer.path === "/api-gateway/sitemap.xml",
      );

      await route!.stack[0](mockCtx as any, jest.fn());

      expect(mockCtx.status).toBe(200);
      expect(mockCtx.body).toBe(mockXml);
      expect(mockCtx.body.length).toBeGreaterThan(10000);
    });
  });

  describe("error handling", () => {
    it("should not expose error details to client", async () => {
      const mockGenerateSitemap = jest
        .fn()
        .mockRejectedValue(new Error("Sensitive database error"));
      (SitemapService as unknown as jest.Mock).mockImplementation(() => ({
        generateSitemap: mockGenerateSitemap,
      }));

      // Suppress logger output during tests
      jest.spyOn(logger, "error").mockImplementation(() => {});

      setSitemapHandler(router, mockLayers, mockConfig);

      const route = router.stack.find(
        (layer) => layer.path === "/api-gateway/sitemap.xml",
      );

      await route!.stack[0](mockCtx as any, jest.fn());

      // Test security: ensure error details are not exposed to client
      expect(mockCtx.body).toBe("Internal server error generating sitemap");
      expect(mockCtx.body).not.toContain("database");
      expect(mockCtx.body).not.toContain("Sensitive");
    });
  });

  describe("response headers", () => {
    it("should set correct content type for XML", async () => {
      const mockGenerateSitemap = jest
        .fn()
        .mockResolvedValue("<urlset></urlset>");
      (SitemapService as unknown as jest.Mock).mockImplementation(() => ({
        generateSitemap: mockGenerateSitemap,
      }));

      setSitemapHandler(router, mockLayers, mockConfig);

      const route = router.stack.find(
        (layer) => layer.path === "/api-gateway/sitemap.xml",
      );

      await route!.stack[0](mockCtx as any, jest.fn());

      expect(mockCtx.type).toBe("application/xml");
    });

    it("should set public cache control for 1 hour", async () => {
      const mockGenerateSitemap = jest
        .fn()
        .mockResolvedValue("<urlset></urlset>");
      (SitemapService as unknown as jest.Mock).mockImplementation(() => ({
        generateSitemap: mockGenerateSitemap,
      }));

      setSitemapHandler(router, mockLayers, mockConfig);

      const route = router.stack.find(
        (layer) => layer.path === "/api-gateway/sitemap.xml",
      );

      await route!.stack[0](mockCtx as any, jest.fn());

      expect(mockCtx.set).toHaveBeenCalledWith(
        "Cache-Control",
        "public, max-age=3600",
      );
    });
  });
});
