import { useMemo, useState } from "react";
import type { EChartsOption, LegendComponentOption } from "echarts";

/** Which units a chart's legend shows, by unit name. */
export type LegendSelection = Record<string, boolean>;

/**
 * The legend selection for these units: the reader's choice where it names
 * them, else the primary unit (or the first, without it) alone (w4/m51).
 *
 * - A unit the choice names keeps it; one it does not (newly present) starts
 *   hidden.
 * - A choice naming none of these units is from another context, and so is a
 *   choice whose visible units are all absent here (a conversion that leaves
 *   only USD): both get the default.
 * - A deliberate all-off choice stays all off.
 */
export function legendSelectionFor(
  units: string[],
  primary: string,
  chosen?: LegendSelection,
): LegendSelection {
  const fallback = Object.fromEntries(
    units.map((unit) => [unit, unit === primary]),
  );
  if (!units.includes(primary) && units.length > 0) fallback[units[0]] = true;
  if (!chosen || !units.some((unit) => unit in chosen)) return fallback;

  const selected = Object.fromEntries(
    units.map((unit) => [unit, chosen[unit] ?? false]),
  );
  const choseVisible = Object.values(chosen).some(Boolean);
  if (choseVisible && !units.some((unit) => selected[unit])) return fallback;
  return selected;
}

/** A chart's legend choice when an owner outlives the chart (w4/m51). */
export interface LegendSelectionProps {
  /**
   * The units the reader chose in the legend, held by a caller that outlives
   * this chart (a report whose pending read unmounts it). Without one, the
   * chart keeps the choice itself across its own data updates.
   */
  legendSelection?: LegendSelection;
  onLegendSelectionChange?: (selected: LegendSelection) => void;
}

/**
 * `chartOption` with the reader's legend choice over `units`, and the handler
 * that records a new one. The choice survives a regrouped period or other data
 * update; ECharts would otherwise take the new option's defaults. A click is
 * already on screen, so it is stored without a new option: only new data (a
 * new `chartOption`), or a remount, folds the choice in (w4/m51).
 *
 * `chartOption` must be memoized on the chart's inputs: one rebuilt on every
 * render (from an unstable `t`, say) refolds the choice forever (w4/1024).
 */
export function useLegendSelection(
  chartOption: EChartsOption,
  units: string[],
  primary: string,
  { legendSelection, onLegendSelectionChange }: LegendSelectionProps,
): {
  chartOption: EChartsOption;
  onLegendSelectChanged: (selected: LegendSelection) => void;
} {
  const [ownSelection, setOwnSelection] = useState<LegendSelection>();
  const chosen = onLegendSelectionChange ? legendSelection : ownSelection;
  const [applied, setApplied] = useState({ chartOption, units, chosen });
  if (applied.chartOption !== chartOption) {
    setApplied({ chartOption, units, chosen });
  }
  const selectedOption = useMemo((): EChartsOption => {
    if (applied.units.length === 0) return applied.chartOption;
    return {
      ...applied.chartOption,
      legend: {
        ...(applied.chartOption.legend as LegendComponentOption),
        selected: legendSelectionFor(applied.units, primary, applied.chosen),
      },
    };
  }, [applied, primary]);
  return {
    chartOption: selectedOption,
    onLegendSelectChanged: onLegendSelectionChange ?? setOwnSelection,
  };
}
