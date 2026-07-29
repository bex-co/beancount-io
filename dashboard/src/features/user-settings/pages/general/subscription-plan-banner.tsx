import { Crown } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { type UserTier } from "@/common/hooks/use-user-limits";
import { getTierInfo } from "@/common/lib/subscription/tier-config";
import { type TierQuota } from "@/common/hooks/use-all-tier-quotas";

export function CurrentPlanBanner({
  tier,
  renewalDate,
  tierQuota,
  t,
}: {
  tier: UserTier;
  renewalDate: string | null;
  tierQuota: TierQuota | null;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  const tierInfo = getTierInfo(tier);
  const isFree = tier === "FREE";
  const isEnterprise = tier === "ENTERPRISE";

  const tierName = isFree
    ? t("userSettings.freePlan")
    : isEnterprise
      ? t("userSettings.enterprisePlan")
      : tierInfo
        ? t(tierInfo.labelKey)
        : t("userSettings.freePlan");

  const featureSummary = tierQuota
    ? [
        `${tierQuota.aiCfoTokensMax.toLocaleString()} AI tokens`,
        `${tierQuota.maxLedgers} ${tierQuota.maxLedgers === 1 ? "ledger" : "ledgers"}`,
        tierQuota.maxDirectives === -1
          ? "Unlimited directives"
          : `${tierQuota.maxDirectives.toLocaleString()} directives`,
        `${tierQuota.maxCollaboratorsPerLedger} ${tierQuota.maxCollaboratorsPerLedger === 1 ? "collaborator" : "collaborators"}/ledger`,
      ].join(" · ")
    : isEnterprise
      ? t("userSettings.unlimited")
      : null;

  return (
    <div
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
            {renewalDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("userSettings.renewsOn")} <strong>{renewalDate}</strong>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
