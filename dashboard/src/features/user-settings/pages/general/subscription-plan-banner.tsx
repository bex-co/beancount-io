import { Crown } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { type UserTier } from "@/common/hooks/use-user-limits";
import { planLabelKey } from "@/common/lib/subscription/tier-config";
import { type TierQuota } from "@/common/hooks/use-all-tier-quotas";
import { useQuotaNumberFormat } from "./use-quota-number-format";
import { describeTierQuota } from "./tier-quota-summary";
import { useMoneyFormat } from "./use-money-format";
import type { PlanInterval } from "@/common/lib/subscription/plan-change";
import type { PlanBillingStatus } from "@/features/user-settings/hooks/use-subscription-status";
import { PlanBillingSource } from "./plan-billing-source";

/** What the current Stripe subscription bills, when there is one. */
export interface CurrentBilling {
  interval: PlanInterval | null;
  /** Cents, as Stripe reports the price. */
  amount: number;
  currency: string;
  isLegacyPrice: boolean;
  paymentMethod: { brand: string; last4: string } | null;
}

export function CurrentPlanBanner({
  tier,
  renewalDate,
  tierQuota,
  t,
  billing = null,
  planBilling = null,
}: {
  tier: UserTier;
  renewalDate: string | null;
  tierQuota: TierQuota | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  billing?: CurrentBilling | null;
  /** Who bills the plan, on any source. */
  planBilling?: PlanBillingStatus | null;
}) {
  const formatCount = useQuotaNumberFormat();
  const formatMoney = useMoneyFormat();
  const isFree = tier === "FREE";
  const isEnterprise = tier === "ENTERPRISE";
  const tierName = t(planLabelKey(tier));

  const featureSummary = tierQuota
    ? describeTierQuota(tierQuota, t, formatCount)
    : isEnterprise
      ? t("userSettings.unlimited")
      : null;

  return (
    <div
      data-testid="current-plan-banner"
      className={`rounded-lg border p-4 ${
        isFree ? "border-border bg-muted/30" : "border-primary/20 bg-primary/5"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isFree ? "bg-muted" : "bg-primary/10"
            }`}
          >
            <Crown
              className={`h-4.5 w-4.5 ${
                isFree ? "text-muted-foreground" : "text-primary"
              }`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{tierName}</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {t("userSettings.currentPlan")}
              </Badge>
            </div>
            {featureSummary && (
              <p
                data-testid="feature-summary"
                className="text-xs text-muted-foreground mt-2"
              >
                {featureSummary}
              </p>
            )}
            {billing && (
              <p
                data-testid="current-billing"
                className="text-xs text-muted-foreground mt-2"
              >
                <strong className="text-foreground">
                  {formatMoney(billing.amount, billing.currency)}
                  {t(
                    billing.interval === "year"
                      ? "userSettings.perYear"
                      : "userSettings.perMonth",
                  )}
                </strong>
                {billing.isLegacyPrice && (
                  <> · {t("userSettings.legacyPrice")}</>
                )}
                {billing.paymentMethod && (
                  <>
                    {" · "}
                    <span className="capitalize">
                      {billing.paymentMethod.brand}
                    </span>{" "}
                    •••• {billing.paymentMethod.last4}
                  </>
                )}
              </p>
            )}
            {renewalDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("userSettings.renewsOn")} <strong>{renewalDate}</strong>
              </p>
            )}
            <PlanBillingSource tier={tier} billing={planBilling} t={t} />
          </div>
        </div>
      </div>
    </div>
  );
}
