export type FileCategory = "text" | "image" | "file";

const TEXT_FORMATS = new Set(["csv", "ofx", "qfx", "txt", "json", "xml"]);
const IMAGE_FORMATS = new Set(["jpg", "jpeg", "png", "gif", "webp", "image"]);

const MEDIA_TYPE_MAP: Record<string, string> = {
  csv: "text/csv",
  pdf: "application/pdf",
  ofx: "application/x-ofx",
  qfx: "application/x-ofx",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  json: "application/json",
  xml: "application/xml",
  txt: "text/plain",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  image: "image/*",
};

export function classifyFile(format: string, mediaType?: string): FileCategory {
  const mt =
    mediaType && mediaType !== "application/octet-stream"
      ? mediaType.toLowerCase()
      : null;
  const fmt = format.toLowerCase();

  if (mt) {
    if (mt.startsWith("image/")) return "image";
    if (
      mt.startsWith("text/") ||
      mt === "application/json" ||
      mt === "application/xml" ||
      mt === "application/x-ofx"
    )
      return "text";
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
