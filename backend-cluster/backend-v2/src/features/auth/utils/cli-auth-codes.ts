import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

/**
 * The two codes of the CLI device-authorization ceremony (RFC 8628 shaped).
 *
 * They exist because one value cannot both name a request in a browser and
 * redeem the credential it produces. The device code is the CLI's private
 * verifier: it never appears in a URL, an address bar, an analytics payload, or
 * a browser history entry, and only its digest is stored. The user code is the
 * opposite — short, transcribable, and deliberately powerless: the person types
 * it into the consent screen, and knowing it approves nothing on its own.
 */

/** 256 bits. The CLI keeps this; the server keeps only `deviceCodeDigest`. */
const DEVICE_CODE_BYTES = 32;

/**
 * Consonants and digits only. No vowels, so a random draw cannot spell a word
 * at the user, and none of `0 O 1 I L`, the glyphs people mistype when copying
 * a code out of a terminal.
 */
const USER_CODE_ALPHABET = "BCDFGHJKMNPQRSTVWXZ23456789";
const USER_CODE_GROUP_SIZE = 4;
const USER_CODE_GROUPS = 2;
const USER_CODE_LENGTH = USER_CODE_GROUP_SIZE * USER_CODE_GROUPS;

/** A fresh device verifier, URL-safe so it survives transport unmangled. */
export function generateDeviceCode(): string {
  return randomBytes(DEVICE_CODE_BYTES).toString("base64url");
}

/** sha256 of a device code, hex. The only form the server ever persists. */
export function deviceCodeDigest(deviceCode: string): string {
  return createHash("sha256").update(deviceCode, "utf8").digest("hex");
}

/**
 * Constant-time digest comparison.
 *
 * The lookup is already by digest, so a timing difference here leaks nothing
 * about the code — but an auth path that compares secrets with `===` teaches
 * the next one to do the same.
 */
export function deviceCodeDigestsMatch(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * A fresh user code, formatted `XXXX-XXXX`.
 *
 * `randomInt` rather than `Math.random()`: this is the value a person compares
 * against their own terminal, so a predictable one would let an attacker mint a
 * session whose code matches the victim's.
 */
export function generateUserCode(): string {
  const characters = Array.from(
    { length: USER_CODE_LENGTH },
    () => USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)],
  ).join("");

  return formatUserCode(characters);
}

/** Insert the group separator: `BCDF GHJK` reads back more reliably than eight runs-on. */
function formatUserCode(characters: string): string {
  const groups: string[] = [];
  for (let at = 0; at < characters.length; at += USER_CODE_GROUP_SIZE) {
    groups.push(characters.slice(at, at + USER_CODE_GROUP_SIZE));
  }
  return groups.join("-");
}

/**
 * The canonical form of a code a person typed, or `null` if it cannot be one.
 *
 * People paste with the hyphen, without it, in lower case, and with a trailing
 * space; all four are the same code. Anything else — a wrong length, or a glyph
 * this alphabet never generates — is rejected here rather than becoming a
 * lookup that cannot succeed.
 */
export function normalizeUserCode(input: string): string | null {
  const characters = input.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (characters.length !== USER_CODE_LENGTH) return null;
  if (![...characters].every((char) => USER_CODE_ALPHABET.includes(char))) {
    return null;
  }

  return formatUserCode(characters);
}
