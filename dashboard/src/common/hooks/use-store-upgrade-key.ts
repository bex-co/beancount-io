import { useQuery } from "@apollo/client/react";
import { storeCopy } from "@/common/lib/subscription/store-copy";
import { isBilledByStore } from "@/features/user-settings/hooks/use-subscription-status";
import { GetBillingStatusDocument } from "@/graphql/definitions";

/**
 * The message saying where a store-billed account upgrades, or null when it
 * upgrades here (ADR 001 D14). Call it only where a prompt is already showing:
 * it reads the account's billing status.
 */
export function useStoreUpgradeKey(): string | null {
  const { data } = useQuery(GetBillingStatusDocument);
  const billing = data?.subscriptionStatus?.billing ?? null;
  if (!isBilledByStore(billing)) return null;
  return storeCopy(billing?.source).upgradeIn;
}
