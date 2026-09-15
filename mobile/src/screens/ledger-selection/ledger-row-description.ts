/**
 * The description line a ledger row shows, or `null` when there is nothing to
 * show. React Native still lays out an empty `Text`, so rendering `""` reserved
 * a blank line in every row without a description; a whitespace-only
 * description is treated the same way.
 */
export function ledgerRowDescription(
  description: string | null | undefined,
): string | null {
  return description?.trim() ? description : null;
}
