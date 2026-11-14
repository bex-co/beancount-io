/**
 * How "Set for selected" treats a row that already has a target account:
 * `fill-blank` leaves it alone (an AI Fill suggestion or a hand-picked account
 * is never destroyed), `overwrite` replaces it.
 */
export type TargetApplyMode = "fill-blank" | "overwrite";

export interface ApplyTargetResult {
  /** A new map; the one passed in is never mutated. */
  targets: Map<string, string>;
  /** Selected rows whose target is now the chosen account because of this call. */
  applied: number;
  /** Selected rows left as they were. */
  kept: number;
}

const hasTarget = (targets: ReadonlyMap<string, string>, id: string) =>
  (targets.get(id) ?? "") !== "";

/**
 * Gives every selected row the same target account. It takes row ids rather
 * than the filtered list on purpose: Submit acts on every selected row, visible
 * or not, so a row a filter hides is set too.
 *
 * An empty account changes nothing, so it can never be used to clear targets.
 * A row already holding the chosen account counts as kept, not applied.
 */
export function applyTargetAccount(
  selectedIds: ReadonlySet<string>,
  targets: ReadonlyMap<string, string>,
  account: string,
  mode: TargetApplyMode,
): ApplyTargetResult {
  const next = new Map(targets);
  if (account.trim() === "") {
    return { targets: next, applied: 0, kept: selectedIds.size };
  }

  let applied = 0;
  let kept = 0;
  for (const id of selectedIds) {
    const keepsExisting = mode === "fill-blank" && hasTarget(targets, id);
    if (keepsExisting || targets.get(id) === account) {
      kept += 1;
      continue;
    }
    next.set(id, account);
    applied += 1;
  }
  return { targets: next, applied, kept };
}

/**
 * Splits the selection by whether a row already has a target, so the panel can
 * say how many rows each mode would touch before an account is even chosen.
 */
export function countSelectedTargets(
  selectedIds: ReadonlySet<string>,
  targets: ReadonlyMap<string, string>,
): { blank: number; filled: number } {
  let filled = 0;
  for (const id of selectedIds) {
    if (hasTarget(targets, id)) filled += 1;
  }
  return { blank: selectedIds.size - filled, filled };
}
