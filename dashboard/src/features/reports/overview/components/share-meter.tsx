import { useFormatPercent } from "@/common/hooks/use-format-percent";
import { cn } from "@/common/lib/utils/utils";

/**
 * A row's share of its total: a short meter on a visible track, then the
 * percentage. The track is what lets 2% read as a small share rather than a
 * stray mark, which a bare sliver along a divider could not.
 */
export function ShareMeter({
  share,
  className,
  fillClassName,
}: {
  /** 0 to 1. */
  share: number;
  className?: string;
  /** The fill's color, as a background class. */
  fillClassName: string;
}) {
  // The language's digits and percent sign, as every share is written.
  const formatPercent = useFormatPercent();
  const clamped = Math.max(0, Math.min(1, share));
  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-2 text-xs text-muted-foreground tabular-nums",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-1 w-10 overflow-hidden rounded-full bg-muted"
      >
        <span
          className={cn("block h-full rounded-full", fillClassName)}
          style={{ width: `${clamped * 100}%` }}
        />
      </span>
      {formatPercent(clamped, 1, 0)}
    </span>
  );
}
