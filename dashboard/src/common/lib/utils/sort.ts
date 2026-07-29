/**
 * Sort an array of currency labels with a priority currency first
 * @param label - Array of currency labels to sort
 * @param primary - The currency to prioritize (defaults to "USD")
 * @returns The sorted array with the priority currency first
 * @example
 * sortUsdFirst(["EUR", "GBP", "USD"]) // => ["USD", "EUR", "GBP"]
 * sortUsdFirst(["EUR", "GBP", "JPY"], "EUR") // => ["EUR", "GBP", "JPY"]
 */
export const sortUsdFirst = (label: string[], primary?: string): string[] => {
  const priority = primary ?? "USD";
  return label.sort((a, b) => {
    if (a === priority && b !== priority) return -1;
    if (b === priority && a !== priority) return 1;
    return 0;
  });
};
