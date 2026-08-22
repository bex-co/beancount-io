import superjson from "superjson";
import type { DeserializedData } from "keyv";

/**
 * Type-preserving codec for the Redis-backed Keyv cache.
 *
 * Keyv's default codec (`json-buffer`) is plain `JSON.stringify`/`parse`, which is
 * lossy: `Date`, `Map`, `Set`, `BigInt`, and `undefined` all degrade on read (a
 * cached `Date` comes back as an ISO string, so `value.getTime()` throws). Swapping
 * in `superjson` makes every cached value round-trip with its types intact, so
 * services may cache rich objects without per-call rehydration.
 *
 * Keyv invokes these on the storage **envelope** `{ value, expires }` — the cached
 * value (and any nested `Date`) lives inside `value`; superjson walks the whole
 * object. These sync signatures are assignable to Keyv's `Serialize`/`Deserialize`
 * option types (which permit a sync or async result).
 */
export function serialize<T>(data: DeserializedData<T>): string {
  return superjson.stringify(data);
}

export function deserialize<T>(data: string): DeserializedData<T> {
  return superjson.parse(data);
}
