import { BadUserInputError } from "@/shared/errors";

/**
 * The one boolean-flag spelling rule every surface applies (w23/m9/t002):
 * the preview flag is `dry_run` on MCP and REST bank queries but `dryRun`
 * on REST bodies and GraphQL, so a pasted flag died in strict validation.
 * Both spellings are accepted; one true and the other false is refused
 * rather than guessed. Both missing means false.
 *
 * `DRY_RUN_NAMES` are positional labels: the `dry_run` value always goes
 * in `primary`, the `dryRun` value in `legacy`, on every surface. Neither
 * wins — a split pair throws. The same rule covers the
 * commit-despite-errors flag (w23/m9/t003), uniform `allowInvalid` with a
 * novel `allow_invalid` twin.
 */
export const DRY_RUN_NAMES = { primary: "dry_run", legacy: "dryRun" } as const;

/** The commit-despite-errors twin, same positional convention. */
export const ALLOW_INVALID_NAMES = {
  primary: "allow_invalid",
  legacy: "allowInvalid",
} as const;

export function resolveFlagAlias(
  values: { primary?: boolean | null; legacy?: boolean | null },
  names: { primary: string; legacy: string },
): boolean {
  // GraphQL nullable args arrive as explicit null when set to null; that
  // means missing, same as REST's nullToUndefined normalization.
  const primary = values.primary ?? undefined;
  const legacy = values.legacy ?? undefined;
  if (primary !== undefined && legacy !== undefined && primary !== legacy) {
    throw new BadUserInputError(
      `Pass ${names.primary} or ${names.legacy}, not one true and the other false.`,
    );
  }
  return primary ?? legacy ?? false;
}

/**
 * The workflow's preview input from one parsed body: the twins fold into a
 * single `dryRun`, the alias key dropped (w23/m13/t007). REST and MCP
 * handlers pass their whole body; both spellings keep working alike.
 */
export function previewFlagInput(body: {
  dry_run?: boolean | null;
  dryRun?: boolean | null;
}): { dryRun: boolean } {
  return {
    dryRun: resolveFlagAlias(
      { primary: body.dry_run, legacy: body.dryRun },
      DRY_RUN_NAMES,
    ),
  };
}

/**
 * Fold the `dry_run` alias into `dryRun` (w23/m9/t002), dropping the alias
 * key so the workflow sees its own contract only.
 */
export function withResolvedPreview<
  T extends { dryRun?: boolean | null; dry_run?: boolean | null },
>(input: T): Omit<T, "dry_run"> & { dryRun: boolean } {
  const { dry_run, ...rest } = input;
  return {
    ...rest,
    // The workflow reads `dryRun === true`, so false and missing agree;
    // the resolver also reads explicit null as missing.
    dryRun: resolveFlagAlias(
      { primary: dry_run, legacy: rest.dryRun },
      DRY_RUN_NAMES,
    ),
  };
}
