import { Bot, Crown, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { track } from "@/common/analytics";
import { useTranslations } from "@/common/hooks/use-translations";
import { useUserLimits } from "@/common/hooks/use-user-limits";
import { useAiCfoUsage } from "@/common/hooks/use-ai-cfo-usage";
import { TIER_RANK, TIERS } from "@/common/lib/subscription/tier-config";
import { cn } from "@/common/lib/utils/utils";
import { useAllTierQuotas } from "@/common/hooks/use-all-tier-quotas";

export function AiCfoUpgradePanel({ className }: { className?: string } = {}) {
  const { t } = useTranslations();
  const { tier, isLoading: limitsLoading } = useUserLimits();
  const {
    aiCfoTokensUsed,
    aiCfoTokensMax,
    isLoading: usageLoading,
  } = useAiCfoUsage();
  const { quotas: tierQuotas, isLoading: quotasLoading } = useAllTierQuotas();

  const isLoading = limitsLoading || usageLoading || quotasLoading;
  if (isLoading || aiCfoTokensMax === 0) return null;
  const isUnlimited = aiCfoTokensMax === -1;

  // Hide for unlimited (enterprise) users
  if (isUnlimited) return null;

  const currentRank = TIER_RANK[tier] ?? 0;
  const availableTiers = TIERS.filter((t) => t.rank > currentRank);

  const percentage = Math.min((aiCfoTokensUsed / aiCfoTokensMax) * 100, 100);
  if (percentage < 80) return null;

  const isAtLimit = aiCfoTokensUsed >= aiCfoTokensMax;

  return (
    <div
      className={cn(
        "mb-4 overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-amber-50/50 dark:border-amber-800/60 dark:from-amber-950/40 dark:to-amber-950/10",
        className,
      )}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isAtLimit ? "bg-destructive/10" : "bg-amber-100 dark:bg-amber-900/40"}`}
          >
            <Bot
              className={`h-4 w-4 ${isAtLimit ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold leading-none mb-1">
              {t("aiAgent.upgradeTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("aiAgent.upgradeDescription", {
                used: aiCfoTokensUsed.toLocaleString(),
                max: aiCfoTokensMax.toLocaleString(),
              })}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              {aiCfoTokensUsed.toLocaleString()} /{" "}
              {aiCfoTokensMax.toLocaleString()}
            </span>
            <span
              className={`text-[11px] font-semibold ${isAtLimit ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`}
            >
              {Math.round(percentage)}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-amber-100 dark:bg-amber-900/30">
            <div
              className={`h-full rounded-full transition-all ${
                isAtLimit
                  ? "bg-destructive"
                  : "bg-gradient-to-r from-amber-400 to-amber-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tier cards */}
      {availableTiers.length > 0 && (
        <div
          className={`grid grid-cols-1 ${availableTiers.length >= 3 ? "sm:grid-cols-3" : availableTiers.length === 2 ? "sm:grid-cols-2" : ""} gap-2.5 px-4 pb-4 pt-1`}
        >
          {availableTiers.map(({ key, price, labelKey, userTier, popular }) => {
            const quota = tierQuotas?.find((q) => q.tier === userTier);
            const tokens = quota?.aiCfoTokensMax ?? 0;
            return (
              <div
                key={key}
                className={`relative flex flex-col rounded-lg border bg-background p-3 transition-shadow hover:shadow-md ${
                  popular
                    ? "border-primary shadow-sm ring-1 ring-primary/20"
                    : "border-border"
                }`}
              >
                {popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2 py-0">
                    <Sparkles className="!size-2.5" />
                    {t("aiAgent.popular")}
                  </Badge>
                )}

                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t(labelKey)}
                </span>

                <div className="flex items-baseline gap-0.5 mb-1.5">
                  <span className="text-xl font-bold tracking-tight">
                    {price}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {t("aiAgent.perMonth")}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mb-3">
                  {t("aiAgent.tokensPerMonth", {
                    count: tokens.toLocaleString(),
                  })}
                </p>

                <Button
                  asChild
                  size="sm"
                  variant={popular ? "default" : "outline"}
                  className="w-full mt-auto"
                >
                  <Link
                    to="/settings/general"
                    onClick={() =>
                      track("upgrade_prompt_clicked", {
                        surface: "ai_cfo_panel",
                        target_tier: userTier,
                      })
                    }
                  >
                    {popular ? (
                      <Crown className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                    {t("aiAgent.upgradeCta")}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
