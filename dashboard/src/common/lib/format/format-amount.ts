/**
 * Format amount by removing commas and limiting decimal places
 * @param amount - Amount string to format
 * @returns Formatted amount string
 */
export const formatAmount = (amount: string): string => {
  // Remove commas first
  const withoutCommas = amount.replace(/,/g, "");

  // Check if there's a decimal point
  const decimalIndex = withoutCommas.indexOf(".");

  if (decimalIndex === -1) {
    // No decimal point, return as is
    return withoutCommas;
  }

  // Extract integer and decimal parts
  const integerPart = withoutCommas.substring(0, decimalIndex);
  const decimalPart = withoutCommas.substring(decimalIndex + 1);

  // If decimal places are 2 or less, keep raw content
  if (decimalPart.length <= 2) {
    return withoutCommas;
  }

  // If decimal places are more than 2, keep only 2 decimal places
  const truncatedDecimal = decimalPart.substring(0, 2);
  return `${integerPart}.${truncatedDecimal}`;
};
