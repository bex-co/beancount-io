import { useFormatCount } from "@/common/hooks/use-format-count";
import { cn } from "@/common/lib/utils/utils";

/** How close to the limit the count appears. */
const NEAR = 0.9;

/**
 * `2,040 / 2,048` under a capped field once its text nears the limit, so a
 * reader learns of the cap before `maxLength` silently stops their typing or
 * cuts a paste short (w2/130).
 */
export function LengthCounter({
  length,
  max,
}: {
  length: number;
  max: number;
}) {
  return length < max * NEAR ? null : <Count length={length} max={max} />;
}

function Count({ length, max }: { length: number; max: number }) {
  const formatCount = useFormatCount();
  return (
    <p
      dir="ltr"
      className={cn(
        "text-xs tabular-nums text-end",
        length > max ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {formatCount(length)} / {formatCount(max)}
    </p>
  );
}
