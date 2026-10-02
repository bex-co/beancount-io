import { type DatabaseLayer } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { Api as GiteaApi } from "@/features/gitea/client/gitea-api";
import { User } from "@/features/auth/data/user-model";
import { SitemapCache } from "./sitemap-cache";
import { SitemapUrl, UserRepositories } from "../types/sitemap-types";
import { processBatch } from "@/shared/batch-processor";
import { logger } from "@/shared/logger";
import { CACHE_KEYS, TTL } from "@/shared/cache";
import { DomainError, ErrorCategory } from "@/shared/errors";

const sitemapLogger = logger.child({ module: "SitemapService" });

class SitemapGenerationError extends DomainError {
  constructor(reason: string, context: Record<string, unknown> = {}) {
    super(
      ErrorCategory.SERVICE_UNAVAILABLE,
      "Sitemap generation is incomplete",
      {
        reason,
        ...context,
      },
    );
  }
}

/**
 * Service for generating sitemap.xml
 * Collects all public repositories and user profiles
 */
interface ISitemapService {
  generateSitemap(): Promise<string>;
}

export class SitemapService implements ISitemapService {
  private cache: SitemapCache;
  // Sitemap is cached file-based (Docker-volume persisted, large XML,
  // stale-while-revalidate) rather than in Redis, but uses the shared TTL/key
  // conventions from @/shared/cache.
  private readonly CACHE_TTL_MS = TTL.HOUR_24;
  private static generation: Promise<string> | undefined;

  // Batch processing configuration
  /** Max concurrent Gitea API calls to avoid overwhelming the server */
  private static readonly BATCH_SIZE = 10;
  /** Delay between batches in milliseconds for rate limiting */
  private static readonly BATCH_DELAY_MS = 100;
  /** Number of users to fetch per page to limit memory usage */
  private static readonly USER_PAGE_SIZE = 1000;
  /** Maximum total users to fetch across all pages */
  private static readonly MAX_USERS_LIMIT = 50000;
  private static readonly REPOSITORY_PAGE_SIZE = 100;
  private static readonly MAX_REPOSITORY_PAGES = 1000;
  private static readonly MAX_SITEMAP_URLS = 50000;
  private static readonly MAX_SITEMAP_BYTES = 50 * 1024 * 1024;

  constructor(
    private database: DatabaseLayer,
    private config: Pick<AppConfig, "dashboard" | "gitea">,
  ) {
    this.cache = SitemapCache.getInstance();
  }

  /**
   * Generate complete sitemap XML
   * Strategy: Stale-while-revalidate pattern
   * - Always serve cached data immediately (even if expired)
   * - Trigger background refresh if cache is stale
   * - Only block if no cache exists
   */
  async generateSitemap(): Promise<string> {
    const cacheKey = CACHE_KEYS.sitemap.xml();

    // 1. Check for valid (non-expired) cache
    const validCache = this.cache.get(cacheKey);
    if (validCache) {
      return validCache;
    }

    // 2. Check for stale cache (expired but exists)
    const staleCache = this.cache.getStale(cacheKey);
    if (staleCache) {
      if (!SitemapService.generation) {
        void this.refreshSitemap(cacheKey).catch((error: unknown) => {
          sitemapLogger.error(
            "Background refresh failed; retaining stale sitemap",
            { error },
          );
        });
      }
      return staleCache;
    }

    // 3. No cache exists - must generate synchronously
    return this.refreshSitemap(cacheKey);
  }

  /**
   * Share one generation across cold requests and stale refreshes in this process.
   * The cache is updated only after the entire traversal and render succeed.
   */
  private refreshSitemap(cacheKey: string): Promise<string> {
    SitemapService.generation ??= Promise.resolve()
      .then(() => this.generateFreshSitemap())
      .then((xml) => {
        this.cache.set(cacheKey, xml, this.CACHE_TTL_MS);
        return xml;
      })
      .finally(() => {
        SitemapService.generation = undefined;
      });
    return SitemapService.generation;
  }

