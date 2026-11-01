/**
 * The pin claims for an access token, from the grant's account id
 * (`userId:ledgerId` for a grant pinned to one ledger, `userId` otherwise).
 *
 * `ledger_id` is the name the grant was approved with; `ledger_repo_id` is the
 * repository that name is, so verification can follow a rename and refuse a
 * recreated name (w23/065). A ledger that no longer exists gets no ID: the
 * token then matches nothing, as a pin to a missing name always has.
 */
export async function ledgerPinClaims(
  accountId: string,
  resolve: (pin: { name: string }) => Promise<{ repoId?: number } | null>,
): Promise<{ ledger_id?: string; ledger_repo_id?: number }> {
  const ledgerId = accountId.split(":").slice(1).join(":");
  if (!ledgerId) return { ledger_id: undefined };
  const pin = await resolve({ name: ledgerId });
  return { ledger_id: ledgerId, ledger_repo_id: pin?.repoId };
}
