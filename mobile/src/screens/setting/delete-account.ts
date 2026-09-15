export type AccountDeletionOutcome = "deleted" | "failed";

/**
 * Run an account deletion and settle it into the outcome the screen reports.
 * The session is signed out only once the server confirms the deletion: a
 * refused or failed request leaves the user signed in, and it must be reported
 * as a failure rather than dissolving into a screen that looks untouched.
 */
export async function runAccountDeletion({
  deleteAccount,
  signOut,
}: {
  deleteAccount: () => Promise<boolean>;
  signOut: () => Promise<void>;
}): Promise<AccountDeletionOutcome> {
  let deleted: boolean;
  try {
    deleted = await deleteAccount();
  } catch {
    return "failed";
  }
  if (!deleted) return "failed";
  await signOut();
  return "deleted";
}
