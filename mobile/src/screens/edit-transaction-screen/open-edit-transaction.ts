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
  /**
   * The checksum of the slice the detail screen showed. The editor refuses an
   * entry whose slice has since become another one's (w21/672).
   */
  sha256sum?: string;
};

export function openEditTransaction(
  router: Router,
  params: EditTransactionParams,
): void {
  const { entryHash, ledgerId, originAccount, sha256sum } = params;
  router.push({
    pathname: "/edit-transaction",
    params: {
      entryHash,
      ledgerId,
      ...(originAccount ? { originAccount } : {}),
      ...(sha256sum ? { sha256sum } : {}),
    },
  });
}