  /**
   * Generate fresh sitemap (extracted for reuse)
   */
  private async generateFreshSitemap(): Promise<string> {
    const urls = await this.collectAllUrls();
    if (urls.length > SitemapService.MAX_SITEMAP_URLS) {
      throw new SitemapGenerationError("sitemap-url-limit", {
        urls: urls.length,
      });
    }
    const xml = this.renderSitemapXml(urls);
    const bytes = Buffer.byteLength(xml, "utf8");
    if (bytes > SitemapService.MAX_SITEMAP_BYTES) {
      throw new SitemapGenerationError("sitemap-byte-limit", { bytes });
    }
    sitemapLogger.debug("Generated complete sitemap", {
      urls: urls.length,
      bytes,
    });
    return xml;
  }

  /**
   * Get all active users with pagination
   * Fetches users in pages to limit memory usage
   * Maximum of 50,000 users will be fetched
   *
   * @returns Array of all active users across all pages (max 50,000)
   */
  private async getAllActiveUsersWithPagination(): Promise<User[]> {
    const allUsers: User[] = [];
    let offset = 0;

    while (true) {
      // Probe once beyond a full limit to distinguish completion from truncation.
      const limit = Math.min(
        SitemapService.USER_PAGE_SIZE,
        SitemapService.MAX_USERS_LIMIT - allUsers.length + 1,
      );
      let users: User[];
      try {
        users = await this.database.models.user.getActiveUsersWithUsername(
          this.database.db,
          { limit, offset },
        );
      } catch {
        throw new SitemapGenerationError("user-page-failed", { offset });
      }
      allUsers.push(...users);
      if (allUsers.length > SitemapService.MAX_USERS_LIMIT) {
        throw new SitemapGenerationError("user-limit", { offset });
      }
      if (users.length < limit) return allUsers;
      offset += users.length;
    }
  }

  /** Fetch each user's pages sequentially, with at most ten users in flight. */
  private async collectAllUrls(): Promise<SitemapUrl[]> {
    const users = await this.getAllActiveUsersWithPagination();
    const usernames = [...new Set(users.map((user) => user.ledger_username))];
    const { results, errors } = await processBatch(
      usernames,
      (username) => this.fetchUserRepositories(username),
      {
        batchSize: SitemapService.BATCH_SIZE,
        delayBetweenBatches: SitemapService.BATCH_DELAY_MS,
      },
    );

    if (errors.length) {
      // Log our sanitized domain context, never the upstream response/body.
      for (const { index, error } of errors) {
        sitemapLogger.error("Failed to enumerate public repositories", {
          username: usernames[index],
          metadata: error instanceof DomainError ? error.metadata : undefined,
        });
      }
      throw new SitemapGenerationError("repository-traversal-failed", {
        usersFailed: errors.length,
      });
    }

    return results.flatMap((userRepo) =>
      userRepo === null
        ? []
        : [
            this.createUserProfileUrl(userRepo.username),
            ...userRepo.repositories.flatMap((repo) =>
              this.createRepositoryUrls(
                userRepo.username,
                repo.name,
                repo.updatedAt,
              ),
            ),
          ],
    );
  }

