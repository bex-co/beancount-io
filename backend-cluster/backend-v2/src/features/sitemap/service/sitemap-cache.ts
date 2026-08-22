import fs from "fs";
import path from "path";
import { logger } from "@/shared/logger";

const cacheLogger = logger.child({ module: "SitemapCache" });

interface CacheMetadata {
  expiresAt: number;
}

/**
 * Sitemap-specific cache with singleton pattern
 * Uses file-based caching to persist across restarts
 * Caches generated sitemap XML to reduce load on Gitea
 *
 * PERSISTENCE:
 * - In Docker: .cache/ is mounted as a volume (./data/backend-v2-cache:/app/.cache)
 * - Cache persists across container restarts and redeployments
 * - Cache files are stored on the host filesystem in _infra/data/backend-v2-cache/
 */
export class SitemapCache {
  private static instance: SitemapCache;
  private cacheDir: string;

  private constructor() {
    // Cache directory: backend-v2/.cache/
    // In Docker: this is mounted to host filesystem for persistence
    this.cacheDir = path.join(process.cwd(), ".cache");
    this.ensureCacheDirectory();
  }

  public static getInstance(): SitemapCache {
    if (!SitemapCache.instance) {
      SitemapCache.instance = new SitemapCache();
    }
    return SitemapCache.instance;
  }

  /**
   * Get cached data if valid (not expired)
   */
  public get(key: string): string | undefined {
    try {
      const filePath = this.getFilePath(key);
      const metaPath = this.getMetaPath(key);

      // Check if both files exist
      if (!fs.existsSync(filePath) || !fs.existsSync(metaPath)) {
        return undefined;
      }

      // Read metadata to check expiration
      const metaContent = fs.readFileSync(metaPath, "utf-8");
      const metadata: CacheMetadata = JSON.parse(metaContent);

      if (Date.now() > metadata.expiresAt) {
        // File expired - return undefined but DON'T delete
        // (allows stale-while-revalidate pattern)
        return undefined;
      }

      // Read and return cached data
      return fs.readFileSync(filePath, "utf-8");
    } catch (error) {
      cacheLogger.error("Error reading cache", { key, error });
      return undefined;
    }
  }

  /**
   * Get cached data even if expired (stale data)
   * Used for stale-while-revalidate pattern
   */
  public getStale(key: string): string | undefined {
    try {
      const filePath = this.getFilePath(key);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return undefined;
      }

      // Read and return cached data without checking expiration
      return fs.readFileSync(filePath, "utf-8");
    } catch (error) {
      cacheLogger.error("Error reading stale cache", { key, error });
      return undefined;
    }
  }

  /**
   * Check if cached data exists but is expired
   * Returns true if cache exists and is stale
   */
  public isExpired(key: string): boolean {
    try {
      const filePath = this.getFilePath(key);
      const metaPath = this.getMetaPath(key);

      // If files don't exist, not expired (just missing)
      if (!fs.existsSync(filePath) || !fs.existsSync(metaPath)) {
        return false;
      }

      // Read metadata to check expiration
      const metaContent = fs.readFileSync(metaPath, "utf-8");
      const metadata: CacheMetadata = JSON.parse(metaContent);

      return Date.now() > metadata.expiresAt;
    } catch (error) {
      cacheLogger.error("Error checking expiration", { key, error });
      return false;
    }
  }

  /**
   * Set cache data with TTL
   */
  public set(key: string, data: string, ttlMs: number): void {
    try {
      const filePath = this.getFilePath(key);
      const metaPath = this.getMetaPath(key);

      // Create metadata with expiration time
      const metadata: CacheMetadata = {
        expiresAt: Date.now() + ttlMs,
      };

      // Write atomically: write to temp files, then rename
      const tempDataPath = `${filePath}.tmp`;
      const tempMetaPath = `${metaPath}.tmp`;

      fs.writeFileSync(tempDataPath, data, "utf-8");
      fs.writeFileSync(tempMetaPath, JSON.stringify(metadata), "utf-8");

      fs.renameSync(tempDataPath, filePath);
      fs.renameSync(tempMetaPath, metaPath);

      cacheLogger.debug("Cached to file", {
        key,
        bytes: data.length,
      });
    } catch (error) {
      cacheLogger.error("Error writing cache", { key, error });
    }
  }

  /**
   * Clear all cached files
   */
  public clear(): void {
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file !== ".gitkeep") {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      }
      cacheLogger.debug("Cleared all cache files");
    } catch (error) {
      cacheLogger.error("Error clearing cache", { error });
    }
  }

  /**
   * Get file path for a cache key
   */
  private getFilePath(key: string): string {
    // Sanitize key to make it filesystem-safe
    const sanitized = key.replace(/[^a-zA-Z0-9-_]/g, "_");
    return path.join(this.cacheDir, `${sanitized}.xml`);
  }

  /**
   * Get metadata file path for a cache key
   */
  private getMetaPath(key: string): string {
    const sanitized = key.replace(/[^a-zA-Z0-9-_]/g, "_");
    return path.join(this.cacheDir, `${sanitized}.meta.json`);
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDirectory(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
        cacheLogger.debug("Created cache directory", {
          cacheDir: this.cacheDir,
        });
      }
    } catch (error) {
      cacheLogger.error("Error creating cache directory", { error });
    }
  }
}
