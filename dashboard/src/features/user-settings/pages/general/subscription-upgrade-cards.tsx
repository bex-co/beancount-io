import { ArrowRight, ArrowUp, Sparkles } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { track } from "@/common/analytics";
import { type TierInfo } from "@/common/lib/subscription/tier-config";
import { type TierQuota } from "@/common/hooks/use-all-tier-quotas";
import { type SubscriptionTier } from "./stripe-config";

export function UpgradeTierCards({
  upgradeTiers,
  quotaByUserTier,
  hasActiveStripeSubscription,
  t,
  checkoutLoading,
  upgradeLoading,
  onUpgradeCheckout,
  onUpgradeExisting,
}: {
  upgradeTiers: TierInfo[];
  quotaByUserTier: Record<string, TierQuota>;
  hasActiveStripeSubscription: boolean;
  t: (key: string, params?: Record<string, string>) => string;
  checkoutLoading: boolean;
  upgradeLoading: boolean;
  onUpgradeCheckout: (tier: SubscriptionTier) => void;
  onUpgradeExisting: (tier: SubscriptionTier) => void;
}) {
  if (upgradeTiers.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">
        {t("userSettings.upgradeYourPlan")}
      </h4>
      <div
        className={`grid grid-cols-1 ${
          upgradeTiers.length >= 3
            ? "sm:grid-cols-3"
            : upgradeTiers.length === 2
              ? "sm:grid-cols-2"
              : ""
        } gap-3`}
      >
        {upgradeTiers.map(({ key, price, labelKey, userTier, popular }) => {
          const quota = quotaByUserTier[userTier];
          const tokens = quota?.aiCfoTokensMax ?? 0;
          const maxLedgers = quota?.maxLedgers ?? 0;
          const maxCollaborators = quota?.maxCollaboratorsPerLedger ?? 0;
          const maxDirectives = quota?.maxDirectives ?? 0;
          return (
            <div
              key={key}
              className={`relative flex flex-col rounded-lg border p-4 transition-shadow hover:shadow-md ${
                popular
                  ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/30"
                  : "border-border bg-background"
              }`}
            >
              {popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2.5 py-0.5">
                  <Sparkles className="!size-3" />
                  {t("aiAgent.popular")}
                </Badge>
              )}

              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {t(labelKey)}
              </span>

              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-xl font-bold tracking-tight">
                  {price}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("userSettings.perMonth")}
                </span>
              </div>

              <ul className="space-y-1 mb-4 flex-1">
                <li className="text-xs text-muted-foreground">
                  {t("userSettings.aiTokensPerMonth", {
                    count: tokens.toLocaleString(),
                  })}
                </li>
                <li className="text-xs text-muted-foreground">
                  {maxLedgers === -1
                    ? t("userSettings.unlimitedLedgers")
                    : t("userSettings.includedLedgers", {
                        count: String(maxLedgers),
                      })}
                </li>
                <li className="text-xs text-muted-foreground">
                  {maxDirectives === -1
                    ? t("userSettings.unlimitedDirectives")
                    : t("userSettings.includedDirectives", {
                        count: maxDirectives.toLocaleString(),
                      })}
                </li>
                <li className="text-xs text-muted-foreground">
                  {maxCollaborators === -1
                    ? t("userSettings.unlimitedCollaborators")
                    : t("userSettings.collaboratorsPerLedger", {
                        count: String(maxCollaborators),
                      })}
                </li>
              </ul>

              <Button
                size="sm"
                variant={popular ? "default" : "outline"}
                className="w-full"
                disabled={checkoutLoading || upgradeLoading}
                onClick={() => {
                  if (hasActiveStripeSubscription) {
                    onUpgradeExisting(key);
                  } else {
                    track("checkout_started", {
                      surface: "settings_billing",
                      target_tier: userTier,
                    });
                    onUpgradeCheckout(key);
                  }
                }}
              >
                {popular ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                {t("aiAgent.upgradeCta")}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
