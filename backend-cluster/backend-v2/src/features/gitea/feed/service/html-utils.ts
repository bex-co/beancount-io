/**
 * Strip HTML tags from text and limit length
 * @param html HTML string to clean
 * @param aggressive If true, also normalizes whitespace
 * @returns Plain text (max 200 characters)
 */
export function stripHtml(html: string, aggressive = false): string {
  if (!html) {
    return "";
  }

  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, "").trim();

  if (aggressive) {
    // For aggressive mode: also normalize whitespace
    text = text.replace(/\s+/g, " ");
  }

  // Limit to 200 characters
  if (text.length > 200) {
    return text.substring(0, 200) + "...";
  }

  return text;
}
