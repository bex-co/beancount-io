/**
 * Extensions of files the editor cannot open: documents, images, media,
 * archives, office files, fonts, databases and binaries. Any other file is
 * text. A ledger may include a file of any name, `include "prices"` or
 * `prices.inc`, and a fixed list of text extensions left those dimmed and
 * unopenable (w21/771).
 */
const BINARY_EXTENSIONS = new Set(
  (
    "pdf png jpg jpeg gif webp heic heif bmp tif tiff ico psd ai sketch " +
    "mp3 mp4 m4a m4v mov wav aac flac ogg avi mkv webm " +
    "zip gz tgz bz2 xz 7z rar tar jar " +
    "xls xlsx xlsm doc docx ppt pptx odt ods odp pages numbers key " +
    "woff woff2 ttf otf eot " +
    "db sqlite sqlite3 parquet avro pkl pickle " +
    "exe dll so dylib bin class wasm o a ds_store"
  ).split(" "),
);

export function isBeancountFile(path: string): boolean {
  return /\.(bean|beancount)$/i.test(path);
}

export function isEditableTextFile(path: string): boolean {
  const filename = path.split("/").pop()?.toLowerCase() ?? "";
  if (filename === "") return false;
  const dot = filename.lastIndexOf(".");
  return !BINARY_EXTENSIONS.has(dot < 0 ? "" : filename.slice(dot + 1));
}
