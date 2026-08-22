/**
 * Centralized lock key registry for consistent prefixing and collision prevention.
 *
 * Pattern: `namespace:action:identifier`
 * - namespace: Component or domain (infra, user, ledger, etc.)
 * - action: Operation being performed (init, register, create, update, etc.)
 * - identifier: Unique identifier (userId, email, etc.)
 *
 * Benefits:
 * - Prevents key collisions through consistent namespacing
 * - Type-safe lock key generation
 * - Easy to audit all lock usage in one place
 * - Per-resource locking instead of global locks
 */
export const LOCK_KEYS = {
  /**
   * Infrastructure locks for singleton initialization.
   * These are global locks used once during application startup.
   */
  INFRA: {
    INIT_POSTGRES: "infra:init:postgres",
    INIT_REDIS: "infra:init:redis",
  },

  /**
   * User operation locks (per-user or per-email).
   */
  USER: {
    /**
     * Lock for user registration by email.
     * Prevents concurrent registrations with the same email.
     */
    register: (email: string) => `user:register:${email}`,

    /**
     * Lock for username updates by user ID.
     * Prevents concurrent username changes for the same user.
     */
    updateUsername: (userId: string) => `user:update-username:${userId}`,

    /**
     * Lock for email fixes by user ID.
     * Prevents concurrent email corrections for the same user.
     */
    updateEmail: (userId: string) => `user:update-email:${userId}`,
  },

  /**
   * API key operation locks (per-user).
   */
  API_KEY: {
    /**
     * Lock for API key creation by user ID.
     * Prevents concurrent API key creation for the same user.
     */
    create: (userId: string) => `api-key:create:${userId}`,
  },

  /**
   * Ledger operation locks (per-user).
   */
  LEDGER: {
    /**
     * Lock for ledger creation by user ID.
     * Prevents concurrent ledger creation for the same user.
     */
    create: (userId: string) => `ledger:create:${userId}`,
  },

  /**
   * Plaid operation locks (per-item).
   */
  PLAID: {
    /**
     * Lock for Plaid Item transaction sync by item ID.
     * Prevents concurrent syncs of the same Plaid Item, which could lead to
     * duplicate transactions or race conditions.
     */
    syncTransactions: (itemId: string) => `plaid:sync-transactions:${itemId}`,
  },
} as const;
