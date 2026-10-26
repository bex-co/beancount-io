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
 * wins — a split pair throws.
 */
export const DRY_RUN_NAMES = { primary: "dry_run", legacy: "dryRun" } as const;

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
