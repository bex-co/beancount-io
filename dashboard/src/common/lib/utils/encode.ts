/**
 * Encodes a string to base64Url format
 * @param str - The string to encode
 * @returns Base64Url encoded string
 */
export const base64UrlEncode = (str: string): string => {
  const base64 = btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};

/**
 * Decodes a base64Url string back to the original string
 * @param base64Url - The base64Url encoded string
 * @returns Decoded string
 */
export const base64UrlDecode = (base64Url: string): string => {
  // Add padding if needed
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;
  if (padding) {
    base64 += "=".repeat(4 - padding);
  }
  return atob(base64);
};

export const createLedgerId = (owner: string, name: string): string =>
  `${owner}/${name}`;

export const decodeLedgerId = (
  id: string,
): { ledgerOwner: string; ledgerName: string } => {
  const slashIndex = id.indexOf("/");
  return {
    ledgerOwner: id.substring(0, slashIndex),
    ledgerName: id.substring(slashIndex + 1),
  };
};

/**
 * UTF-8 safe base64 encoding
 *
 * JavaScript's built-in btoa() only supports Latin1 (ISO-8859-1) characters.
 * This function properly handles UTF-8 strings including emoji, Chinese characters,
 * and other multi-byte Unicode characters.
 *
 * @param str - The UTF-8 string to encode
 * @returns Base64 encoded string
 */
export function base64Encode(str: string): string {
  // Convert UTF-8 string to byte array using TextEncoder
  const utf8Bytes = new TextEncoder().encode(str);

  // Convert byte array to binary string (each byte becomes a character)
  const binaryString = Array.from(utf8Bytes, (byte) =>
    String.fromCharCode(byte),
  ).join("");

  // Now safe to use btoa() since all characters are in 0-255 range
  return btoa(binaryString);
}

/**
 * UTF-8 safe base64 decoding
 *
 * Decodes a base64 string to UTF-8, properly handling multi-byte characters.
 *
 * @param base64 - The base64 string to decode
 * @returns UTF-8 decoded string
 */
export function base64Decode(base64: string): string {
  // Decode base64 to binary string
  const binaryString = atob(base64);

  // Convert binary string to byte array
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

  // Decode byte array to UTF-8 string using TextDecoder
  return new TextDecoder().decode(bytes);
}

/**
 * Parses a ledger fullName into owner and repo components
 * @param fullName - The full name in format "owner/repo-name"
 * @returns Object with owner and repo, or null values if parsing fails
 */
export const parseLedgerFullName = (
  fullName: string,
): { owner: string | null; repo: string | null } => {
  const parts = fullName.split("/");
  if (parts.length === 2) {
    return { owner: parts[0], repo: parts[1] };
  }
  // Fallback for invalid format
  return { owner: null, repo: fullName };
};

/**
 * Formats a ledger display name as "owner / repo"
 * @param fullName - The full name in format "owner/repo-name"
 * @returns Formatted string "owner / repo" or just repo if parsing fails
 */
export const formatLedgerDisplayName = (fullName: string): string => {
  const { owner, repo } = parseLedgerFullName(fullName);
  if (owner && repo) {
    return `${owner} / ${repo}`;
  }
  return repo || fullName;
};
