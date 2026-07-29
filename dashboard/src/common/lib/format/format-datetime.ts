import { detectLanguage } from "@/i18n/detect-language";

/**
 * Format date with time in locale format
 * @param dateString - Date string to format
 * @returns Formatted datetime string or null if invalid
 */
export const formatDateTime = (
  dateString: string | null | undefined,
): string | null => {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);

  // Check if date is valid
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // Use current language for locale formatting
  const locale = detectLanguage();

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
