import { useState, useSyncExternalStore } from "react";
import { useQuery } from "@apollo/client/react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { useRootContext } from "@/common/hooks/use-root-context";
import { useTranslations } from "@/common/hooks/use-translations";
import type { UserTier } from "@/common/hooks/use-user-limits";
import { planLabelKey } from "@/common/lib/subscription/tier-config";
import { useHidesBilling } from "@/common/hooks/use-hides-billing";
import { isBilledByStore } from "@/features/user-settings/hooks/use-subscription-status";
import { useSubscriptionPortal } from "@/features/user-settings/hooks/use-subscription-portal";
import { useBillingDateFormat } from "@/features/user-settings/pages/general/use-money-format";
import { GetSubscriptionStatusDocument } from "@/graphql/definitions";

const DISMISSED_KEY = "beancount.billing.failedRenewalDismissed";

function wasDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

const noSubscription = () => () => {};

/**
 * While a renewal is past due, the shell says so on every page (PRFAQ005
 * question 15): which card failed, for which plan, and by when to update it,
 * with the billing portal one click away. A past-due subscription keeps its
 * paid tier, so the profile's tier gates the status query and a Free user
 * never sends it. Dismissing hides it for this browser session. The native
 * app's web view never shows billing.
 */
export function FailedRenewalBanner() {
  const { t } = useTranslations();
  const hidesBilling = useHidesBilling();
  const tier = useRootContext().userProfile?.tier as UserTier | undefined;
  // Read storage only after hydration, so the server and client agree.
  const dismissedEarlier = useSyncExternalStore(
    noSubscription,
    wasDismissed,
    () => false,
  );
  const [dismissedNow, setDismissedNow] = useState(false);
  const dismissed = dismissedEarlier || dismissedNow;
  const skip = hidesBilling || dismissed || !tier || tier === "FREE";
  const { data } = useQuery(GetSubscriptionStatusDocument, { skip });
  const { handleManageBilling, loading } = useSubscriptionPortal();
  const formatDate = useBillingDateFormat();

  const pastDue = data?.subscriptionStatus.subscriptions.find(
    (subscription) =>
      subscription.status === "past_due" && subscription.nextPaymentAttempt,
  );
  if (skip || !pastDue?.nextPaymentAttempt) return null;
  // Stripe's banner only: a store collects its own payments (ADR 001 D15).
  if (isBilledByStore(data?.subscriptionStatus.billing ?? null)) return null;

  const plan = t(planLabelKey(tier));
  const card = pastDue.paymentMethod
    ? `${pastDue.paymentMethod.brand} •••• ${pastDue.paymentMethod.last4}`
    : t("common.failedRenewalYourCard");

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Without storage the banner returns on the next page, which is safe.
    }
    setDismissedNow(true);
  };

  return (
    <div
      role="status"
      data-testid="failed-renewal-banner"
      className="flex flex-wrap items-center gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm"
    >
      <AlertTriangle
        aria-hidden
        className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400"
      />
      <p className="flex-1">
        {t("common.failedRenewal", {
          card,
          plan,
          date: formatDate(pastDue.nextPaymentAttempt),
        })}
      </p>
      <Button
        size="sm"
        disabled={loading}
        onClick={() => void handleManageBilling(pastDue.clientId)}
      >
        {t("common.failedRenewalUpdate")}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        aria-label={t("common.failedRenewalDismiss")}
        onClick={dismiss}
      >
        <X aria-hidden className="h-4 w-4" />
      </Button>
    </div>
  );
}
