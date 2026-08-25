/**
 * RFC 7636 §4.1 allows `[A-Za-z0-9-._~]`, but only a 64-character subset makes
 * `byte & 63` a uniform draw. Taking the low six bits of an independent random
 * byte per character is unbiased; mapping 256 values onto 66 would not be.
 */
const VERIFIER_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** RFC 7636 §4.1 lower bound, and what one byte per character produces here. */
export const CODE_VERIFIER_LENGTH = 43;

/**
 * expo-crypto returns standard base64; the OAuth wire format is base64url with
 * no padding (RFC 7636 §4.2). Both the challenge and any state derived from a
 * digest go through here.
 */
export function base64UrlFromBase64(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Map random bytes onto the verifier alphabet. Rejects a short buffer rather
 * than padding or cycling it: a verifier with less entropy than it appears to
 * have is the one failure mode PKCE cannot survive.
 */
export function highEntropyStringFromBytes(
  bytes: Uint8Array,
  length: number = CODE_VERIFIER_LENGTH,
): string {
  if (bytes.length < length) {
    throw new Error("Not enough entropy for an OAuth code verifier");
  }
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += VERIFIER_ALPHABET[bytes[index] & 63];
  }
  return value;
}
