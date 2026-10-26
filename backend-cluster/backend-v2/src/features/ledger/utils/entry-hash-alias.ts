import { BadUserInputError } from "@/shared/errors";

/**
 * The one entry-hash spelling rule every surface applies (w23/m3/t001):
 * list output says `entry_hash` (snake, the ledger wire's own spelling) while
 * the entry tools historically took `entryHash` (camel), so a pasted hash
 * died in strict validation. Both spellings are accepted; two different
 * hashes are refused rather than guessed.
 */
export function resolveEntryHash(input: {
  entryHash?: string;
  entry_hash?: string;
}): string {
  const { entryHash, entry_hash: entryHashSnake } = input;
  if (
    entryHash !== undefined &&
    entryHashSnake !== undefined &&
    entryHash !== entryHashSnake
  ) {
    throw new BadUserInputError(
      "Pass entryHash or entry_hash (the entry_hash list output returns), not two different hashes.",
    );
  }
  const resolved = entryHash ?? entryHashSnake;
  if (resolved === undefined) {
    throw new BadUserInputError(
      "entryHash is required — the entry_hash list output returns works too.",
    );
  }
  return resolved;
}
