export type FileCategory = "text" | "image" | "file";

const TEXT_FORMATS = new Set([
  "csv",
  "ofx",
  "qfx",
  "qif",
  "txt",
  "text",
  "plaintext",
  "json",
  "xml",
]);
const TEXT_MEDIA_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/x-ofx",
  "application/vnd.intu.qfx",
  "application/qif",
  "application/x-qif",
]);
const IMAGE_FORMATS = new Set(["jpg", "jpeg", "png", "gif", "webp", "image"]);

const MEDIA_TYPE_MAP: Record<string, string> = {
  csv: "text/csv",
  pdf: "application/pdf",
  ofx: "application/x-ofx",
  qfx: "application/x-ofx",
  qif: "application/x-qif",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  json: "application/json",
  xml: "application/xml",
  txt: "text/plain",
  text: "text/plain",
  plaintext: "text/plain",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  image: "image/*",
};

export function classifyFile(format: string, mediaType?: string): FileCategory {
  const normalizedMediaType = mediaType?.split(";")[0].trim().toLowerCase();
  const mt =
    normalizedMediaType && normalizedMediaType !== "application/octet-stream"
      ? normalizedMediaType
      : null;
  const fmt = format.trim().toLowerCase();

  if (mt) {
    if (mt.startsWith("image/")) return "image";
    if (mt.startsWith("text/") || TEXT_MEDIA_TYPES.has(mt)) return "text";
    return "file";
  }

  if (IMAGE_FORMATS.has(fmt)) return "image";
  if (TEXT_FORMATS.has(fmt)) return "text";
  return "file";
}

export function resolveMediaType(format: string, mediaType?: string): string {
  if (mediaType && mediaType !== "application/octet-stream") return mediaType;
  return MEDIA_TYPE_MAP[format.toLowerCase()] ?? "application/octet-stream";
}

/** What an upload stores when its PUT declared no type, or a generic one. */
const GENERIC_STORED_TYPES = new Set([
  "binary/octet-stream",
  "application/octet-stream",
]);

/**
 * The type a parse reads for an uploaded object: the stored one, or the one
 * its key's extension names when the upload declared none. A PUT without a
 * `Content-Type` is stored as `binary/octet-stream`, so a JPEG uploaded as
 * the tool described it was refused as "not an image" (w1/231). The key
 * keeps the extension of the filename the upload URL was minted for.
 */
export function uploadedMediaType(
  contentType: string | undefined,
  objectKey: string,
): string | undefined {
  const declared = contentType?.split(";")[0]?.trim().toLowerCase();
  if (declared && !GENERIC_STORED_TYPES.has(declared)) return contentType;
  const extension = /\.([a-z0-9]+)$/iu.exec(objectKey)?.[1]?.toLowerCase();
  return extension && extension !== "image"
    ? MEDIA_TYPE_MAP[extension]
    : undefined;
}
