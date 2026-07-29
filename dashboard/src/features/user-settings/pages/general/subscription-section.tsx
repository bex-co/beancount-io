import { useMemo } from "react";
import { CreditCard, Loader2, AlertCircle, TestTube } from "lucide-react";
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
import { useCreateSubscriptionSession } from "@/features/user-settings/hooks/use-create-subscription-session";
import { useUpgradeSubscription } from "@/features/user-settings/hooks/use-upgrade-subscription";
import { useSubscriptionStatus } from "@/features/user-settings/hooks/use-subscription-status";
import { useSubscriptionPortal } from "@/features/user-settings/hooks/use-subscription-portal";
import { useSubscriptionCancel } from "@/features/user-settings/hooks/use-subscription-cancel";
import { useSubscriptionResume } from "@/features/user-settings/hooks/use-subscription-resume";
import { getStripePlanConfigFromUrl } from "./stripe-config";
import type { SubscriptionTier } from "./stripe-config";
import { getUpgradeTiers } from "@/common/lib/subscription/tier-config";
import {
  useAllTierQuotas,
  type TierQuota,
} from "@/common/hooks/use-all-tier-quotas";
import { CurrentPlanBanner } from "./subscription-plan-banner";
import { UsageOverview } from "./subscription-usage-overview";
import { UpgradeTierCards } from "./subscription-upgrade-cards";
import { BillingSection } from "./subscription-billing-section";
import {
  CancelSubscriptionDialog,
  ResumeSubscriptionDialog,
} from "./subscription-dialogs";

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

function SubscriptionHeader({
  isTestMode,
  t,
}: {
  isTestMode: boolean;
  t: (key: string) => string;
}) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <CardTitle>{t("userSettings.subscription")}</CardTitle>
        </div>
        {isTestMode && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md text-xs font-medium border border-yellow-200 dark:border-yellow-800">
            <TestTube className="h-3.5 w-3.5" />
            <span>{t("userSettings.testMode")}</span>
          </div>
        )}
      </div>
      <CardDescription>{t("userSettings.manageSubscription")}</CardDescription>
    </CardHeader>
  );
}

export function SubscriptionSection() {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const {
    tier,
    limits,
    isLoading: limitsLoading,
    refetch: refetchUserLimits,
  } = useUserLimits();
  const {
    aiCfoTokensUsed,
    aiCfoTokensMax,
    isLoading: aiCfoLoading,
  } = useAiCfoUsage();
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
    showCancelDialog,
    setShowCancelDialog,
    selectedSubscription,
    handleCancelClick,
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
  const { upgradeSubscription, loading: upgradeLoading } =
    useUpgradeSubscription();

  const stripeConfig = useMemo(() => getStripePlanConfigFromUrl(), []);
  const isTestMode = stripeConfig.environment === "development";

  const upgradeTiers = useMemo(() => getUpgradeTiers(tier), [tier]);

  const quotaByUserTier = useMemo(() => {
    const map: Record<string, TierQuota> = {};
    for (const q of tierQuotas ?? []) {
      map[q.tier] = q;
    }
    return map;
  }, [tierQuotas]);

  const handleUpgradeCheckout = async (tierKey: SubscriptionTier) => {
    try {
      const response = await createSubscriptionSession({
        variables: {
          clientId: stripeConfig.clientId,
          priceId: stripeConfig[tierKey].monthly,
        },
      });
      const result = response.data?.createSubscriptionSession;
      if (result?.success && result.sessionUrl) {
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

  const handleUpgradeExisting = async (tierKey: SubscriptionTier) => {
    try {
      const response = await upgradeSubscription({
        variables: {
          clientId: stripeConfig.clientId,
          priceId: stripeConfig[tierKey].monthly,
        },
      });
      const result = response.data?.upgradeSubscription;
      if (result?.success) {
        toast.success(result.message || t("userSettings.subscriptionUpgraded"));
        await Promise.all([refetchSubscription(), refetchUserLimits()]);
      } else if (result?.clientSecret) {
        toast.info(t("userSettings.paymentRequiresAuth"));
      } else {
        toast.error(
          result?.message || t("userSettings.failedToCreateCheckoutSession"),
        );
      }
    } catch (error) {
      toast.error(formatError(error));
    }
  };

  const isLoading =
    limitsLoading || subscriptionLoading || aiCfoLoading || quotasLoading;

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
      <SubscriptionHeader isTestMode={isTestMode} t={t} />
      <CardContent className="space-y-6">
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
            />

            {limits && (
              <>
                <Separator />
                <UsageOverview
                  limits={limits}
                  aiCfoTokensUsed={aiCfoTokensUsed}
                  aiCfoTokensMax={aiCfoTokensMax}
                  t={t}
                />
              </>
            )}

            {upgradeTiers.length > 0 && (
              <>
                <Separator />
                {showUpgradeNudge && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                    <span>
                      {ledgerPercentage >= 100
                        ? "You've reached your ledger limit. Upgrade to create more ledgers."
                        : `You're using ${Math.round(aiPercentage)}% of your monthly AI tokens. Upgrade to avoid interruptions.`}
                    </span>
                  </div>
                )}
                <UpgradeTierCards
                  upgradeTiers={upgradeTiers}
                  quotaByUserTier={quotaByUserTier}
                  hasActiveStripeSubscription={hasActiveStripeSubscription}
                  t={t}
                  checkoutLoading={checkoutLoading}
                  upgradeLoading={upgradeLoading}
                  onUpgradeCheckout={handleUpgradeCheckout}
                  onUpgradeExisting={handleUpgradeExisting}
                />
              </>
            )}

            {hasActiveStripeSubscription && subscriptions && (
              <>
                <Separator />
                <BillingSection
                  subscriptions={subscriptions}
                  t={t}
                  portalLoading={portalLoading}
                  cancelLoading={cancelLoading}
                  resumeLoading={resumeLoading}
                  onManageBilling={handleManageBilling}
                  onCancelClick={handleCancelClick}
                  onResumeClick={handleResumeClick}
                />
              </>
            )}
          </>
        )}
      </CardContent>

      <CancelSubscriptionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        selectedSubscription={selectedSubscription}
        cancelLoading={cancelLoading}
        t={t}
        onConfirm={handleCancelConfirm}
      />

      <ResumeSubscriptionDialog
        open={showResumeDialog}
        onOpenChange={setShowResumeDialog}
        selectedSubscription={selectedResumeSubscription}
        resumeLoading={resumeLoading}
        t={t}
        onConfirm={handleResumeConfirm}
      />
    </Card>
  );
}
