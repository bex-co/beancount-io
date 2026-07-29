import { customAlphabet } from "nanoid";

// Base58 alphabet (Bitcoin/IPFS style - excludes 0, O, I, l to avoid confusion)
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Generates a Base58-encoded nanoid string suitable for usernames and short identifiers
 * Base58 is URL-safe and avoids confusing characters (0, O, I, l)
 *
 * @param length - Length of the generated ID (default: 12)
 * @returns A random Base58 string
 *
 * @example
 * const id = nanoidBase58(); // "3ZqE8yK9mXpN"
 * const username = `un_${nanoidBase58()}`; // "un_3ZqE8yK9mXpN"
 */
export function nanoidBase58(length: number = 12): string {
  const generator = customAlphabet(BASE58_ALPHABET, length);
  return generator();
}

/**
 * Generates a default username in the format "un_{nanoidBase58}"
 * The generated username is lowercase
 *
 * @returns A lowercase username string like "un_3zqe8yk9mxpn"
 */
export function generateDefaultUsername(): string {
  return `un_${nanoidBase58().toLowerCase()}`;
}
