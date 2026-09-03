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
