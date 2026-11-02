import { useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { Button } from "@/common/components/ui/button";
import { useIsAuthenticated } from "@/common/hooks/use-is-authenticated";
import { storeCopy } from "@/common/lib/subscription/store-copy";
import { BillingBanner } from "./billing-banner";
import { useTranslations } from "@/common/hooks/use-translations";
import { useHidesBilling } from "@/common/hooks/use-hides-billing";
import {
  GetBillingStatusDocument,
  type GetBillingStatusQuery,
} from "@/graphql/definitions";

const noSubscription = () => () => {};

const PAYMENT_PROBLEM_STATUSES = new Set(["GRACE", "ON_HOLD"]);

function paysTwiceKey({
  hasActiveSubscription,
  billing,
}: GetBillingStatusQuery["subscriptionStatus"]): string {
  if (!hasActiveSubscription) return "common.billedTwiceByStores";
  return storeCopy(billing.store?.provider).billedTwice;
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
  const signedIn = useIsAuthenticated();
  // Nothing renders before hydration, so nothing is asked for until then:
  // a tab an app opened learns it hides billing only once hydrated.
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const skip = hidesBilling || !signedIn || !hydrated;
  const { data } = useQuery(GetBillingStatusDocument, { skip });
  const status = skip ? undefined : data?.subscriptionStatus;
  if (!status?.billing) return null;

  const { duplicateBilling, store } = status.billing;
  if (duplicateBilling) {
    return (
      <BillingBanner
        testId="duplicate-billing-banner"
        message={t(paysTwiceKey(status))}
      >
        <Button size="sm" asChild>
          <Link to="/settings/billing">{t("userSettings.billing")}</Link>
        </Button>
      </BillingBanner>
    );
  }

  // Only Google Play has a page to send them to; Apple has none on the Web.
  if (store?.managementUrl && PAYMENT_PROBLEM_STATUSES.has(store.status)) {
    return (
      <BillingBanner
        testId="google-play-payment-banner"
        message={t("common.googlePlayPaymentProblem")}
      >
        <Button size="sm" asChild>
          <a href={store.managementUrl} target="_blank" rel="noreferrer">
            {t("userSettings.manageOnGooglePlay")}
          </a>
        </Button>
      </BillingBanner>
    );
  }

  return null;
}
