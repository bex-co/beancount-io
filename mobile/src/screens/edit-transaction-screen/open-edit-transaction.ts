import type { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

export type EditTransactionParams = {
  entryHash: string;
  ledgerId: string;
};

export function openEditTransaction(
  router: Router,
  params: EditTransactionParams,
): void {
  router.push({
    pathname: "/edit-transaction",
    params,
  });
}
