/**
 * Which actions a budget's dated history rows may offer.
 *
 * Deleting an entry rewrites the ledger file, so the trash belongs to
 * collaborators with push (or admin) access only — a reader who taps it reaches
 * a destructive confirmation for a mutation the server will refuse. Unresolved
 * access counts as read-only: `useLedgerAccess` reports `canWrite: false` until
 * this ledger's permissions have been read back, and on error, so the control
 * never flashes enabled before the answer lands.
 */
export function selectBudgetEntryActions(
  canWrite: boolean,
  deleting: boolean,
): { showDelete: boolean; deleteDisabled: boolean } {
  return {
    showDelete: canWrite === true,
    // A delete in flight disables the rest; a reader has nothing to disable
    // because the control is not rendered at all.
    deleteDisabled: canWrite !== true || deleting,
  };
}
