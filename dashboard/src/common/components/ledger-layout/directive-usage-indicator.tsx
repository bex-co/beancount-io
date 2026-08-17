import { memo } from "react";
import { useQuery } from "@apollo/client/react";
import { Gauge } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { GetLedgerEntriesCountPerTypeDocument } from "@/graphql/definitions.ts";
import { Button } from "@/common/components/ui/button.tsx";
import { track } from "@/common/analytics";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import { useUserLimits } from "@/common/hooks/use-user-limits.ts";
import { useReactNativeContext } from "@/common/providers/react-native-bridge-provider/react-native-bridge-context";
import { cn } from "@/common/lib/utils/utils.ts";

/**
 * Directive-usage indicator for the ledger sidebar footer. Shows how many
 * beancount directives the open ledger has used against the account's
 * free-tier limit (`maxDirectives`), with an upgrade prompt once usage
 * reaches 90% — before the write is actually blocked, not just at the wall.
 * Renders null for unlimited (paid) tiers.
 *
 * Hitting the free-tier cap is an upgrade nudge, not an error, so the whole
 * component stays in amber/muted tones — no destructive/red, which is
 * reserved elsewhere for actual failures (sync errors, invalid data).
 *
 * No collapsed/icon-only variant: the sidebar collapses to an icon rail, and
 * this usage card can't shrink to that width, so its wrapper in
 * `ledger-sidebar.tsx` hides it (`group-data-[collapsible=icon]:hidden`) when
 * collapsed rather than rendering a cramped partial state here.
 */
export const DirectiveUsageIndicator = memo(
  ({ ledgerId }: { ledgerId: string }) => {
    const { t } = useTranslations();
    const { isReactNative } = useReactNativeContext();
    const { limits } = useUserLimits();

    const { data, loading } = useQuery(GetLedgerEntriesCountPerTypeDocument, {
      variables: { ledgerId },
      skip: !ledgerId,
    });

    const max = limits?.maxDirectives;
    const entriesByType = data?.getLedgerEntriesCountPerType;
    // Wait for a real count before rendering anything — `max` alone (from
    // useUserLimits, usually already cached) resolves well before this
    // ledger-scoped query does, so gating on `max` alone would flash a fake
    // "0 / max" for a moment before the real count arrives.
    if (max == null || max < 0 || loading || !entriesByType) {
      return null;
    }

    const used = entriesByType.reduce((sum, entry) => sum + entry.number, 0);
    const percentage = Math.min((used / max) * 100, 100);
    const isAtLimit = used >= max;
    const isApproachingLimit = percentage >= 90 && !isAtLimit;
    const isWarning = percentage >= 80; // color-only threshold, below the CTA threshold
    const showUpgradeCta = isAtLimit || isApproachingLimit;

    const barColor = isWarning ? "bg-amber-500" : "bg-primary";

    return (
      <div className="p-2">
        <div className="flex flex-col gap-2 rounded-lg bg-sidebar-accent p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium capitalize">
              <Gauge className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {t("common.directives")}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {used.toLocaleString()} / {max.toLocaleString()}
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-sidebar-border">
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${percentage}%` }}
            />
          </div>
          {showUpgradeCta && !isReactNative && (
            <div className="flex flex-col gap-1.5 pt-0.5">
              <span className="text-xs text-muted-foreground">
                {t(
                  isAtLimit
                    ? "common.directivesLimitReached"
                    : "common.directivesLimitApproaching",
                )}
              </span>
              <Button variant="default" size="sm" asChild className="w-full">
                <Link
                  to="/settings/general"
                  onClick={() =>
                    track("upgrade_prompt_clicked", {
                      surface: "directive_usage",
                    })
                  }
                >
                  {t("common.upgradeToPro")}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  },
);

DirectiveUsageIndicator.displayName = "DirectiveUsageIndicator";
