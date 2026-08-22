/** Fetch an asset (data: URI or remote/presigned URL) and return its base64 content. */
export async function fetchAssetAsBase64(url: string): Promise<string> {
  if (url.startsWith("data:")) return url.slice(url.indexOf(",") + 1);
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`asset download failed with status ${res.status}`);
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}