  private async fetchUserRepositories(
    username: string,
  ): Promise<UserRepositories | null> {
    const giteaClient = this.createUnauthenticatedGiteaClient();
    const repositories: UserRepositories["repositories"] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= SitemapService.MAX_REPOSITORY_PAGES; page++) {
      let response;
      try {
        response = await giteaClient.users.userListRepos(
          username,
          { page, limit: SitemapService.REPOSITORY_PAGE_SIZE },
          { format: "json" },
        );
      } catch (error) {
        const status =
          typeof error === "object" && error !== null && "status" in error
            ? error.status
            : undefined;
        // A first-page 404 denotes a missing user. A later 404 cannot prove
        // completion and must not publish the prefix already collected.
        if (status === 404 && page === 1) return null;
        throw new SitemapGenerationError("repository-page-failed", {
          page,
          status,
        });
      }

      // The generated client can return data:null after a JSON parse failure.
      if (!Array.isArray(response.data)) {
        throw new SitemapGenerationError("invalid-repository-page", { page });
      }
      if (response.data.length === 0) return { username, repositories };

      const previousCount = seen.size;
      for (const repo of response.data) {
        if (!repo || typeof repo.name !== "string" || !repo.name) {
          throw new SitemapGenerationError("invalid-repository", { page });
        }
        // Count raw entries before filtering: a private-only page is not EOF.
        if (seen.has(repo.name)) continue;
        seen.add(repo.name);
        if (repo.private) continue;
        const updatedAt = repo.updated_at
          ? new Date(repo.updated_at)
          : new Date();
        if (!Number.isFinite(updatedAt.getTime())) {
          throw new SitemapGenerationError("invalid-repository-date", { page });
        }
        repositories.push({ name: repo.name, updatedAt, isPrivate: false });
      }
      if (seen.size === previousCount) {
        throw new SitemapGenerationError("repeated-repository-page", { page });
      }
      // Never infer EOF from data.length < requested limit: Gitea may cap it.
    }
    throw new SitemapGenerationError("repository-page-limit");
  }

  /**
   * Create user profile URL
   */
  private createUserProfileUrl(username: string): SitemapUrl {
    return {
      loc: `${this.config.dashboard.url.replace(/\/$/, "")}/ledger/${encodeURIComponent(username)}`,
      changefreq: "weekly",
      priority: 0.6,
    };
  }

  /**
   * Create repository URLs (overview + subpages)
   */
  private createRepositoryUrls(
    username: string,
    repoName: string,
    updatedAt: Date,
  ): SitemapUrl[] {
    const baseUrl = this.config.dashboard.url.replace(/\/$/, "");
    const basePath = `/ledger/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}`;
    const lastmod = updatedAt.toISOString();

    // Priority pages for each repository
    const pages = [
      { path: "", priority: 0.8, changefreq: "daily" as const }, // Overview
      { path: "/journal", priority: 0.7, changefreq: "daily" as const },
      {
        path: "/balance-sheet",
        priority: 0.7,
        changefreq: "weekly" as const,
      },
      {
        path: "/income-statement",
        priority: 0.7,
        changefreq: "weekly" as const,
      },
      {
        path: "/trial-balance",
        priority: 0.6,
        changefreq: "weekly" as const,
      },
      {
        path: "/statistics",
        priority: 0.5,
        changefreq: "monthly" as const,
      },
      { path: "/holdings", priority: 0.5, changefreq: "weekly" as const },
    ];

    return pages.map((page) => ({
      loc: `${baseUrl}${basePath}${page.path}`,
      lastmod,
      changefreq: page.changefreq,
      priority: page.priority,
    }));
  }

  /**
   * Render sitemap URLs as XML
   */
  private renderSitemapXml(urls: SitemapUrl[]): string {
    const urlEntries = urls
      .map((url) => {
        let entry = `  <url>\n    <loc>${this.escapeXml(url.loc)}</loc>`;

        if (url.lastmod) {
          entry += `\n    <lastmod>${url.lastmod}</lastmod>`;
        }
        if (url.changefreq) {
          entry += `\n    <changefreq>${url.changefreq}</changefreq>`;
        }
        if (url.priority !== undefined) {
          entry += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
        }

        entry += `\n  </url>`;
        return entry;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Create unauthenticated Gitea client for public data
   */
  private createUnauthenticatedGiteaClient(): GiteaApi<unknown> {
    const baseUrl = `${this.config.gitea.internalBaseUrl}/api/v1`;
    return new GiteaApi({ baseUrl });
  }
}
