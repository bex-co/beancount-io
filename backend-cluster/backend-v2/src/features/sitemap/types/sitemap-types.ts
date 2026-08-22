/**
 * Represents a URL entry in the sitemap
 */
export interface SitemapUrl {
  loc: string; // URL location
  lastmod?: string; // Last modification date (ISO 8601)
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number; // 0.0 to 1.0
}

/**
 * Options for sitemap generation
 */
export interface SitemapGenerationOptions {
  baseUrl: string;
  maxRepositoriesPerUser?: number; // Limit repos per user (default: 100)
  maxTotalUrls?: number; // Limit total URLs (default: 50000)
}

/**
 * Internal data structures for efficient processing
 */
export interface UserRepositories {
  username: string;
  repositories: Array<{
    name: string;
    updatedAt: Date;
    isPrivate: boolean;
  }>;
}
