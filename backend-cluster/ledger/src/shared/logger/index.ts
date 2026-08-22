import winston from "winston";
import LokiTransport from "winston-loki";
import { config } from "@/config";
import { getRequestContext } from "@/shared/async-context";

/**
 * Logger interface for abstracting logging implementation.
 * This allows easy migration to different logging libraries in the future.
 */
export interface ILogger {
  /**
   * Log a debug message (verbose debugging information, hidden in production by default)
   * @param message - The log message
   * @param meta - Optional metadata (object or error) with additional context
   */
  debug(message: string, meta?: unknown): void;

  /**
   * Log an info message (general informational messages)
   * @param message - The log message
   * @param meta - Optional metadata (object or error) with additional context
   */
  info(message: string, meta?: unknown): void;

  /**
   * Log a warning message (recoverable errors, deprecated features)
   * @param message - The log message
   * @param meta - Optional metadata (object or error) with additional context
   */
  warn(message: string, meta?: unknown): void;

  /**
   * Log an error message (failures, exceptions)
   * @param message - The log message
   * @param meta - Optional metadata (object or error) with additional context
   */
  error(message: string, meta?: unknown): void;

  /**
   * Create a child logger with a module context that will be included in all log messages.
   * The context is merged with any metadata passed to individual log calls.
   *
   * @param context - Context object with module name
   * @returns A new logger instance with the module context pre-applied
   *
   * @example
   * ```typescript
   * const authLogger = logger.child({ module: 'auth-routes' });
   * authLogger.debug("User logged in", { userId: "123" });
   * // Output: ... module: "auth-routes", userId: "123" ...
   * ```
   */
  child(context: { module: string }): ILogger;

  /**
   * The current log level (e.g., "debug", "info", "warn", "error")
   * Available for configuration and testing purposes
   */
  level: string;
}

/**
 * Base abstract logger class providing common Winston-based logging functionality.
 * Accepts a Winston instance via dependency injection for flexibility and testability.
 */
abstract class BaseLogger implements ILogger {
  protected winstonInstance: winston.Logger;

  constructor(winstonInstance: winston.Logger) {
    this.winstonInstance = winstonInstance;
  }

  get level(): string {
    return this.winstonInstance.level;
  }

  /**
   * Merge async context (requestId, userId) with provided metadata.
   * This is shared across all logger implementations.
   */
  protected mergeContext(meta?: unknown): unknown {
    const context = getRequestContext();
    if (!context) {
      return meta;
    }

    // Extract correlation fields from context
    const { requestId, userId, ...otherContext } = context;
    const correlationData: Record<string, unknown> = {};

    if (requestId) {
      correlationData.requestId = requestId;
    }
    if (userId) {
      correlationData.userId = userId;
    }

    // If there's other context data, include it
    if (Object.keys(otherContext).length > 0) {
      Object.assign(correlationData, otherContext);
    }

    // Merge with provided metadata (metadata takes precedence)
    if (meta && typeof meta === "object") {
      return { ...correlationData, ...meta };
    }

    return Object.keys(correlationData).length > 0 ? correlationData : meta;
  }

  debug(message: string, meta?: unknown): void {
    this.winstonInstance.debug(message, this.mergeContext(meta));
  }

  info(message: string, meta?: unknown): void {
    this.winstonInstance.info(message, this.mergeContext(meta));
  }

  warn(message: string, meta?: unknown): void {
    this.winstonInstance.warn(message, this.mergeContext(meta));
  }

  error(message: string, meta?: unknown): void {
    this.winstonInstance.error(message, this.mergeContext(meta));
  }

  child(context: { module: string }): ILogger {
    // Create a wrapper that merges context with metadata on each log call
    const childInstance = this.winstonInstance.child(context);

    return {
      debug: (message: string, meta?: unknown) => {
        childInstance.debug(message, this.mergeContext(meta));
      },
      info: (message: string, meta?: unknown) => {
        childInstance.info(message, this.mergeContext(meta));
      },
      warn: (message: string, meta?: unknown) => {
        childInstance.warn(message, this.mergeContext(meta));
      },
      error: (message: string, meta?: unknown) => {
        childInstance.error(message, this.mergeContext(meta));
      },
      child: (additionalContext: { module: string }) => {
        // Note: Creating a child of a child will replace the module context
        return this.child(additionalContext);
      },
      level: this.winstonInstance.level,
    };
  }
}

