import { type DatabaseLayer } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { Api as GiteaApi } from "@/features/gitea/client/gitea-api";
import { User } from "@/features/auth/data/user-model";
import { SitemapCache } from "./sitemap-cache";
import { SitemapUrl, UserRepositories } from "../types/sitemap-types";
import { processBatch } from "@/shared/batch-processor";
import { logger } from "@/shared/logger";
import { CACHE_KEYS, TTL } from "@/shared/cache";

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
  private static isRefreshing = false; // Prevent concurrent refreshes

  // Batch processing configuration
  /** Max concurrent Gitea API calls to avoid overwhelming the server */
  private static readonly BATCH_SIZE = 10;
  /** Delay between batches in milliseconds for rate limiting */
  private static readonly BATCH_DELAY_MS = 100;
  /** Number of users to fetch per page to limit memory usage */
  private static readonly USER_PAGE_SIZE = 1000;
  /** Maximum total users to fetch across all pages */
  private static readonly MAX_USERS_LIMIT = 50000;

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
      logger.debug("Serving valid cache");
      return validCache;
    }

    // 2. Check for stale cache (expired but exists)
    const staleCache = this.cache.getStale(cacheKey);
    if (staleCache) {
      logger.debug("Serving stale cache, triggering background refresh");

      // Trigger background refresh (non-blocking)
      this.refreshInBackground(cacheKey);

      // Return stale data immediately
      return staleCache;
    }

    // 3. No cache exists - must generate synchronously
    logger.debug("No cache found, generating fresh sitemap");
    const xml = await this.generateFreshSitemap();
    this.cache.set(cacheKey, xml, this.CACHE_TTL_MS);
    return xml;
  }

  /**
   * Refresh cache in background without blocking the request
   */
  private refreshInBackground(cacheKey: string): void {
    // Prevent multiple concurrent refreshes
    if (SitemapService.isRefreshing) {
      logger.debug("Refresh already in progress, skipping");
      return;
    }

    SitemapService.isRefreshing = true;

    // Use setImmediate to run in next event loop tick (non-blocking)
    setImmediate(async () => {
      try {
        logger.debug("Starting background refresh");
        const xml = await this.generateFreshSitemap();
        this.cache.set(cacheKey, xml, this.CACHE_TTL_MS);
        logger.debug("Background refresh completed");
      } catch (error) {
        logger.error("Background refresh failed", { error });
      } finally {
        SitemapService.isRefreshing = false;
      }
    });
  }

  /**
   * Generate fresh sitemap (extracted for reuse)
   */
  private async generateFreshSitemap(): Promise<string> {
    const urls = await this.collectAllUrls();
    return this.renderSitemapXml(urls);
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
    let hasMorePages = true;
    let pagesProcessed = 0;

    logger.debug("Fetching all active users with pagination", {
      pageSize: SitemapService.USER_PAGE_SIZE,
      maxLimit: SitemapService.MAX_USERS_LIMIT,
    });

    while (hasMorePages) {
      // Check if we've reached the maximum limit
      if (allUsers.length >= SitemapService.MAX_USERS_LIMIT) {
        logger.warn("Reached maximum user limit, stopping pagination", {
          currentCount: allUsers.length,
          maxLimit: SitemapService.MAX_USERS_LIMIT,
          pagesProcessed,
        });
        break;
      }

      // Fetch a page of active users
      let users: User[];
      try {
        users = (await this.database.models.user.getActiveUsersWithUsername(
          this.database.db,
          {
            limit: SitemapService.USER_PAGE_SIZE,
            offset,
          },
        )) as User[];
      } catch (error) {
        logger.error("Failed to fetch active users from database", {
          error,
          offset,
          pagesProcessed,
        });
        break; // Stop processing on database error, return what we have
      }

      // Check if we have more pages
      hasMorePages = users.length === SitemapService.USER_PAGE_SIZE;
      pagesProcessed += 1;

      if (users.length === 0) {
        logger.debug("No more users to process", { offset, pagesProcessed });
        break;
      }

      logger.debug("Fetched user page", {
        page: pagesProcessed,
        userCount: users.length,
        offset,
      });

      allUsers.push(...users);
      offset += SitemapService.USER_PAGE_SIZE;
    }

    logger.debug("Completed fetching all active users", {
      totalUsers: allUsers.length,
      pagesProcessed,
      hitLimit: allUsers.length >= SitemapService.MAX_USERS_LIMIT,
    });

    return allUsers;
  }

  /**
   * Collect all URLs for sitemap
   * Combines user profiles + repository pages
   *
   * Uses paginated user fetching and batch processing with controlled
   * concurrency to prevent overwhelming the Gitea server and consuming
   * excessive memory.
   */
  private async collectAllUrls(): Promise<SitemapUrl[]> {
    const startTime = Date.now();

    // Metrics tracking
    const metrics = {
      usersTotal: 0,
      usersProcessed: 0,
      usersFailed: 0,
      reposFound: 0,
      urlsGenerated: 0,
    };

    logger.debug("Starting sitemap URL collection with pagination", {
      pageSize: SitemapService.USER_PAGE_SIZE,
    });

    // 1. Fetch all active users with pagination
    const users = await this.getAllActiveUsersWithPagination();
    metrics.usersTotal = users.length;

    // 2. Fetch repositories for users in batches with controlled concurrency
    const { results: userRepos, errors } = await processBatch(
      users,
      async (user) => this.fetchUserRepositories(user.ledger_username),
      {
        batchSize: SitemapService.BATCH_SIZE,
        delayBetweenBatches: SitemapService.BATCH_DELAY_MS,
        onProgress: (processed, total) => {
          logger.debug("Processing user batch", {
            processed,
            total,
            remaining: total - processed,
          });
        },
      },
    );

    // Filter out null results (failed fetches)
    const validUserRepos = userRepos.filter(
      (repo): repo is UserRepositories => repo !== null,
    );

    // Update metrics
    metrics.usersProcessed = validUserRepos.length;
    metrics.usersFailed = errors.length;
    metrics.reposFound = validUserRepos.reduce(
      (sum, ur) => sum + ur.repositories.length,
      0,
    );

    // Log individual failures for debugging
    errors.forEach(({ index, error }) => {
      logger.error("Failed to fetch user repositories", {
        username: users[index]?.ledger_username,
        error: error.message,
      });
    });

    // 3. Generate URLs for each user and their repos using functional style
    const urls = validUserRepos.flatMap((userRepo) => [
      this.createUserProfileUrl(userRepo.username),
      ...userRepo.repositories.flatMap((repo) =>
        this.createRepositoryUrls(userRepo.username, repo.name, repo.updatedAt),
      ),
    ]);

    // Update final metrics
    metrics.urlsGenerated = urls.length;
    const duration = Date.now() - startTime;

    // Log completion with detailed metrics
    logger.debug("Sitemap URL collection completed", {
      ...metrics,
      durationMs: duration,
      successRate:
        metrics.usersTotal > 0
          ? `${((metrics.usersProcessed / metrics.usersTotal) * 100).toFixed(1)}%`
          : "N/A",
    });

    return urls;
  }

  /**
   * Fetch public repositories for a user from Gitea
   */
  private async fetchUserRepositories(
    username: string,
  ): Promise<UserRepositories | null> {
    try {
      // Create unauthenticated Gitea client
      const giteaClient = this.createUnauthenticatedGiteaClient();

      // Fetch repositories (Gitea handles pagination internally)
      const response = await giteaClient.users.userListRepos(
        username,
        {
          limit: 100, // Max repos per user
        },
        {
          format: "json",
        },
      );

      // Filter out private repositories at the source
      const repos = (response.data || [])
        .filter((r) => !r.private)
        .map((r) => ({
          name: r.name || "",
          updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
          isPrivate: false, // Already filtered above
        }));

      return {
        username,
        repositories: repos,
      };
    } catch {
      // Don't log here - let caller handle error logging with batch context
      return null;
    }
  }

  /**
   * Create user profile URL
   */
  private createUserProfileUrl(username: string): SitemapUrl {
    return {
      loc: `${this.config.dashboard.url}/ledger/${username}/`,
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
    const baseUrl = this.config.dashboard.url;
    const basePath = `/ledger/${username}/${repoName}`;
    const lastmod = updatedAt.toISOString();

    // Priority pages for each repository
    const pages = [
      { path: "/", priority: 0.8, changefreq: "daily" as const }, // Overview
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
    // Use port 3000 for internal Docker communication (container internal port)
    const baseUrl = `${this.config.gitea.internalBaseUrl}/api/v1`;
    return new GiteaApi({ baseUrl });
  }
}
