# Lock System

Application-wide async lock for serializing critical operations and preventing race conditions.

## Overview

This module provides:

- **`lock`**: Shared AsyncLock instance for serializing critical operations
- **`LOCK_KEYS`**: Centralized lock key registry with consistent naming

## Usage

```typescript
import { lock, LOCK_KEYS } from "@/shared/lock";

// Infrastructure locks (singleton initialization)
await lock.acquire(LOCK_KEYS.INFRA.INIT_POSTGRES, async () => {
  // Initialize PostgreSQL connection
});

// User operation locks (per-user)
await lock.acquire(LOCK_KEYS.USER.register(email), async () => {
  // Register user
});

await lock.acquire(LOCK_KEYS.USER.updateUsername(userId), async () => {
  // Update username
});

// API key operation locks (per-user)
await lock.acquire(LOCK_KEYS.API_KEY.create(userId), async () => {
  // Create API key
});

// Ledger operation locks (per-user)
await lock.acquire(LOCK_KEYS.LEDGER.create(userId), async () => {
  // Create ledger
});
```

## Lock Key Pattern

All lock keys follow the pattern: `namespace:action:identifier`

- **namespace**: Component or domain (infra, user, ledger, api-key, etc.)
- **action**: Operation being performed (init, register, create, update, etc.)
- **identifier**: Unique identifier (userId, email, etc.)

**Examples:**

- `infra:init:postgres` - Infrastructure initialization lock
- `user:register:user@example.com` - User registration lock by email
- `user:update-username:user-123` - Username update lock by user ID
- `api-key:create:user-123` - API key creation lock by user ID
- `ledger:create:user-123` - Ledger creation lock by user ID

## Benefits

✅ **Prevents collisions**: Consistent namespacing avoids key conflicts
✅ **Type-safe**: TypeScript autocomplete and validation
✅ **Centralized**: All lock keys defined in one place for easy auditing
✅ **Per-resource locking**: Fine-grained locks instead of global locks
✅ **Clear intent**: Descriptive key names document their purpose

## Configuration

The lock is configured with:

- **timeout**: 30 seconds max wait time before timeout error
- **maxPending**: 1000 max tasks in queue to prevent unbounded growth

## Adding New Lock Keys

When adding new lock keys:

1. Add to `LOCK_KEYS` in `lock-keys.ts`
2. Follow the `namespace:action:identifier` pattern
3. Use functions for dynamic identifiers (userId, email, etc.)
4. Document the purpose with JSDoc comments
5. Prefer per-resource locks over global locks

**Example:**

```typescript
export const LOCK_KEYS = {
  // ... existing keys ...

  /**
   * New feature operation locks.
   */
  NEW_FEATURE: {
    /**
     * Lock for feature creation by user ID.
     * Prevents concurrent feature creation for the same user.
     */
    create: (userId: string) => `new-feature:create:${userId}`,
  },
} as const;
```

## Anti-Patterns

❌ **Global locks**: Avoid locks that block all users (e.g., `updateUsername` without user ID)
❌ **Inconsistent prefixes**: Don't mix `action:id` and `id:action` patterns
❌ **Hardcoded strings**: Always use `LOCK_KEYS` instead of inline strings
❌ **Trailing separators**: Don't add trailing colons (e.g., `user:123:`)
