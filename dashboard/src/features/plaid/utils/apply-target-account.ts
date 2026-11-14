/**
 * How "Set for selected" treats a row that already has a target account:
 * `fill-blank` leaves it alone (an AI Fill suggestion or a hand-picked account
 * is never destroyed), `overwrite` replaces it.
 */
export type TargetApplyMode = "fill-blank" | "overwrite";

interface ApplyTargetResult {
  /** A new map; the one passed in is never mutated. */
  targets: Map<string, string>;
  /** Selected rows whose target is now the chosen account because of this call. */
  applied: number;
}

const hasTarget = (targets: ReadonlyMap<string, string>, id: string) =>
  (targets.get(id) ?? "") !== "";

/**
 * Gives every selected row the same target account. It takes row ids rather
 * than the filtered list on purpose: Submit acts on every selected row, visible
 * or not, so a row a filter hides is set too.
 *
 * An empty account changes nothing, so it can never be used to clear targets.
 * A row already holding the chosen account is not counted as applied.
 */
export function applyTargetAccount(
  selectedIds: ReadonlySet<string>,
  targets: ReadonlyMap<string, string>,
  account: string,
  mode: TargetApplyMode,
): ApplyTargetResult {
  const next = new Map(targets);
  if (account.trim() === "") return { targets: next, applied: 0 };

  let applied = 0;
  for (const id of selectedIds) {
    if (mode === "fill-blank" && hasTarget(targets, id)) continue;
    if (targets.get(id) === account) continue;
    next.set(id, account);
    applied += 1;
  }
  return { targets: next, applied };
}

/**
 * How many selected rows already have a target, so the panel can say how many
 * an overwrite would replace before an account is even chosen.
 */
export function countSelectedWithTarget(
  selectedIds: ReadonlySet<string>,
  targets: ReadonlyMap<string, string>,
): number {
  let count = 0;
  for (const id of selectedIds) {
    if (hasTarget(targets, id)) count += 1;
  }
  return count;
}
