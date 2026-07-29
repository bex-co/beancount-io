/**
 * Generate all partial account paths from full account names.
 *
 * For example, from "Assets:US:BofA:Checking" it generates:
 * - "Assets"
 * - "Assets:US"
 * - "Assets:US:BofA"
 * - "Assets:US:BofA:Checking"
 *
 * @param accounts - Array of full account paths
 * @returns Array of all account paths (partial and full) sorted hierarchically
 */
export function generateAllAccountPaths(accounts: string[]): string[] {
  const pathSet = new Set<string>();

  accounts.forEach((account) => {
    const parts = account.split(":");
    // Generate all partial paths: "Assets", "Assets:US", "Assets:US:BofA", etc.
    for (let i = 1; i <= parts.length; i++) {
      pathSet.add(parts.slice(0, i).join(":"));
    }
  });

  // Convert to array and sort hierarchically
  return Array.from(pathSet).sort((a, b) => {
    // Sort by depth first (shorter paths first), then alphabetically
    const depthA = a.split(":").length;
    const depthB = b.split(":").length;
    if (depthA !== depthB) {
      return depthA - depthB;
    }
    return a.localeCompare(b);
  });
}
