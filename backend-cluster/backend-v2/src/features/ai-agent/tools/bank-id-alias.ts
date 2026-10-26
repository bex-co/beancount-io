import { BadUserInputError } from "@/shared/errors";

/**
 * The one bank-id spelling rule every bank tool applies (w23/m8/t002):
 * the tools historically took snake_case (`item_id`) while REST and GraphQL
 * take camelCase (`itemId`), so a pasted id died in strict validation. Both
 * spellings are accepted; two different ids are refused rather than guessed.
 */
export function resolveBankIdAlias<T extends string | string[]>(
  values: { primary?: T; legacy?: T },
  names: { primary: string; legacy: string; what: string },
): T {
  const resolved = resolveOptionalBankIdAlias(values, names);
  if (resolved === undefined) {
    throw new BadUserInputError(
      `${names.primary} is required — ${names.legacy} works too.`,
    );
  }
  return resolved;
}

/**
 * The optional-argument twin of {@link resolveBankIdAlias}: both spellings
 * missing resolves to `undefined` instead of throwing, but two different
 * values still refuse rather than guess.
 */
export function resolveOptionalBankIdAlias<T extends string | string[]>(
  values: { primary?: T; legacy?: T },
  names: { primary: string; legacy: string; what: string },
): T | undefined {
  const { primary, legacy } = values;
  if (
    primary !== undefined &&
    legacy !== undefined &&
    !sameIds(primary, legacy)
  ) {
    throw new BadUserInputError(
      `Pass ${names.primary} or ${names.legacy}, not two different ${names.what}.`,
    );
  }
  return primary ?? legacy;
}

function sameIds(a: string | string[], b: string | string[]): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((id, index) => id === b[index])
    );
  }
  return a === b;
}
