import type { IdempotencyRecord, IdempotencyStore } from "../redis-idempotency";

/**
 * An in-memory stand-in for `redis-idempotency` with Redis's claim semantics,
 * for tests of writes built on it. Use it as the module mock (Jest lets a
 * factory reference `mock`-prefixed names):
 *
 *   import { fakeRedisIdempotency as mockFakeRedisIdempotency } from ".../fake-redis-idempotency";
 *   jest.mock("@/foundation/redis/redis-idempotency", () => mockFakeRedisIdempotency);
 *
 * and reach the state through `fakeRedisIdempotencyState` to clear it or take
 * Redis down.
 */
export const fakeRedisIdempotencyState = {
  records: new Map<string, IdempotencyRecord>(),
  down: false,
  reset(): void {
    this.records.clear();
    this.down = false;
  },
};

const store: IdempotencyStore = {
  async claim(key, requestHash) {
    const state = fakeRedisIdempotencyState;
    if (state.down) return undefined;
    const record = state.records.get(key);
    if (record) return { claimed: false, record };
    state.records.set(key, { requestHash, status: "in-progress" });
    return { claimed: true };
  },
  async complete(key, requestHash, result) {
    const state = fakeRedisIdempotencyState;
    if (state.down) return;
    // A JSON round trip, as Redis stores it.
    state.records.set(key, {
      requestHash,
      status: "done",
      result: JSON.parse(JSON.stringify(result)),
    });
  },
  async release(key) {
    if (fakeRedisIdempotencyState.down) return;
    fakeRedisIdempotencyState.records.delete(key);
  },
};

export const fakeRedisIdempotency = { redisIdempotencyStore: store };
