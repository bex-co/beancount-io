import { useQuery } from "@apollo/client/react";
import { storeCopy } from "@/common/lib/subscription/store-copy";
import { isBilledByStore } from "@/features/user-settings/hooks/use-subscription-status";
import { GetBillingStatusDocument } from "@/graphql/definitions";

/**
 * Where this account can buy an upgrade (ADR 001 D14, D15). A store-billed
 * account upgrades in the app that bills it, so `storeUpgradeKey` names it.
 * An account whose Stripe plan is waiting for a store plan to end can buy
 * nothing more, so `sellsHere` is false then too. Call it only where a prompt
 * is already showing: it reads the account's billing status.
 */
export function useUpgradeChannel(): {
  storeUpgradeKey: string | null;
  sellsHere: boolean;
} {
  const { data } = useQuery(GetBillingStatusDocument);
  const billing = data?.subscriptionStatus?.billing ?? null;
  const storeUpgradeKey = isBilledByStore(billing)
    ? storeCopy(billing?.source).upgradeIn
    : null;
  return {
    storeUpgradeKey,
    sellsHere: !storeUpgradeKey && !billing?.stripeStartsAt,
  };
}
