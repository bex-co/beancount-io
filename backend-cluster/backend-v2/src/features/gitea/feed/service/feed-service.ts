import Parser from "rss-parser";
import {
  FeedItem,
  FeedResponse,
  GetFeedArgs,
  FeedSource,
} from "../api/feed-resolver.types";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import { UnauthenticatedError } from "@/shared/errors";
import { User } from "@/features/auth/data/user-model";
import { transformActivityToFeedItem } from "./activity-transformer";
import { Activity } from "@/features/gitea/client/gitea-api";
import type { LedgerPublic } from "@/foundation/fava/Api";
import { stripHtml } from "./html-utils";
import { logger } from "@/shared/logger";
import { CACHE_KEYS, TTL, type CacheHelper } from "@/shared/cache";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  userResource,
  type IAuthorizationService,
} from "@/server/api/authorization";

const CACHE_TTL_MS = TTL.MIN_5;
const BLOG_BASE_URL = "https://beancount.io";
const MAX_REPOSITORIES = 100; // Maximum number of repositories to fetch

/**
 * Internal types for feed parsing with type safety
 */
interface BaseFeedItem {
  id: string;
  title: string;
  summary: string;
  link: string;
  publishedAt: Date;
  author?: string;
  authorAvatar?: string;
}

interface BlogFeedItemInternal extends BaseFeedItem {
  source: FeedSource.BLOG;
}

export interface IFeedService {
  getFeed(args: GetFeedArgs, identity: Identity): Promise<FeedResponse>;
}

/**
 * Service for fetching and parsing RSS/Atom feeds
 * Handles caching, pagination, and multi-language feed URLs
 */
export class FeedService implements IFeedService {
  private parser: Parser;

  constructor(
    private readonly cacheHelper: CacheHelper,
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly models: Pick<IModels, "user">,
    private readonly db: DbExecutor,
    private readonly authorization: IAuthorizationService,
  ) {
    this.parser = new Parser({
      customFields: {
        item: ["dc:creator", "author"],
      },
    });
  }

