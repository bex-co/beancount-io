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
      "Pass entryHash or entry_hash (as list output spells it), not two different hashes.",
    );
  }
  const resolved = entryHash ?? entryHashSnake;
  if (resolved === undefined) {
    throw new BadUserInputError(
      "entryHash is required (entry_hash, as list output spells it, also works).",
    );
  }
  return resolved;
}

/**
 * An entry ID as the ledger service issues it: 32 lowercase hex digits, plus
 * `:<k>` for the k-th byte-identical duplicate (`entryIdFor` in the ledger
 * service). `:` survives the encoded path segment, so the suffix is safe.
 */
const ENTRY_HASH_PATTERN = /^[0-9a-f]{32}(?::[1-9][0-9]*)?$/;

/**
 * The hash travels to the ledger service as one URL segment, so anything but
 * the hash shape is refused as `BAD_USER_INPUT` before that call, rather than
 * looked up.
 */
export function assertEntryHashFormat(entryHash: string): void {
  if (typeof entryHash !== "string" || !ENTRY_HASH_PATTERN.test(entryHash)) {
    throw new BadUserInputError(
      "entryHash must be an entry_hash from list output: 32 lowercase hex digits, with a :<n> suffix on a repeated entry",
      "entryHash",
    );
  }
}

/**
 * A source-slice checksum as the ledger service issues it (`sliceSha256`):
 * 64 lowercase hexadecimal digits.
 */
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Every entry-source write carries an optimistic-lock `sha256sum`. Refuse
 * anything that is not a 64-character lowercase hex SHA-256 digest upfront as
 * `BAD_USER_INPUT` instead of loading the full ledger and answering `CONFLICT`.
 */
export function assertSha256Format(sha256sum: string): void {
  if (typeof sha256sum !== "string" || !SHA256_HEX_PATTERN.test(sha256sum)) {
    throw new BadUserInputError(
      "sha256sum must be a 64-character lowercase hex SHA-256 digest from getEntryContext or listLedgerEntries(include_source: true)",
      "sha256sum",
    );
  }
}
