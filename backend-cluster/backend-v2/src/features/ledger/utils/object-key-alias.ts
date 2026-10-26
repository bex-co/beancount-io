import { BadUserInputError } from "@/shared/errors";

/**
 * The one object-key spelling rule every surface applies (w23/m11/t002):
 * the same caller-owned `tmp/…` key is `objectKey` on the upload URL and
 * download reads, `s3ObjectKey` on the parse path, and `receiptObjectKey`
 * on the insert path, so a pasted key died in strict validation. Every
 * spelling is accepted at every key input; two different keys are refused
 * rather than guessed, and a missing key refuses as missing (m3 style —
 * these keys are required inputs today).
 */
export function resolveObjectKey(input: {
  objectKey?: string | null;
  s3ObjectKey?: string | null;
  receiptObjectKey?: string | null;
}): string {
  const entries = (
    [
      ["objectKey", input.objectKey],
      ["s3ObjectKey", input.s3ObjectKey],
      ["receiptObjectKey", input.receiptObjectKey],
    ] as const
  ).flatMap(([name, value]) =>
    value === undefined || value === null ? [] : [[name, value] as const],
  );
  if (entries.length === 0) {
    throw new BadUserInputError(
      "objectKey is required — s3ObjectKey and receiptObjectKey work too.",
    );
  }
  if (new Set(entries.map(([, value]) => value)).size > 1) {
    const names = entries.map(([name]) => name).join(" and ");
    throw new BadUserInputError(
      `Pass one object key, not ${names} with different values.`,
    );
  }
  const first = entries[0];
  if (first === undefined) {
    // Unreachable: the empty case threw above.
    throw new Error(
      "Provide one of objectKey, s3ObjectKey, receiptObjectKey.",
    );
  }
  return first[1];
}
