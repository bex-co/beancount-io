/**
 * Fetch an asset (data: URI or remote/presigned URL) and return its base64
 * content. `missing` is what a 404 throws, so the caller says what was absent
 * instead of an unexpected download failure (w1/190).
 */
export async function fetchAssetAsBase64(
  url: string,
  missing?: () => Error,
): Promise<string> {
  if (url.startsWith("data:")) return url.slice(url.indexOf(",") + 1);
  const res = await fetch(url);
  if (res.status === 404 && missing) throw missing();
  if (!res.ok)
    throw new Error(`asset download failed with status ${res.status}`);
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}