  /**
   * Get feed items with pagination
   * @param args Pagination and filter arguments
   * @param identity The authenticated caller
   * @returns Paginated feed response
   */
  async getFeed(args: GetFeedArgs, identity: Identity): Promise<FeedResponse> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_SOCIAL_FEED_READ,
      resource: userResource(identity.userId),
    });
    const { offset = 0, limit = 10, locale: clientLocale } = args;

    // Get user locale from current user
    const user = await this.models.user.getById(this.db, identity.userId);
    if (!user) {
      throw new UnauthenticatedError("User not found");
    }

    // Priority: client-provided locale > user profile locale > default "en"
    const locale = clientLocale || user.locale || "en";

    // Get all feed items (from cache or fresh fetch)
    const allItems = await this.getFeedItems(locale, user);

    // Apply pagination
    const paginatedItems = allItems.slice(offset, offset + limit);
    const hasMore = offset + limit < allItems.length;

    return {
      items: paginatedItems,
      total: allItems.length,
      hasMore,
    };
  }

  /**
   * Get all feed items for a locale (with caching)
   * Merges blog feeds and Gitea feeds (account + repos)
   * @param locale User's language preference
   * @returns Array of feed items sorted by publishedAt
   */
  private async getFeedItems(locale: string, user: User): Promise<FeedItem[]> {
    // Fetch blog feed using dedicated blog parser
    const blogCacheKey = CACHE_KEYS.feed.bySourceLocale("blog", locale);
    let blogItems: FeedItem[] = [];
    const cachedBlog = await this.cacheHelper.get<FeedItem[]>(blogCacheKey);
    if (cachedBlog) {
      blogItems = cachedBlog;
    } else {
      const feedUrl = this.getFeedUrl(locale);
      blogItems = await this.fetchAndParseBlogFeed(feedUrl);
      await this.cacheHelper.set(blogCacheKey, blogItems, CACHE_TTL_MS);
    }

    // Fetch Gitea feeds (new logic)
    let giteaItems: FeedItem[] = [];
    try {
      giteaItems = await this.getGiteaFeedItems(user);
    } catch (error) {
      logger.error("Failed to fetch Gitea feeds", { error });
    }

    // Merge and sort by publishedAt (newest first)
    const allItems = [...blogItems, ...giteaItems];
    allItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    return allItems;
  }

  /**
   * Determine feed URL based on user locale
   * @param locale User's language preference
   * @returns Full feed URL
   */
  private getFeedUrl(locale: string): string {
    // List of all supported locales with dedicated feeds
    const supportedLocales = [
      "bg",
      "ca",
      "de",
      "es",
      "fa",
      "fr",
      "ja",
      "ko",
      "nl",
      "pt",
      "ru",
      "sk",
      "uk",
      "zh",
    ];

    // If locale is supported, use localized feed
    if (supportedLocales.includes(locale)) {
      return `${BLOG_BASE_URL}/${locale}/blog/atom.xml`;
    }

    // Default to English for unsupported locales or "en"
    return `${BLOG_BASE_URL}/blog/atom.xml`;
  }

  /**
   * Fetch and parse blog RSS feed
   * Optimized for blog posts with aggressive HTML stripping and whitespace normalization
   * @param url Blog feed URL to fetch
   * @returns Array of parsed blog feed items
   */
  private async fetchAndParseBlogFeed(
    url: string,
  ): Promise<BlogFeedItemInternal[]> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const feed = await this.parser.parseString(xmlText);

      return (feed.items || []).map((item) => ({
        id: item.guid || item.link || `${item.title}-${item.pubDate}`,
        title: stripHtml(item.title || "Untitled", true),
        summary: stripHtml(item.contentSnippet || item.content || "", true),
        link: item.link || "",
        publishedAt: new Date(item.pubDate || Date.now()),
        author: this.extractAuthor(item),
        authorAvatar: undefined,
        source: FeedSource.BLOG,
      }));
    } catch (error) {
      logger.error("Failed to fetch blog feed", { url, error });
      return [];
    }
  }

  /**
   * Extract author name from RSS item
   * Checks multiple possible author fields
   * @param item RSS item with custom fields from rss-parser
   * @returns Author name or undefined
   */
  private extractAuthor(
    item: Parser.Item & Record<string, unknown>,
  ): string | undefined {
    // Try various author fields in order of preference
    const dcCreator = item["dc:creator"] as string | undefined;
    const authorName =
      typeof item.author === "string"
        ? item.author
        : (item.author as { name?: string } | undefined)?.name;
    return authorName || dcCreator || item.creator || undefined;
  }

  /**
   * Get list of user repositories from Fava API
   * Required for per-repository Activity API fallback
   * @param user User object
   * @returns Array of repositories
   */
  private async getUserRepositories(user: User): Promise<LedgerPublic[]> {
    const cacheKey = CACHE_KEYS.feed.giteaRepoListByUser(user.id);

    // Check cache first
    const cached = await this.cacheHelper.get<LedgerPublic[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from Fava API
    try {
      const { favaApiClient } = await this.favaClientFactory.getApiContext(
        user.id,
      );
      const response = await favaApiClient.ledgers.listLedgers({
        limit: MAX_REPOSITORIES,
      });

      // Extract repository array from response
      const repos = response.data.data || [];

      // Cache the results
      await this.cacheHelper.set(cacheKey, repos, CACHE_TTL_MS);

      return repos;
    } catch (error) {
      logger.error("Failed to fetch repositories from Fava API", { error });
      return [];
    }
  }

  /**
   * Get all Gitea activity feed items for a user
   * Hybrid approach: Try user-level Activity API first, fall back to per-repository API
   * Results are cached for 5 minutes to reduce load on Gitea
   * @param user User object with ledger_username
   * @returns Array of feed items from Gitea activities
   */
  private async getGiteaFeedItems(user: User): Promise<FeedItem[]> {
    const cacheKey = CACHE_KEYS.feed.giteaByUser(user.id);

    // Check cache first
    const cached = await this.cacheHelper.get<FeedItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const giteaClient = await this.giteaClientFactory.getUserApiClient(
        user.id,
      );

      // Get user repositories
      const repos = await this.getUserRepositories(user);
      const repoFullNames = repos
        .map((r) => r.full_name)
        .filter((name): name is string => !!name);

      // Fetch activities for each repository using repo-level Activity API
      const repoActivityPromises = repoFullNames.map((fullName) => {
        const [owner, repo] = fullName.split("/");
        return giteaClient.repos.repoListActivityFeeds(
          owner,
          repo,
          {
            limit: 30,
          },
          {
            format: "json",
          },
        );
      });

      const repoResults = await Promise.allSettled(repoActivityPromises);
      const repoActivities: Activity[] = repoResults
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => {
          if (result.status === "fulfilled") {
            return result.value.data || [];
          }
          return [];
        });

      // Keep each activity independent so commit identities remain available
      // for the dashboard's immutable audit-trail links.
      const items = repoActivities
        .map(transformActivityToFeedItem)
        .filter((item): item is FeedItem => item !== null);
      await this.cacheHelper.set(cacheKey, items, CACHE_TTL_MS);
      return items;
    } catch (error) {
      logger.error("Failed to fetch Gitea activity items", { error });
      return [];
    }
  }
}