/**
 * Production logger with compact JSON format and optional Loki integration.
 * Optimized for log aggregation tools with structured logging.
 */
class ProductionLogger extends BaseLogger {
  constructor() {
    super(ProductionLogger.createWinstonInstance());
  }

  private static createWinstonInstance(): winston.Logger {
    const { createLogger, format, transports } = winston;
    const { combine, timestamp, errors } = format;

    const productionTransports: winston.transport[] = [
      new transports.Console(),
    ];

    // Add Loki transport if LOKI_HOST is configured
    if (config.loki?.host) {
      // CRITICAL: Whitelist approach to prevent cardinality explosion
      // ONLY these fields become Loki labels. Everything else stays in JSON.
      const SAFE_LABEL_FIELDS = ["level", "module"] as const;

      const lokiFormat = format((info) => {
        // Extract ONLY whitelisted fields as labels
        const labels: Record<string, string> = {};

        SAFE_LABEL_FIELDS.forEach((field) => {
          if (info[field] && typeof info[field] === "string") {
            labels[field] = info[field];
          }
        });

        // Set level default if not present
        if (!labels.level) {
          labels.level = info.level || "info";
        }

        // Store labels in a property that winston-loki will merge
        info.labels = labels;

        return info;
      })();

      productionTransports.push(
        new LokiTransport({
          host: config.loki.host,
          labels: { app: "beancount-ledger-v2", env: config.env },
          json: true,
          format: combine(lokiFormat, format.json()),
          replaceTimestamp: true,
          onConnectionError: (err) => {
            // Log Loki connection errors to console (avoid infinite loop)
            console.error("Loki connection error:", err);
          },
        }),
      );
    }

    return createLogger({
      level: "info",
      format: combine(
        timestamp(),
        errors({ stack: true }),
        format.json(), // Compact single-line JSON
      ),
      transports: productionTransports,
    });
  }
}

/**
 * Development logger with human-readable text format and colorization.
 * Automatically silenced during tests (JEST_WORKER_ID or NODE_ENV=test).
 */
class DevelopmentLogger extends BaseLogger {
  constructor() {
    super(DevelopmentLogger.createWinstonInstance());
  }

  private static createWinstonInstance(): winston.Logger {
    const { createLogger, format, transports } = winston;
    const { combine, timestamp, printf } = format;

    // Mute logs during tests (detect by Jest worker or NODE_ENV=test)
    const isSilent =
      process.env.JEST_WORKER_ID !== undefined || config.env === "test";

    // Development: Human-readable text format
    const textFormat = printf(
      ({ level, message, timestamp: ts, ...metadata }) => {
        const { module, ...meta } = metadata;

        // Format metadata as indented JSON for readability
        const metaStr =
          Object.keys(meta).length > 0
            ? `\n${JSON.stringify(meta, null, 2)}`
            : "";

        return `${ts} ${level}: ${module ? `[${module}] ` : `[global] `}${message}${metaStr}`;
      },
    );

    return createLogger({
      level: "debug",
      format: combine(timestamp(), textFormat),
      transports: [
        new transports.Console({
          format: combine(format.colorize(), timestamp(), textFormat),
          silent: isSilent,
        }),
      ],
    });
  }
}

/**
 * Factory function to create the appropriate logger based on environment.
 * Returns ProductionLogger for production, DevelopmentLogger otherwise.
 */
function createLogger(): ILogger {
  if (config.env === "production") {
    return new ProductionLogger();
  }
  return new DevelopmentLogger();
}

/**
 * Singleton logger instance.
 * Use this throughout the application for all logging needs.
 *
 * Automatically configured based on environment:
 * - Production: JSON format with optional Loki integration
 * - Development/Test: Human-readable text format with colors
 *
 * @example
 * ```typescript
 * import { logger } from "@/shared/logger";
 *
 * // Basic logging
 * logger.debug("User logged in", { userId: "123", email: "user@example.com" });
 * logger.error("Failed to fetch data", { endpoint: "/api/users", error });
 *
 * // Create module-scoped child logger
 * const authLogger = logger.child({ module: "auth-routes" });
 * authLogger.debug("Login attempt", { userId: "123" });
 * // Output: ... module: "auth-routes", msg: "Login attempt", userId: "123" ...
 * ```
 */
export const logger: ILogger = createLogger();
