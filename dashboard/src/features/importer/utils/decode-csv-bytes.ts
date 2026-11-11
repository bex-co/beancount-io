/**
 * Lossless text decoding for uploaded CSV bytes.
 */

/**
 * A CSV with nothing in it — an export that failed or was cut short. Its
 * columns cannot be read, and AI parsing would spend tokens on an empty file
 * (w2/128): the reader exports it again.
 */
export class CsvEmptyError extends Error {
  constructor() {
    super("CSV file is empty");
    this.name = "CsvEmptyError";
  }
}

/** The CSV's bytes are not text under the supported encodings. */
export class CsvEncodingError extends Error {
  constructor() {
    super("CSV is not UTF-8 or BOM-marked UTF-16 text");
    this.name = "CsvEncodingError";
  }
}

/**
 * Decode CSV bytes as UTF-8, or as UTF-16 when a UTF-16 byte-order mark says
 * so — the same choices `FileReader.readAsText` makes — but fatally, so bytes
 * in another encoding (a CP1252 "Café") throw instead of silently becoming
 * U+FFFD (w4/278). A literal U+FFFD in valid UTF-8 is kept.
 */
export function decodeCsvBytes(bytes: Uint8Array): string {
  const encoding =
    bytes[0] === 0xff && bytes[1] === 0xfe
      ? "utf-16le"
      : bytes[0] === 0xfe && bytes[1] === 0xff
        ? "utf-16be"
        : "utf-8";
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch {
    throw new CsvEncodingError();
  }
}
