import type { Cache } from "cache-manager";
import { nanoid } from "nanoid";
import { getExpireEpochMins } from "@/shared/expire-epoch";
import { CACHE_KEYS } from "@/shared/cache";
import { ServiceUnavailableError } from "@/shared/errors";
import {
  createRedisRecordStore,
  type RedisRecordStore,
} from "@/shared/redis-record-store";
import { MagicLinkToken, IMagicLinkTokenModel } from "./types";

type Opts = {
  cache: Cache;
};

export class MagicLinkTokenRedisModel implements IMagicLinkTokenModel {
  // Strict Redis-backed store: a dropped token write must surface (not fail open).
  private store: RedisRecordStore;

  constructor({ cache }: Opts) {
    this.store = createRedisRecordStore(cache);
  }

  /**
   * Regenerate a magic link token for a user.
   * Deletes all existing tokens for the user before creating a new one.
   *
   * Key naming strategy (see CACHE_KEYS.auth):
   * - auth:magic_link_token:id:{tokenId} - Stores MagicLinkToken JSON with TTL
   * - auth:magic_link_token:user:{userId} - Array of token IDs for user deletion
   */
  public async regenerateToken(
    userId: string,
    expMins: number = 5,
  ): Promise<MagicLinkToken> {
    // 1. Delete all existing tokens for this user
    const userKey = CACHE_KEYS.auth.magicLinkTokensByUser(userId);
    const existingTokens = await this.store.getRecord<string[]>(userKey);

    if (existingTokens) {
      await Promise.all(
        existingTokens.map((id) =>
          this.store.deleteRecord(CACHE_KEYS.auth.magicLinkTokenById(id)),
        ),
      );
      await this.store.deleteRecord(userKey);
    }

    // 2. Generate new token ID
    const id = nanoid();
    const expireAt = new Date(getExpireEpochMins(expMins));

    // 3. Create token data
    const tokenData: MagicLinkToken = {
      id,
      userId,
      expireAt: expireAt.toISOString(),
    };

    // 4. Store token with TTL (in milliseconds)
    const ttlMs = expMins * 60 * 1000;
    await this.store.putRecord(
      CACHE_KEYS.auth.magicLinkTokenById(id),
      tokenData,
      ttlMs,
    );

    // 5. Store user->tokens mapping
    await this.store.putRecord(userKey, [id], ttlMs);

    return tokenData;
  }

  /**
   * Find a token by ID and delete it atomically.
   * Returns the token data if found, null otherwise.
   */
  public async findOneAndDelete(id: string): Promise<MagicLinkToken | null> {
    try {
      // Let the index expire or be replaced by regeneration. Updating it here
      // could remove a freshly issued token's index.
      return await this.store.takeRecord<MagicLinkToken>(
        CACHE_KEYS.auth.magicLinkTokenById(id),
      );
    } catch {
      throw new ServiceUnavailableError("Magic link token storage", 5);
    }
  }

  /**
   * Find a token by ID without deleting it.
   * Returns the token data if found, null otherwise.
   */
  public async findOne(id: string): Promise<MagicLinkToken | null> {
    return this.store.getRecord<MagicLinkToken>(
      CACHE_KEYS.auth.magicLinkTokenById(id),
    );
  }
}
