/**
 * Helper function to calculate indent level for hierarchical items
 * e.g., "income" = 0, "income:work" = 1, "income:work:salary" = 2
 */
export const getIndentLevel = (item: string): number => {
  return (item.match(/:/g) || []).length;
};
