import { BadUserInputError } from "@/shared/errors";

export const S3_PREFIX_TMP = "tmp";

/**
 * Temporary objects are bound to their uploader by their trusted key shape.
 * The owner segment is never accepted from a request independently of the key.
 */
export function isTempAssetOwnedBy(
  objectKey: string,
  ownerId: string,
): boolean {
  const expected = `${S3_PREFIX_TMP}/${ownerId}/`;
  return objectKey.startsWith(expected) && objectKey.length > expected.length;
}

/**
 * A blank key is a malformed request, not an authorization question.
 *
 * Passed on, it fails the ownership check above and comes back as FORBIDDEN
 * with advice about ledger permissions — for a caller whose only mistake was
 * sending an empty string (w5/054). Services call this before authorizing, so
 * the refusal names the argument instead.
 */
export function assertTempAssetKey(objectKey: string, field: string): void {
  if (typeof objectKey !== "string" || objectKey.trim() === "") {
    throw new BadUserInputError(
      `${field} must not be empty`,
      field,
      `Pass the object key of an upload you made: it starts with \`${S3_PREFIX_TMP}/\` and is returned when the upload URL is created.`,
    );
  }
}
