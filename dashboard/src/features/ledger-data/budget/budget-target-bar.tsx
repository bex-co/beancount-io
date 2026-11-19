import { useTranslations } from "@/common/hooks/use-translations";
import { cn } from "@/common/lib/utils/utils";
import type { BudgetVarianceStatus } from "./budget-snapshot";

/** The track's full width, as a share of target: room to show how far over. */
const SCALE = 150;

/**
 * How far the actual has come against its target, on one scale for every
 * budget: the track runs to 150% of target with the target marked, so 121%
 * and 109% read differently, and the share is written beside it.
 */
export function BudgetTargetBar({
  percent,
  status,
  favorable,
  className,
}: {
  percent: number | null;
  status: BudgetVarianceStatus | null;
  favorable: boolean;
  className?: string;
}) {
  const { i18n } = useTranslations();
  const share =
    percent === null
      ? null
      : new Intl.NumberFormat(i18n.language, {
          style: "percent",
          maximumFractionDigits: 0,
        }).format(percent / 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        {percent !== null && (
          <div
            className={cn(
              "h-full rounded-full",
              status === "progress"
                ? "bg-muted-foreground/50"
                : favorable
                  ? "bg-emerald-600"
                  : "bg-destructive",
            )}
            style={{ width: `${(Math.min(percent, SCALE) / SCALE) * 100}%` }}
          />
        )}
        {/* The target itself. */}
        <span
          aria-hidden="true"
          className="absolute top-0 h-full w-0.5 bg-foreground/70"
          style={{ insetInlineStart: `${(100 / SCALE) * 100}%` }}
        />
      </div>
      {share !== null && (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {share}
        </span>
      )}
    </div>
  );
}
