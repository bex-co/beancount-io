import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { cn } from "@/common/lib/utils/utils";
import { track } from "@/common/analytics";
import type { UserTier } from "@/common/hooks/use-user-limits";
import { type TierQuota } from "@/common/hooks/use-all-tier-quotas";
import {
  IMMEDIATE_CHOICES,
  planChoice,
  type PlanChoice,
  type PlanInterval,
} from "@/common/lib/subscription/plan-change";
import { ENTERPRISE_CONTACT_URL } from "@/common/lib/subscription/tier-config";
import {
  BILLING_CYCLES,
  cyclePrice,
  DEFAULT_BILLING_CYCLE,
  monthlyEquivalent,
  yearlySaving,
  type BillingCycle,
  type SubscriptionTier,
} from "./stripe-config";
import { useMoneyFormat } from "./use-money-format";
import { useQuotaNumberFormat } from "./use-quota-number-format";
import {
  aiTokensLine,
  collaboratorsLine,
  ledgersLine,
} from "./tier-quota-summary";

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

interface PlanCard {
  userTier: UserTier;
  key: SubscriptionTier | null;
  labelKey: string;
  popular?: boolean;
}

const PLAN_CARDS: PlanCard[] = [
  { userTier: "FREE", key: null, labelKey: "userSettings.freePlan" },
  { userTier: "PREMIUM", key: "premium", labelKey: "aiAgent.premiumTier" },
  {
    userTier: "GROWTH",
    key: "growth",
    labelKey: "aiAgent.growthTier",
    popular: true,
  },
  {
    userTier: "ORGANIZATION",
    key: "organization",
    labelKey: "aiAgent.organizationTier",
  },
  {
    userTier: "ENTERPRISE",
    key: null,
    labelKey: "userSettings.enterprisePlan",
  },
];

const CHOICE_LABEL_KEYS: Record<PlanChoice, string> = {
  CURRENT: "userSettings.currentPlan",
  NEW: "aiAgent.upgradeCta",
  UPGRADE: "aiAgent.upgradeCta",
  TO_YEARLY: "userSettings.switchToYearly",
  DOWNGRADE: "userSettings.downgrade",
  TO_MONTHLY: "userSettings.switchToMonthly",
  SPLIT: "aiAgent.upgradeCta",
};

function cycleInterval(cycle: BillingCycle): PlanInterval {
  return cycle === "yearly" ? "year" : "month";
}

export function PlanPicker({
  tier,
  currentInterval,
  quotaByUserTier,
  t,
  busy,
  onChoose,
}: {
  tier: UserTier;
  /** The current subscription's cycle, or null without a Stripe subscription. */
  currentInterval: PlanInterval | null;
  quotaByUserTier: Record<string, TierQuota>;
  t: Translate;
  busy: boolean;
  onChoose: (tier: SubscriptionTier, cycle: BillingCycle) => void;
}) {
  // Yearly first: it is the cheaper way to hold any paid plan (PRFAQ005).
  const [cycle, setCycle] = useState<BillingCycle>(DEFAULT_BILLING_CYCLE);
  const formatMoney = useMoneyFormat();
  const formatCount = useQuotaNumberFormat();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          {t("userSettings.plans")}
        </h3>
        <div
          role="group"
          aria-label={t("userSettings.billingCycle")}
          className="inline-flex rounded-md border p-0.5 text-xs"
        >
          {BILLING_CYCLES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={cycle === option}
              onClick={() => {
                if (option === cycle) return;
                setCycle(option);
                track("billing_toggle_changed", {
                  to: option,
                  surface: "settings_billing",
                });
              }}
              className={cn(
                "rounded px-3 py-1 font-medium transition-colors aria-pressed:forced-selected",
                cycle === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(
                option === "yearly"
                  ? "userSettings.yearly"
                  : "userSettings.monthly",
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PLAN_CARDS.map((card) => {
          const quota = quotaByUserTier[card.userTier];
          const choice = planChoice(
            { tier, interval: currentInterval },
            {
              tier: card.userTier,
              interval: card.key ? cycleInterval(cycle) : null,
            },
          );
          const isCurrent = choice === "CURRENT";
          const actionable = !!card.key && !isCurrent && !busy;
          return (
            <div
              key={card.userTier}
              data-testid={`plan-card-${card.userTier}`}
              className={cn(
                "relative flex flex-col rounded-lg border p-4",
                card.popular
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border bg-background",
              )}
            >
              {card.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary px-2.5 py-0.5 text-xs text-primary-foreground">
                  <Sparkles className="!size-3" />
                  {t("aiAgent.popular")}
                </Badge>
              )}
              <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t(card.labelKey)}
              </span>

              <PlanPrice
                card={card}
                cycle={cycle}
                t={t}
                formatMoney={formatMoney}
                formatCount={formatCount}
              />

              {quota && (
                <ul className="mb-4 mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
                  <li>{ledgersLine(quota.maxLedgers, t, formatCount)}</li>
                  <li>
                    {collaboratorsLine(
                      quota.maxCollaboratorsPerLedger,
                      t,
                      formatCount,
                    )}
                  </li>
                  <li>{aiTokensLine(quota.aiCfoTokensMax, t, formatCount)}</li>
                </ul>
              )}

              {card.userTier === "ENTERPRISE" && !isCurrent ? (
                <Button asChild size="sm" variant="outline" className="w-full">
                  <a
                    href={ENTERPRISE_CONTACT_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("userSettings.contactUs")}
                  </a>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant={card.popular && actionable ? "default" : "outline"}
                  className="w-full"
                  disabled={!actionable}
                  aria-disabled={!actionable}
                  onClick={() => {
                    if (actionable && card.key) onChoose(card.key, cycle);
                  }}
                >
                  {t(CHOICE_LABEL_KEYS[choice])}
                </Button>
              )}
              {!isCurrent && !IMMEDIATE_CHOICES.has(choice) && card.key && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t("userSettings.planChangeAtRenewal")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanPrice({
  card,
  cycle,
  t,
  formatMoney,
  formatCount,
}: {
  card: PlanCard;
  cycle: BillingCycle;
  t: Translate;
  formatMoney: (cents: number) => string;
  formatCount: (value: number) => string;
}) {
  if (card.userTier === "FREE") {
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tracking-tight">
          {formatMoney(0)}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("userSettings.perMonth")}
        </span>
      </div>
    );
  }
  if (!card.key) {
    return (
      <p className="text-sm font-semibold">{t("userSettings.contactUs")}</p>
    );
  }
  const { amount } = cyclePrice(card.key, cycle);
  const perMonth = monthlyEquivalent(amount, cycle);
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tracking-tight">
          {formatMoney(perMonth)}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("userSettings.perMonth")}
        </span>
      </div>
      {cycle === "yearly" && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">
            {t("userSettings.billedYearly", { amount: formatMoney(amount) })}
          </span>
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {t("userSettings.saveYearlyPercent", {
              percent: formatCount(yearlySaving(card.key).percent),
            })}
          </Badge>
        </div>
      )}
    </div>
  );
}
