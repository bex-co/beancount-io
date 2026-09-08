import type { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

export type EditTransactionParams = {
  entryHash: string;
  ledgerId: string;
  /**
   * The account the detail screen was opened from, carried through so a save
   * can return to that detail screen with its "back to account" behaviour
   * intact (see `resolveSaveExit`).
   */
  originAccount?: string;
};

export function openEditTransaction(
  router: Router,
  params: EditTransactionParams,
): void {
  const { entryHash, ledgerId, originAccount } = params;
  router.push({
    pathname: "/edit-transaction",
    params: originAccount
      ? { entryHash, ledgerId, originAccount }
      : { entryHash, ledgerId },
  });
}
