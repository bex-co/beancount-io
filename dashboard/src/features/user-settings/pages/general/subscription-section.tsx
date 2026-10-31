import { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Separator } from "@/common/components/ui/separator";
import { toast } from "sonner";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useUserLimits } from "@/common/hooks/use-user-limits";
import { useAiCfoUsage } from "@/common/hooks/use-ai-cfo-usage";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import { useCreateSubscriptionSession } from "@/features/user-settings/hooks/use-create-subscription-session";
import { useSubscriptionStatus } from "@/features/user-settings/hooks/use-subscription-status";
import { useSubscriptionPortal } from "@/features/user-settings/hooks/use-subscription-portal";
import { useSubscriptionCancel } from "@/features/user-settings/hooks/use-subscription-cancel";
import { useSubscriptionResume } from "@/features/user-settings/hooks/use-subscription-resume";
import {
  cyclePrice,
  LEGACY_PRICE_IDS,
  stripePlanConfig,
  type BillingCycle,
  type SubscriptionTier,
} from "./stripe-config";
import {
  getTierInfo,
  planLabelKey,
  getUpgradeTiers,
  tierInfoByKey,
} from "@/common/lib/subscription/tier-config";
import {
  useAllTierQuotas,
  type TierQuota,
} from "@/common/hooks/use-all-tier-quotas";
import { CurrentPlanBanner } from "./subscription-plan-banner";
import { describeTierQuota } from "./tier-quota-summary";
import { CheckoutConfirmation } from "./checkout-confirmation";
import { useCheckoutConfirmation } from "./use-checkout-confirmation";
import { useBillingDateFormat, useMoneyFormat } from "./use-money-format";
import { useQuotaNumberFormat } from "./use-quota-number-format";
import {
  rememberReturnPath,
  takeReturnPath,
} from "@/features/user-settings/lib/billing-return";
import { celebrate } from "@/features/user-settings/lib/celebrate";
import {
  claimCelebration,
  isFreshCheckoutInvoice,
  recordPurchase,
} from "@/features/user-settings/lib/purchase";
import { CheckoutReturnTo } from "@/graphql/definitions";
import { UsageOverview } from "./subscription-usage-overview";
import { PlanPicker } from "./subscription-plan-picker";
import { PayYearlyOffer } from "./subscription-pay-yearly";
import { PlanChangeSheet, type PlanChangeTarget } from "./plan-change-sheet";
import { CancelSheet } from "./cancel-sheet";
import { ScheduledPanel } from "./scheduled-panel";
import { useKeepCurrentPlan } from "@/features/user-settings/hooks/use-keep-current-plan";
import { planValue } from "@/common/lib/subscription/plan-change";
import { track, type CancelReason } from "@/common/analytics";
import type { PlanInterval } from "@/common/lib/subscription/plan-change";
import { BillingSection } from "./subscription-billing-section";
import { ResumeSubscriptionDialog } from "./subscription-dialogs";

function SubscriptionSkeleton() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function SubscriptionError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function SubscriptionHeader({ t }: { t: (key: string) => string }) {
  return (
    <CardHeader>
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5" />
        <CardTitle>
          <h2>{t("userSettings.subscription")}</h2>
        </CardTitle>
      </div>
      <CardDescription>{t("userSettings.manageSubscription")}</CardDescription>
    </CardHeader>
  );
}

