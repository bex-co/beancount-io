import type { Cache } from "cache-manager";
import crypto from "crypto";
import { getExpireEpochMins } from "@/shared/expire-epoch";
import { CACHE_KEYS } from "@/shared/cache";
import {
  createRedisRecordStore,
  type RedisRecordStore,
} from "@/shared/redis-record-store";
import { EmailToken, IEmailTokenModel } from "./types";

type Opts = {
  cache: Cache;
  expMins: number;
};

export class EmailTokenRedisModel implements IEmailTokenModel {
  // Strict Redis-backed store: a dropped token write must surface (not fail open).
  private store: RedisRecordStore;
  private expMins: number;

  constructor({ cache, expMins }: Opts) {
    this.store = createRedisRecordStore(cache);
    this.expMins = expMins;
  }

  /**
   * Regenerate token for a user.
   * Deletes all existing tokens for the user before creating a new one.
   *
   * Key naming strategy (see CACHE_KEYS.auth):
   * - auth:email_token:token:{uuid} - Stores EmailToken JSON with TTL
   * - auth:email_token:user:{userId} - Array of token UUIDs for user
   */
  public async regenerateToken(userId: string): Promise<EmailToken> {
    // 1. Delete all existing tokens for this user
    await this.deleteByUserId(userId);

    // 2. Generate new token
    const token = crypto.randomUUID();
    const expireAt = new Date(getExpireEpochMins(this.expMins));

    // 3. Create token data
    const tokenData: EmailToken = {
      token,
      userId,
      expireAt: expireAt.toISOString(),
    };

    // 4. Store token with TTL (in milliseconds)
    const ttlMs = this.expMins * 60 * 1000;
    await this.store.putRecord(
      CACHE_KEYS.auth.emailTokenByToken(token),
      tokenData,
      ttlMs,
    );

    // 5. Store user->tokens mapping
    const userKey = CACHE_KEYS.auth.emailTokensByUser(userId);
    const tokens = (await this.store.getRecord<string[]>(userKey)) ?? [];
    tokens.push(token);
    await this.store.putRecord(userKey, tokens, ttlMs);

    return tokenData;
  }

  /**
   * Find a token and delete it atomically.
   * Returns the token data if found, null otherwise.
   */
  public async findOneAndDelete(token: string): Promise<EmailToken | null> {
    const tokenData = await this.store.getRecord<EmailToken>(
      CACHE_KEYS.auth.emailTokenByToken(token),
    );

    if (!tokenData) return null;

    // Delete token
    await this.store.deleteRecord(CACHE_KEYS.auth.emailTokenByToken(token));

    // Remove from user->tokens mapping
    const userKey = CACHE_KEYS.auth.emailTokensByUser(tokenData.userId);
    const existingTokens = await this.store.getRecord<string[]>(userKey);
    if (existingTokens) {
      const filtered = existingTokens.filter((t) => t !== token);
      if (filtered.length > 0) {
        const remainingTtlMs =
          new Date(tokenData.expireAt).getTime() - Date.now();
        if (remainingTtlMs > 0) {
          await this.store.putRecord(userKey, filtered, remainingTtlMs);
        } else {
          await this.store.deleteRecord(userKey);
        }
      } else {
        await this.store.deleteRecord(userKey);
      }
    }

    return tokenData;
  }

  /**
   * Find a token without deleting it.
   * Returns the token data if found, null otherwise.
   */
  public async findOne(token: string): Promise<EmailToken | null> {
    return this.store.getRecord<EmailToken>(
      CACHE_KEYS.auth.emailTokenByToken(token),
    );
  }

  /**
   * Delete all tokens for a user.
   */
  public async deleteByUserId(userId: string): Promise<void> {
    const userKey = CACHE_KEYS.auth.emailTokensByUser(userId);
    const existingTokens = await this.store.getRecord<string[]>(userKey);

    if (!existingTokens) return;

    // Delete all token keys
    await Promise.all(
      existingTokens.map((token) =>
        this.store.deleteRecord(CACHE_KEYS.auth.emailTokenByToken(token)),
      ),
    );

    // Delete user mapping
    await this.store.deleteRecord(userKey);
  }
}
