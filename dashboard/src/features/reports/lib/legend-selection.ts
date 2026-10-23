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
