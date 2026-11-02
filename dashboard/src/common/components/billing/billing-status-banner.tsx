import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { useRootContext } from "@/common/hooks/use-root-context";
import { useTranslations } from "@/common/hooks/use-translations";
import { useHidesBilling } from "@/common/hooks/use-hides-billing";
import {
  BillingSource,
  GetSubscriptionStatusDocument,
  type GetSubscriptionStatusQuery,
} from "@/graphql/definitions";

const PAYMENT_PROBLEM_STATUSES = new Set(["GRACE", "ON_HOLD"]);

function paysTwiceKey({
  hasActiveSubscription,
  billing,
}: GetSubscriptionStatusQuery["subscriptionStatus"]): string {
  if (!hasActiveSubscription) return "common.billedTwiceByStores";
  return billing.store?.provider === BillingSource.GooglePlay
    ? "common.billedTwiceGooglePlay"
    : "common.billedTwiceAppStore";
}

function Banner({
  testId,
  message,
  children,
}: {
  testId: string;
  message: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      data-testid={testId}
      className="flex flex-wrap items-center gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm"
    >
      <AlertTriangle
        aria-hidden
        className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400"
      />
      <p className="flex-1">{message}</p>
      <Button size="sm" asChild>
        {children}
      </Button>
    </div>
  );
}

/**
 * The billing problems only a store's state can show (ADR 001 D15): an account
 * paying two sources, and a Google Play plan whose payment failed. Apple shows
 * its own billing message, and the Web has no page for it. An account hold
 * takes the plan away, so this reads every signed-in account, Free included,
 * unlike the Stripe banner. The native app's web view never shows billing.
 */
export function BillingStatusBanner() {
  const { t } = useTranslations();
  const hidesBilling = useHidesBilling();
  const signedIn = Boolean(useRootContext().userProfile);
  const skip = hidesBilling || !signedIn;
  const { data } = useQuery(GetSubscriptionStatusDocument, { skip });
  const status = skip ? undefined : data?.subscriptionStatus;
  if (!status?.billing) return null;

  const { duplicateBilling, store } = status.billing;
  if (duplicateBilling) {
    return (
      <Banner
        testId="duplicate-billing-banner"
        message={t(paysTwiceKey(status))}
      >
        <Link to="/settings/billing">{t("userSettings.billing")}</Link>
      </Banner>
    );
  }

  // Only Google Play has a page to send them to; Apple has none on the Web.
  if (store?.managementUrl && PAYMENT_PROBLEM_STATUSES.has(store.status)) {
    return (
      <Banner
        testId="google-play-payment-banner"
        message={t("common.googlePlayPaymentProblem")}
      >
        <a href={store.managementUrl} target="_blank" rel="noreferrer">
          {t("userSettings.manageOnGooglePlay")}
        </a>
      </Banner>
    );
  }

  return null;
}
