import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { lock, LOCK_KEYS } from "@/shared/lock";
import { Logger } from "drizzle-orm/logger";

import { logger, type ILogger } from "@/shared/logger";

const formatSqlQuery = (query: { sql: string; params: unknown[] }) => {
  return query.sql.replace(/\$\d+/g, (match: string) => {
    const index = parseInt(match.slice(1));
    return JSON.stringify(query.params[index - 1]);
  });
};

class DrizzleLogger implements Logger {
  private readonly logger: ILogger;
  constructor() {
    this.logger = logger.child({ module: "drizzle" });
  }
  logQuery(query: string, params: unknown[]): void {
    this.logger.debug(formatSqlQuery({ sql: query, params }));
  }

  splat(query: string, params: unknown[]): string {
    return formatSqlQuery({ sql: query, params });
  }
}

// Type alias for database executor - supports both normal db and transaction contexts
export type DbExecutor = NodePgDatabase;

let dbInstance: NodePgDatabase | null = null;
let pool: Pool | null = null;

/**
 * Creates and validates a PostgreSQL database connection.
 * Uses singleton pattern - returns existing connection if already created.
 * Thread-safe: uses async-lock to prevent race conditions during concurrent initialization.
 *
 * @param connectionString - PostgreSQL connection URI
 * @returns Drizzle database instance
 * @throws Error if connection validation fails, connection timeout (10s), or lock timeout (30s)
 */
export async function createDatabaseConnection(
  connectionString: string,
): Promise<NodePgDatabase> {
  if (!connectionString) {
    throw new Error(
      "PostgreSQL URI required: ensure 'config.postgres.uri' is set",
    );
  }

  // Return existing instance if already initialized
  if (dbInstance) {
    return dbInstance;
  }

  // Use lock to prevent concurrent initialization
  return lock.acquire(LOCK_KEYS.INFRA.INIT_POSTGRES, async () => {
    // Double-check after acquiring lock
    if (dbInstance) {
      return dbInstance;
    }

    // Create connection pool
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 10000, // 10 seconds
    });
    dbInstance = drizzle(pool, { logger: new DrizzleLogger() });

    // Validate connection with a simple query
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
    } catch (error) {
      // Clean up on validation failure
      await pool.end();
      pool = null;
      dbInstance = null;

      throw new Error(
        `PostgreSQL connection validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return dbInstance;
  });
}

export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}
