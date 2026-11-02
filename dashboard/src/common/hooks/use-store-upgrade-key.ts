import {
  isBilledByStore,
  useSubscriptionStatus,
} from "@/features/user-settings/hooks/use-subscription-status";
import { BillingSource } from "@/graphql/definitions";

/**
 * The message saying where a store-billed account upgrades, or null when it
 * upgrades here (ADR 001 D14). It reads the full billing status, so call it
 * only where a prompt is already showing.
 */
export function useStoreUpgradeKey(): string | null {
  const { planBilling } = useSubscriptionStatus();
  if (!isBilledByStore(planBilling)) return null;
  return planBilling?.source === BillingSource.GooglePlay
    ? "common.upgradeInAndroidApp"
    : "common.upgradeInIosApp";
}
