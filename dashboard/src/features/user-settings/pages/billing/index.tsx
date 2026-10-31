import { useEffect, useRef } from "react";
import { Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageSEO } from "@/common/components/seo/page-seo";
import { useTranslations } from "@/common/hooks/use-translations";
import { useReactNativeContext } from "@/common/providers/react-native-bridge-provider/react-native-bridge-context";
import { SubscriptionSection } from "../general/subscription-section";
import { DEFAULT_BILLING_CYCLE } from "../general/stripe-config";
import { takeReturnPath } from "@/features/user-settings/lib/billing-return";
import { takePendingApproval } from "@/features/user-settings/lib/approval-return";
import { announcePlanLanded } from "@/features/user-settings/lib/plan-landed";

/**
 * Settings → Billing: the plan summary, the yearly offer, every plan, and the
 * billing actions. The native app's web view never shows billing (it does not
 * prompt for purchases), so it lands on the general settings instead.
 */
export default function BillingSettingsPage() {
  const { t } = useTranslations();
  const { isReactNative } = useReactNativeContext();
  const search = useSearch({ from: "/settings/billing" });
  const navigate = useNavigate();
  const canceled = search.checkout === "canceled";
  const canceledShown = useRef(false);
  // An abandoned Checkout: say nothing was charged once, then drop the flag
  // so a refresh does not repeat it, and the way back it remembered so a
  // later Checkout does not offer it.
  useEffect(() => {
    if (!canceled || canceledShown.current) return;
    canceledShown.current = true;
    takeReturnPath();
    toast.info(t("userSettings.checkoutCanceled"));
    void navigate({
      to: "/settings/billing",
      search: (prev) => ({ ...prev, checkout: undefined }),
      replace: true,
    });
  }, [canceled, navigate, t]);
  // A bank approval that left the page for a redirect: announce the change
  // the sheet remembered, once, then drop Stripe's parameters.
  const approvedIntent = search.payment_intent;
  const approvalStatus = search.redirect_status;
  const approvalHandled = useRef(false);
  useEffect(() => {
    if (!approvedIntent || !approvalStatus || approvalHandled.current) return;
    approvalHandled.current = true;
    const pending = takePendingApproval(approvedIntent);
    if (pending && approvalStatus === "succeeded") {
      announcePlanLanded(pending, t, pending.returnTo);
    }
    void navigate({
      to: "/settings/billing",
      search: (prev) => ({
        ...prev,
        payment_intent: undefined,
        redirect_status: undefined,
      }),
      replace: true,
    });
  }, [approvedIntent, approvalStatus, navigate, t]);
  if (isReactNative) return <Navigate to="/settings/general" replace />;
  return (
    <>
      <PageSEO titleKey="userSettings.billing" noIndex />
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">{t("userSettings.billing")}</h1>
        <SubscriptionSection
          checkoutReturned={search.checkout === "success"}
          returnTo={search.return}
          initialTarget={
            search.plan && search.checkout !== "success"
              ? {
                  tier: search.plan,
                  cycle: search.billing ?? DEFAULT_BILLING_CYCLE,
                  surface: search.from ?? "deep_link",
                }
              : null
          }
          onSheetClose={() => {
            if (!search.plan) return;
            void navigate({
              to: "/settings/billing",
              search: (prev) => ({
                ...prev,
                plan: undefined,
                billing: undefined,
                from: undefined,
              }),
              replace: true,
            });
          }}
          onCheckoutDismiss={() =>
            void navigate({
              to: "/settings/billing",
              search: {},
              replace: true,
            })
          }
        />
      </div>
    </>
  );
}