export function SubscriptionSection({
  checkoutReturned = false,
  returnTo,
  onCheckoutDismiss,
  initialTarget = null,
  onSheetClose,
}: {
  /** A deep link's plan and cycle: the change sheet opens on it. */
  initialTarget?: PlanChangeTarget | null;
  /** The sheet closed; a deep link's plan should leave the URL. */
  onSheetClose?: () => void;
  /** Stripe Checkout just returned here with `checkout=success`. */
  checkoutReturned?: boolean;
  /** Where the purchase began, a safe same-origin path, offered back after. */
  returnTo?: string;
  onCheckoutDismiss?: () => void;
} = {}) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const {
    tier,
    limits,
    isLoading: limitsLoading,
    refetch: refetchUserLimits,
  } = useUserLimits();
  const {
    usage: aiCfoUsage,
    aiCfoTokensUsed,
    aiCfoTokensMax,
    isLoading: aiCfoLoading,
    error: aiCfoError,
    refetch: refetchAiCfoUsage,
  } = useAiCfoUsage();
  // Usage is unknown only while no read has succeeded: a failed refresh
  // keeps the counts an earlier read returned (w4/312).
  const aiCfoRetry = useQueryRetry(aiCfoError, refetchAiCfoUsage);
  const aiUsageUnavailable =
    !aiCfoUsage && aiCfoRetry.failure
      ? { retrying: aiCfoRetry.retrying, onRetry: aiCfoRetry.retry }
      : null;
  const { quotas: tierQuotas, isLoading: quotasLoading } = useAllTierQuotas();

  const {
    loading: subscriptionLoading,
    error: subscriptionError,
    refetch: refetchSubscription,
    hasActiveStripeSubscription,
    renewalDate,
    subscriptions,
  } = useSubscriptionStatus();

  const { handleManageBilling, loading: portalLoading } =
    useSubscriptionPortal();
  const {
    loading: cancelLoading,
    cancelTarget,
    openCancelSheet,
    closeCancelSheet,
    handleCancelConfirm,
  } = useSubscriptionCancel();
  const {
    loading: resumeLoading,
    showResumeDialog,
    setShowResumeDialog,
    selectedResumeSubscription,
    handleResumeClick,
    handleResumeConfirm,
  } = useSubscriptionResume();

  const { createSubscriptionSession, loading: checkoutLoading } =
    useCreateSubscriptionSession();
  const [sheetTarget, setSheetTarget] = useState<PlanChangeTarget | null>(
    initialTarget,
  );

  const upgradeTiers = useMemo(() => getUpgradeTiers(tier), [tier]);

  const quotaByUserTier = useMemo(() => {
    const map: Record<string, TierQuota> = {};
    for (const q of tierQuotas ?? []) {
      map[q.tier] = q;
    }
    return map;
  }, [tierQuotas]);

  const startCheckout = async (target: PlanChangeTarget) => {
    track("checkout_started", {
      surface: target.surface,
      target_tier: tierInfoByKey(target.tier).userTier,
    });
    try {
      const response = await createSubscriptionSession({
        variables: {
          clientId: stripePlanConfig.clientId,
          priceId: cyclePrice(target.tier, target.cycle).priceId,
          returnTo: CheckoutReturnTo.Billing,
        },
      });
      const result = response.data?.createSubscriptionSession;
      if (result?.success && result.sessionUrl) {
        rememberReturnPath(returnTo);
        window.location.href = result.sessionUrl;
      } else {
        toast.error(
          result?.message || t("userSettings.failedToCreateCheckoutSession"),
        );
      }
    } catch (error) {
      toast.error(formatError(error));
    }
  };

  const currentSubscription = hasActiveStripeSubscription
    ? subscriptions?.[0]
    : undefined;
  const currentPrice = currentSubscription?.items[0]?.price;
  const currentInterval: PlanInterval | null =
    currentPrice?.interval === "year"
      ? "year"
      : currentPrice?.interval === "month"
        ? "month"
        : null;
  const currentTierKey = getTierInfo(tier)?.key ?? null;
  const currentCycle: BillingCycle | null =
    currentInterval === "year"
      ? "yearly"
      : currentInterval === "month"
        ? "monthly"
        : null;
  const currentPlanValue = planValue(tier, currentCycle);

  const { keepCurrent, loading: keepingCurrent } = useKeepCurrentPlan();
  const formatDate = useBillingDateFormat();

  // Every immediate choice confirms in the sheet, which previews the charge.
  const handleChoose = (tierKey: SubscriptionTier, cycle: BillingCycle) =>
    setSheetTarget({ tier: tierKey, cycle, surface: "settings_billing" });

  const isLoading =
    limitsLoading ||
    subscriptionLoading ||
    (aiCfoLoading && !aiUsageUnavailable) ||
    quotasLoading;

  const formatMoney = useMoneyFormat();
  const formatCount = useQuotaNumberFormat();
  const [checkoutReturnPath] = useState(() =>
    checkoutReturned ? takeReturnPath() : null,
  );
  const confirmation = useCheckoutConfirmation(
    checkoutReturned,
    hasActiveStripeSubscription,
    () => {
      void refetchSubscription();
      void refetchUserLimits();
    },
  );
  // Checkout's first invoice, counted and celebrated once it is confirmed,
  // whatever it charged.
  const latestInvoice = currentSubscription?.latestInvoice;
  const checkoutInvoice =
    checkoutReturned &&
    confirmation === "done" &&
    latestInvoice?.billingReason === "subscription_create" &&
    isFreshCheckoutInvoice(latestInvoice.created)
      ? latestInvoice
      : null;
  const checkoutPriceId = currentPrice?.id;
  useEffect(() => {
    if (!checkoutInvoice || !checkoutPriceId) return;
    recordPurchase({
      invoiceId: checkoutInvoice.id,
      amount: checkoutInvoice.amountPaid,
      currency: checkoutInvoice.currency,
      priceId: checkoutPriceId,
    });
    // Celebrated even when analytics cannot report it.
    if (claimCelebration(checkoutInvoice.id)) void celebrate();
  }, [checkoutInvoice, checkoutPriceId]);
  const planLabel = [
    t(planLabelKey(tier)),
    currentInterval
      ? t(
          currentInterval === "year"
            ? "userSettings.yearly"
            : "userSettings.monthly",
        )
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const aiPercentage =
    aiCfoTokensMax > 0
      ? Math.min((aiCfoTokensUsed / aiCfoTokensMax) * 100, 100)
      : 0;
  const ledgerPercentage =
    limits && limits.ledgersMax > 0
      ? Math.min((limits.ledgersUsed / limits.ledgersMax) * 100, 100)
      : 0;
  const showUpgradeNudge =
    upgradeTiers.length > 0 && (aiPercentage >= 80 || ledgerPercentage >= 100);

  return (
    <Card>
      <SubscriptionHeader t={t} />
      <CardContent className="space-y-6">
        {checkoutReturned && (
          <CheckoutConfirmation
            state={confirmation}
            planLabel={planLabel}
            planName={t(planLabelKey(tier))}
            renewal={
              renewalDate && currentPrice
                ? {
                    date: renewalDate,
                    amount: formatMoney(
                      currentPrice.amount,
                      currentPrice.currency,
                    ),
                  }
                : null
            }
            unlocked={
              quotaByUserTier[tier]
                ? describeTierQuota(quotaByUserTier[tier], t, formatCount)
                : null
            }
            returnTo={checkoutReturnPath}
            t={t}
            onRefresh={() => {
              void refetchSubscription();
              void refetchUserLimits();
            }}
            onDismiss={() => onCheckoutDismiss?.()}
          />
        )}
        {isLoading ? (
          <SubscriptionSkeleton />
        ) : subscriptionError ? (
          <SubscriptionError
            message={t("userSettings.failedToLoadSubscription")}
          />
        ) : (
          <>
            <CurrentPlanBanner
              tier={tier}
              renewalDate={renewalDate}
              tierQuota={quotaByUserTier[tier] ?? null}
              t={t}
              billing={
                currentPrice
                  ? {
                      interval: currentInterval,
                      amount: currentPrice.amount,
                      currency: currentPrice.currency,
                      isLegacyPrice: LEGACY_PRICE_IDS.has(currentPrice.id),
                      paymentMethod: currentSubscription?.paymentMethod ?? null,
                    }
                  : null
              }
            />

            {currentSubscription && (
              <ScheduledPanel
                subscription={currentSubscription}
                currentName={planLabel}
                busy={resumeLoading || keepingCurrent}
                t={t}
                onResume={() =>
                  handleResumeClick(
                    currentSubscription.id,
                    currentSubscription.clientId,
                    formatDate(currentSubscription.currentPeriodEnd),
                  )
                }
                onKeepCurrent={(scheduledPlan) =>
                  void keepCurrent().then((kept) => {
                    if (kept && scheduledPlan) {
                      track("plan_change_reverted", {
                        from: currentPlanValue,
                        to: planValue(
                          tierInfoByKey(scheduledPlan.tier).userTier,
                          scheduledPlan.cycle,
                        ),
                      });
                    }
                  })
                }
              />
            )}

            {currentInterval === "month" && currentTierKey && currentPrice && (
              <PayYearlyOffer
                tier={currentTierKey}
                monthlyAmount={currentPrice.amount}
                t={t}
                busy={checkoutLoading}
                onSwitch={() =>
                  setSheetTarget({
                    tier: currentTierKey,
                    cycle: "yearly",
                    surface: "pay_yearly_offer",
                  })
                }
              />
            )}

            {limits && (
              <>
                <Separator />
                <UsageOverview
                  limits={limits}
                  aiCfoTokensUsed={aiCfoTokensUsed}
                  aiCfoTokensMax={aiCfoTokensMax}
                  aiUsageUnavailable={aiUsageUnavailable}
                  t={t}
                />
              </>
            )}

            <Separator />
            {showUpgradeNudge && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                <span>
                  {ledgerPercentage >= 100
                    ? t("page.dashboard.ledgerLimitReached")
                    : t("userSettings.aiUsageUpgradeNudge", {
                        percentage: formatCount(Math.round(aiPercentage)),
                      })}
                </span>
              </div>
            )}
            <PlanPicker
              tier={tier}
              currentInterval={currentInterval}
              quotaByUserTier={quotaByUserTier}
              t={t}
              busy={checkoutLoading}
              onChoose={handleChoose}
            />

            {hasActiveStripeSubscription && subscriptions && (
              <>
                <Separator />
                <BillingSection
                  subscriptions={subscriptions}
                  t={t}
                  portalLoading={portalLoading}
                  cancelLoading={cancelLoading}
                  onManageBilling={handleManageBilling}
                  onCancelClick={(target) => {
                    track("cancel_started", { from: currentPlanValue });
                    openCancelSheet(target);
                  }}
                />
              </>
            )}
          </>
        )}
      </CardContent>

      <PlanChangeSheet
        key={sheetTarget ? `${sheetTarget.tier}-${sheetTarget.cycle}` : "none"}
        target={sheetTarget}
        currentTier={tier}
        currentCycle={currentCycle}
        currentPlanLabel={planLabel}
        checkoutPending={checkoutLoading}
        ledgersUsed={limits?.ledgersUsed ?? null}
        quotaByUserTier={quotaByUserTier}
        t={t}
        returnTo={returnTo}
        onClose={() => {
          setSheetTarget(null);
          onSheetClose?.();
        }}
        onCheckout={(target) => void startCheckout(target)}
        onManageBilling={() =>
          void handleManageBilling(stripePlanConfig.clientId)
        }
        onChanged={() => {
          void refetchSubscription();
          void refetchUserLimits();
        }}
      />

      {cancelTarget && (
        <CancelSheet
          planName={t(planLabelKey(tier))}
          tier={currentTierKey}
          cycle={currentCycle}
          endsAt={cancelTarget.endsAt}
          freeQuota={quotaByUserTier.FREE}
          busy={cancelLoading}
          t={t}
          onConfirm={(reason) =>
            void handleCancelConfirm(reason).then((cancelled) => {
              if (cancelled) {
                track("cancel_confirmed", {
                  from: currentPlanValue,
                  ...(reason
                    ? { reason: reason.toLowerCase() as CancelReason }
                    : {}),
                });
              }
            })
          }
          onKeep={closeCancelSheet}
          onAlternative={(target) => {
            closeCancelSheet();
            setSheetTarget({ ...target, surface: "cancel_sheet" });
          }}
        />
      )}

      <ResumeSubscriptionDialog
        open={showResumeDialog}
        onOpenChange={setShowResumeDialog}
        selectedSubscription={selectedResumeSubscription}
        resumeLoading={resumeLoading}
        t={t}
        onConfirm={() =>
          void handleResumeConfirm().then((resumed) => {
            if (resumed) {
              track("subscription_resumed", { from: currentPlanValue });
            }
          })
        }
      />
    </Card>
  );
}
