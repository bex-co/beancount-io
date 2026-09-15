/**
 * Whether an `addEntries` call actually wrote to the ledger. The mutation
 * reports a rejection in its payload rather than by throwing, so a call that
 * resolved is not necessarily a write; invalidating after a rejected one would
 * refetch every ledger view for nothing.
 */
export function addEntriesSucceeded(result: {
  data?: { addEntries?: { success?: boolean | null } | null } | null;
}): boolean {
  return result.data?.addEntries?.success === true;
}
