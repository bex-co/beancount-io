/**
 * URL validation utility for email templates
 * Prevents XSS attacks by validating URLs against an allow list
 */

const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

/**
 * Validates a URL to prevent XSS attacks
 * @param url - The URL to validate
 * @returns The validated URL
 * @throws Error if the URL is invalid or uses a dangerous protocol
 */
export function validateEmailUrl(url: string): string {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid URL: URL must be a non-empty string");
  }

  const trimmedUrl = url.trim();

  // Check for obviously dangerous patterns
  if (
    trimmedUrl.toLowerCase().startsWith("javascript:") ||
    trimmedUrl.toLowerCase().startsWith("data:") ||
    trimmedUrl.toLowerCase().startsWith("vbscript:")
  ) {
    throw new Error(
      `Invalid URL: Dangerous protocol detected (${trimmedUrl.split(":")[0]})`,
    );
  }

  // Try to parse the URL
  try {
    const urlObj = new URL(trimmedUrl);

    // Validate protocol
    if (!ALLOWED_PROTOCOLS.has(urlObj.protocol)) {
      throw new Error(
        `Invalid URL: Protocol "${urlObj.protocol}" is not allowed. Allowed protocols: ${Array.from(ALLOWED_PROTOCOLS).join(", ")}`,
      );
    }

    return trimmedUrl;
  } catch (error) {
    // If URL parsing fails, it might be a relative URL or malformed
    // For email templates, we should only allow absolute URLs
    if (error instanceof Error && error.message.includes("Protocol")) {
      // Re-throw protocol errors (our custom error)
      throw error;
    }
    // All other errors are URL parsing failures
    throw new Error(`Invalid URL: "${trimmedUrl}" is not a valid absolute URL`);
  }
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param text - The text to escape
 * @returns The escaped text
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
