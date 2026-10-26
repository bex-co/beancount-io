import { BadUserInputError } from "@/shared/errors";

/**
 * The one query-param spelling rule every surface applies (w23/m10/t002):
 * the account-journal params are `filter_account`/`with_children` on the
 * MCP resource and REST query but `filterAccount`/`with_children` on
 * GraphQL, so a pasted param died in strict validation. Both spellings
 * are accepted; two different values are refused rather than guessed.
 * Both missing means missing — each layer's default applies.
 *
 * `FILTER_ACCOUNT_NAMES` are positional labels: the `filter_account`
 * value always goes in `primary`, the `filterAccount` value in `legacy`,
 * on every surface. Neither wins — a split pair throws.
 */
const FILTER_ACCOUNT_NAMES = {
  primary: "filter_account",
  legacy: "filterAccount",
} as const;

export function resolveFilterAccount(values: {
  primary?: string | null;
  legacy?: string | null;
}): string | undefined {
  return resolvePair(values, FILTER_ACCOUNT_NAMES, "accounts");
}

function resolvePair<T>(
  values: { primary?: T | null; legacy?: T | null },
  names: { primary: string; legacy: string },
  what: string,
): T | undefined {
  // GraphQL nullable args arrive as explicit null when set to null; that
  // means missing, same as REST's nullToUndefined normalization.
  const primary = values.primary ?? undefined;
  const legacy = values.legacy ?? undefined;
  if (primary !== undefined && legacy !== undefined && primary !== legacy) {
    throw new BadUserInputError(
      `Pass ${names.primary} or ${names.legacy}, not two different ${what}.`,
    );
  }
  return primary ?? legacy;
}
