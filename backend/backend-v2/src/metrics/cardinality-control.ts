/**
 * Cardinality Control Utilities
 *
 * This module provides utilities to prevent metrics data inflation by:
 * 1. Normalizing routes to templates
 * 2. Grouping status codes into classes
 * 3. Validating label values
 */

import { logger } from "@/shared/logger";

/**
 * Normalize route path to template format
 *
 * Converts dynamic route segments to placeholders to prevent cardinality explosion.
 *
 * Examples:
 *   /users/123 → /users/:id
 *   /api/ledgers/abc-def-123/files → /api/ledgers/:ledgerId/files
 *   /users/john@example.com → /users/:id
 *
 * @param path - The request path to normalize
 * @returns Normalized path template
 */
export function normalizeRoutePath(path: string): string {
  return (
    path
      // Replace UUIDs (8-4-4-4-12 format)
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        "/:id",
      )
      // Replace MongoDB ObjectIds (24 hex chars)
      .replace(/\/[0-9a-f]{24}/gi, "/:id")
      // Replace numeric IDs
      .replace(/\/\d+/g, "/:id")
      // Replace email addresses
      .replace(/\/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "/:email")
      // Replace long alphanumeric strings (likely IDs) - 12+ chars with mixed alphanumeric
      // This catches things like "abc123def456" but not "transactions"
      .replace(/\/[a-zA-Z0-9]{3,}\d+[a-zA-Z0-9]{3,}/g, "/:id")
  );
}

/**
 * Group HTTP status code into class
 *
 * Reduces cardinality from 50+ status codes to 5 classes.
 *
 * Examples:
 *   200 → 2xx
 *   404 → 4xx
 *   500 → 5xx
 *
 * @param statusCode - HTTP status code
 * @returns Status code class (e.g., "2xx", "4xx", "5xx")
 */
export function getStatusCodeClass(statusCode: number): string {
  const statusClass = Math.floor(statusCode / 100);
  return `${statusClass}xx`;
}

/**
 * Validate and sanitize operation name
 *
 * Ensures GraphQL operation names don't cause cardinality explosion.
 *
 * @param operationName - GraphQL operation name
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized operation name or "Anonymous"
 */
export function sanitizeOperationName(
  operationName: string | null | undefined,
  maxLength: number = 100,
): string {
  if (!operationName || operationName.length === 0) {
    return "Anonymous";
  }

  // Truncate if too long
  const truncated = operationName.slice(0, maxLength);

  // Remove special characters that might indicate dynamic content
  const cleaned = truncated.replace(/[^a-zA-Z0-9_]/g, "_");

  // If it looks like a UUID or hash (hex string, 16+ chars), return generic name
  // But exclude patterns like "AAAA" which are just repeated chars
  const isHexLike = /^[a-f0-9]{16,}$/i.test(cleaned);
  const hasRepeatedChars = /^(.)\1+$/.test(cleaned);

  if (isHexLike && !hasRepeatedChars) {
    return "DynamicOperation";
  }

  return cleaned;
}

/**
 * Validate HTTP method
 *
 * Ensures only known HTTP methods are used as labels.
 *
 * @param method - HTTP method
 * @returns Validated method or "OTHER"
 */
export function validateHttpMethod(method: string): string {
  const validMethods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
  ];

  const upperMethod = method.toUpperCase();
  return validMethods.includes(upperMethod) ? upperMethod : "OTHER";
}

/**
 * Configuration for cardinality control
 */
export interface CardinalityConfig {
  /**
   * Use status code classes (2xx, 3xx, etc.) instead of exact codes
   * Default: false (use exact codes for now, can enable later)
   */
  useStatusCodeClasses: boolean;

  /**
   * Normalize route paths to templates
   * Default: true (recommended)
   */
  normalizeRoutes: boolean;

  /**
   * Maximum unique routes to track before using "OTHER"
   * Default: 1000
   */
  maxUniqueRoutes: number;

  /**
   * Sample rate for high-volume endpoints (0.0 - 1.0)
   * Default: 1.0 (no sampling)
   */
  samplingRate: number;
}

/**
 * Default cardinality configuration
 */
export const defaultCardinalityConfig: CardinalityConfig = {
  useStatusCodeClasses: false, // Keep exact codes for now
  normalizeRoutes: true, // Always normalize routes
  maxUniqueRoutes: 1000,
  samplingRate: 1.0, // No sampling by default
};

/**
 * Check if request should be sampled for metrics
 *
 * Always record errors, sample successful requests based on config.
 *
 * @param statusCode - HTTP status code
 * @param samplingRate - Sampling rate (0.0 - 1.0)
 * @returns true if request should be recorded
 */
export function shouldSampleRequest(
  statusCode: number,
  samplingRate: number,
): boolean {
  // Always record errors
  if (statusCode >= 400) {
    return true;
  }

  // Sample successful requests
  return Math.random() < samplingRate;
}

/**
 * Track unique label combinations to detect cardinality explosion
 */
class CardinalityTracker {
  private labelCombinations = new Set<string>();
  private warningThreshold = 10000;
  private errorThreshold = 50000;
  private lastWarning = 0;

  track(metricName: string, labels: Record<string, string>): void {
    const key = `${metricName}:${JSON.stringify(labels)}`;

    this.labelCombinations.add(key);

    const count = this.labelCombinations.size;
    const now = Date.now();

    // Warn every 5 minutes at most
    if (
      count > this.warningThreshold &&
      now - this.lastWarning > 5 * 60 * 1000
    ) {
      logger.warn(
        `[METRICS] High cardinality detected: ${count} unique label combinations`,
      );
      this.lastWarning = now;
    }

    if (count > this.errorThreshold) {
      logger.error(
        `[METRICS] CRITICAL: Cardinality explosion detected: ${count} unique combinations`,
      );
    }
  }

  getCount(): number {
    return this.labelCombinations.size;
  }

  reset(): void {
    this.labelCombinations.clear();
  }
}

export const cardinalityTracker = new CardinalityTracker();
