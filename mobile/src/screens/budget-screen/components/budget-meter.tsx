import { useTheme } from "@/common/theme";
import { Progress } from "@/components";

type BudgetMeterProps = {
  /** Spend as a percentage of budget; values past 100 render full. */
  percent: number;
  /**
   * Drives the fill color — green on the good side of the target, red past it,
   * neutral when nothing is judged (w21/709).
   */
  favorable: boolean | null;
};

/** The budget progress bar, identical on the Home panel and the budget page. */
export function BudgetMeter({
  percent,
  favorable,
}: BudgetMeterProps): JSX.Element {
  const theme = useTheme().colorTheme;
  return (
    <Progress
      percent={percent}
      height={6}
      rounded
      color={
        favorable === null
          ? theme.black80
          : favorable
            ? theme.success
            : theme.error
      }
      trackColor={theme.black20}
    />
  );
}
