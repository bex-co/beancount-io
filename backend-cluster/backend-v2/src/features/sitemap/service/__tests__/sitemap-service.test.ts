import { SitemapService } from "../sitemap-service";
import { SitemapCache } from "../sitemap-cache";
import type { DatabaseLayer } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import type { SitemapUrl } from "../../types/sitemap-types";

// Mock the SitemapCache
jest.mock("../sitemap-cache");

describe("SitemapService", () => {
  let service: SitemapService;
  let mockServices: {
    db: any;
    models: { user: { getActiveUsersWithUsername: jest.Mock } };
  };
  let mockConfig: AppConfig;
  let mockCache: jest.Mocked<SitemapCache>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock cache instance with new methods
    mockCache = {
      get: jest.fn(),
      getStale: jest.fn(),
      isExpired: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
    } as any;

    (SitemapCache.getInstance as jest.Mock).mockReturnValue(mockCache);

    // Mock config
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

    // Mock database layer
    mockServices = {
      db: {} as any,
      models: {
        user: {
          getActiveUsersWithUsername: jest.fn(),
        },
      },
    };

    service = new SitemapService(
      mockServices as unknown as DatabaseLayer,
      mockConfig,
    );
  });

  describe("generateSitemap", () => {
    it("should return cached sitemap if available", async () => {
      const cachedXml = '<?xml version="1.0"?><urlset></urlset>';
      mockCache.get.mockReturnValue(cachedXml);

      const result = await service.generateSitemap();

      expect(result).toBe(cachedXml);
      expect(mockCache.get).toHaveBeenCalledWith("sitemap:xml");
      expect(
        mockServices.models.user.getActiveUsersWithUsername,
      ).not.toHaveBeenCalled();
    });

    it("should generate and cache sitemap when cache is empty", async () => {
      mockCache.get.mockReturnValue(undefined);

      // Mock no users
      (
        mockServices.models.user.getActiveUsersWithUsername as jest.Mock
      ).mockResolvedValue([]);

      const result = await service.generateSitemap();

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "sitemap:xml",
        expect.any(String),
        86400000, // 1 day
      );
    });

    it("should generate empty sitemap when no users exist", async () => {
      mockCache.get.mockReturnValue(undefined);

      (
        mockServices.models.user.getActiveUsersWithUsername as jest.Mock
      ).mockResolvedValue([]);

      const result = await service.generateSitemap();

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      );
      expect(result).toContain("</urlset>");
      // Should not contain any <url> entries
      expect(result).not.toContain("<url>");
    });

    it("should handle errors gracefully and return empty sitemap", async () => {
      mockCache.get.mockReturnValue(undefined);

      // Mock database error
      (
        mockServices.models.user.getActiveUsersWithUsername as jest.Mock
      ).mockRejectedValue(new Error("Database error"));

      const result = await service.generateSitemap();

      // Should still return valid XML with no URLs
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain("</urlset>");
      expect(result).not.toContain("<url>");
    });
  });

  describe("XML rendering", () => {
    it("should escape XML special characters in URLs", () => {
      // Test the escapeXml method directly via the rendered output
      const testService = service as any;
      const escapedString = testService.escapeXml("user&<>\"'test");

      expect(escapedString).toBe("user&amp;&lt;&gt;&quot;&apos;test");
    });

    it("should include proper XML structure", async () => {
      mockCache.get.mockReturnValue(undefined);

      (
        mockServices.models.user.getActiveUsersWithUsername as jest.Mock
      ).mockResolvedValue([]);

      const result = await service.generateSitemap();

      expect(result).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
      expect(result).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      );
      expect(result).toMatch(/<\/urlset>$/);
    });

    it("should format URLs with proper tags", () => {
      // Test URL rendering by calling private method
      const testService = service as any;
      const url = testService.createUserProfileUrl("testuser");

      expect(url.loc).toBe("https://beancount.io/ledger/testuser/");
      expect(url.changefreq).toBe("weekly");
      expect(url.priority).toBe(0.6);
    });
  });

  describe("repository URL generation", () => {
    it("should generate 7 URLs per public repository", () => {
      const testService = service as any;
      const urls = testService.createRepositoryUrls(
        "testuser",
        "my-repo",
        new Date("2025-01-10T12:00:00Z"),
      );

      // Should have 7 URLs (overview + 6 subpages)
      expect(urls).toHaveLength(7);

      // Check all 7 pages are present
      const paths = urls.map((u: SitemapUrl) => u.loc);
      expect(paths).toContain("https://beancount.io/ledger/testuser/my-repo/");
      expect(paths).toContain(
        "https://beancount.io/ledger/testuser/my-repo/journal",
      );
      expect(paths).toContain(
        "https://beancount.io/ledger/testuser/my-repo/balance-sheet",
      );
      expect(paths).toContain(
        "https://beancount.io/ledger/testuser/my-repo/income-statement",
      );
      expect(paths).toContain(
        "https://beancount.io/ledger/testuser/my-repo/trial-balance",
      );
      expect(paths).toContain(
        "https://beancount.io/ledger/testuser/my-repo/statistics",
      );
      expect(paths).toContain(
        "https://beancount.io/ledger/testuser/my-repo/holdings",
      );

      // Check priorities
      expect(urls[0].priority).toBe(0.8); // Overview
      expect(urls[1].priority).toBe(0.7); // Journal
    });

    it("should include lastmod in repository URLs", () => {
      const testService = service as any;
      const testDate = new Date("2025-01-10T12:00:00Z");
      const urls = testService.createRepositoryUrls(
        "testuser",
        "my-repo",
        testDate,
      );

      // All URLs should have the same lastmod
      urls.forEach((url: SitemapUrl) => {
        expect(url.lastmod).toBe(testDate.toISOString());
      });
    });

    it("should use correct base URL from config", () => {
      mockConfig.dashboard.url = "https://example.com";
      const newService = new SitemapService(
        mockServices as unknown as DatabaseLayer,
        mockConfig,
      );

      const testService = newService as any;
      const url = testService.createUserProfileUrl("testuser");

      expect(url.loc).toBe("https://example.com/ledger/testuser/");
    });
  });

  describe("user filtering", () => {
    it("should query active users with pagination", async () => {
      mockCache.get.mockReturnValue(undefined);

      (
        mockServices.models.user.getActiveUsersWithUsername as jest.Mock
      ).mockResolvedValue([]);

      await service.generateSitemap();

      expect(
        mockServices.models.user.getActiveUsersWithUsername,
      ).toHaveBeenCalledWith(expect.any(Object), { limit: 1000, offset: 0 });
    });
  });

  describe("Gitea API interaction", () => {
    it("should create Gitea client with correct configuration", () => {
      const testService = service as any;
      const client = testService.createUnauthenticatedGiteaClient();

      // Verify it's a GiteaApi instance
      expect(client).toBeDefined();
      expect(client.constructor.name).toBe("Api");
    });
  });

  describe("caching behavior", () => {
    it("should cache sitemap for 1 day (86400000ms)", async () => {
      mockCache.get.mockReturnValue(undefined);
      mockCache.getStale.mockReturnValue(undefined);

      (
        mockServices.models.user.getActiveUsersWithUsername as jest.Mock
      ).mockResolvedValue([]);

      await service.generateSitemap();

      expect(mockCache.set).toHaveBeenCalledWith(
        "sitemap:xml",
        expect.any(String),
        86400000,
      );
    });

    it("should not query database if cache is hit", async () => {
      const cachedXml = '<?xml version="1.0"?><urlset></urlset>';
      mockCache.get.mockReturnValue(cachedXml);

      await service.generateSitemap();

      expect(
        mockServices.models.user.getActiveUsersWithUsername,
      ).not.toHaveBeenCalled();
    });
  });

  describe("stale-while-revalidate behavior", () => {
    it("should serve valid cache immediately without checking stale", async () => {
      const validCachedXml = '<?xml version="1.0"?><urlset>VALID</urlset>';
      mockCache.get.mockReturnValue(validCachedXml);

      const result = await service.generateSitemap();

      // Should return valid cache immediately
      expect(result).toBe(validCachedXml);
      expect(mockCache.get).toHaveBeenCalledWith("sitemap:xml");
      // Should not check for stale cache
      expect(mockCache.getStale).not.toHaveBeenCalled();
      // Should not query database
      expect(
        mockServices.models.user.getActiveUsersWithUsername,
      ).not.toHaveBeenCalled();
    });

    it("should serve stale cache immediately when cache is expired", async () => {
      const staleCachedXml = '<?xml version="1.0"?><urlset>STALE</urlset>';

      // Simulate expired cache: get() returns undefined, getStale() returns data
      mockCache.get.mockReturnValue(undefined);
      mockCache.getStale.mockReturnValue(staleCachedXml);

      const result = await service.generateSitemap();

      // Should return stale data immediately (non-blocking)
      expect(result).toBe(staleCachedXml);
      expect(mockCache.get).toHaveBeenCalledWith("sitemap:xml");
      expect(mockCache.getStale).toHaveBeenCalledWith("sitemap:xml");

      // Should NOT block on database query
      expect(
        mockServices.models.user.getActiveUsersWithUsername,
      ).not.toHaveBeenCalled();
    });

    it("should return stale cache immediately without blocking", async () => {
      const staleCachedXml = '<?xml version="1.0"?><urlset>STALE</urlset>';

      mockCache.get.mockReturnValue(undefined);
      mockCache.getStale.mockReturnValue(staleCachedXml);

      // Mock database response for background refresh
      (
        mockServices.models.user.getActiveUsersWithUsername as jest.Mock
      ).mockResolvedValue([]);

      const result = await service.generateSitemap();

      // Should return stale cache immediately (non-blocking)
      expect(result).toBe(staleCachedXml);

      // Background refresh should NOT have been awaited (non-blocking behavior)
      // The database call happens in background via setImmediate
      expect(
        mockServices.models.user.getActiveUsersWithUsername,
      ).not.toHaveBeenCalled();

      // Verify that getStale was called to retrieve expired data
      expect(mockCache.getStale).toHaveBeenCalledWith("sitemap:xml");
    });

    it("should generate fresh sitemap when no cache exists", async () => {
      mockCache.get.mockReturnValue(undefined);
      mockCache.getStale.mockReturnValue(undefined);

      (
        mockServices.models.user.getActiveUsersWithUsername as jest.Mock
      ).mockResolvedValue([]);

      const result = await service.generateSitemap();

      // Should generate fresh sitemap (blocking)
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(
        mockServices.models.user.getActiveUsersWithUsername,
      ).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });
  });
});
