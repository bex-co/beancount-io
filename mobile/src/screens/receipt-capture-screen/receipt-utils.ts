import { formatLedgerDate } from "../../common/date-format";
import { getFormatDate } from "../../common/format-util";
import { formatMoneyWithCurrency } from "../../common/number-utils";
import { graphQLErrorCodes } from "../../common/graphql-error-codes";

/**
 * Resolve the receipt's transaction date. The server may return an empty or
 * absent date when it can't read one off the receipt, and a value that is not
 * a real `YYYY-MM-DD` day would open the form on an Invalid Date (w21/285):
 * fall back to the client's today so the form always opens with a usable date.
 */
export const receiptDate = (date: string | null | undefined): string =>
  isIsoDay(date) ? date : getFormatDate(new Date());

const isIsoDay = (date: string | null | undefined): date is string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? "");
  if (!match) return false;
  const [year, month, day] = [match[1]!, match[2]!, match[3]!].map(Number) as [
    number,
    number,
    number,
  ];
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
};

/**
 * The parsed receipt total as the form's amount text: positive (receipts are
 * expenses, however the model signed them) and at the precision the parser
 * returned. A fractional total keeps at least two places ("42.5" is "42.50"),
 * and a whole one keeps none: the form pads it to the ledger currency's own
 * minor unit, so a 1500 total saves "1500 JPY" where an always-padded "1500.00"
 * saved "1500.00 JPY" (w21/389). `toFixed(2)` cut a KWD 12.345 to "12.35" and
 * binary-rounded 1.005 to "1.00" (w21/069).
 */
export const receiptAmountText = (amount: number): string => {
  const text = String(Math.abs(amount));
  // Exponent forms (1e-7, 1e21) are not realistic totals; keep them parseable.
  if (/e/i.test(text)) return Math.abs(amount).toFixed(2);
  const [whole, fraction] = text.split(".");
  return fraction === undefined ? whole : `${whole}.${fraction.padEnd(2, "0")}`;
};

/**
 * Map an internal error code to a translation key.
 *
 * Only covers the capture → upload → parse leg; saving happens later on the
 * transaction form, which reports its own errors.
 */
export const receiptErrorKey = (
  code: string,
):
  | "receiptQuotaExhausted"
  | "receiptNotAvailable"
  | "receiptParseFailed"
  | "receiptUploadFailed" => {
  if (code === "quota_exhausted") return "receiptQuotaExhausted";
  if (code === "not_available") return "receiptNotAvailable";
  if (code === "parse_failed") return "receiptParseFailed";
  return "receiptUploadFailed";
};

/**
 * Whether trying the same photo again can help. A spent AI quota stays spent;
 * a dropped connection or an unreadable parse does not (w21/204).
 */
export const receiptCanRetry = (code: string): boolean =>
  code !== "quota_exhausted" && code !== "not_available";

/**
 * Whether the server refused for good: it is not set up for receipts (no
 * storage or model keys on a self-hosted install), or this account may not use
 * it. A refused photo (BAD_USER_INPUT) is not here: another photo can work. Trying the same photo again uploads it again and fails the same way
 * (w21/869).
 */
export const isPermanentReceiptRefusal = (err: unknown): boolean =>
  graphQLErrorCodes(err).some((code) =>
    ["CONFIGURATION_ERROR", "FORBIDDEN"].includes(code),
  );

/**
 * Classify a failure thrown by the parse-leg mutation into an internal code.
 *
 * Under Apollo's default errorPolicy a GraphQL error rejects the promise
 * rather than populating `result.errors`, so the leg is classified here from
 * the thrown `ApolloError`'s `graphQLErrors[].extensions.code`. The backend
 * raises `RESOURCE_LIMIT_REACHED` when the AI quota is spent (ADR 0011);
 * everything else on this leg is a parse failure. A network error carries no
 * GraphQL codes and falls through to `parse_failed` — the upload already
 * succeeded, so it is not an upload failure.
 */
export const parseErrorCode = (
  err: unknown,
): "quota_exhausted" | "not_available" | "parse_failed" => {
  const codes = graphQLErrorCodes(err);
  if (codes.includes("RESOURCE_LIMIT_REACHED")) return "quota_exhausted";
  if (isPermanentReceiptRefusal(err)) return "not_available";
  return "parse_failed";
};

/** Derive file extension from a MIME type, falling back to jpg. */
export const mimeToExt = (mimeType: string): string =>
  mimeType.split("/")[1] ?? "jpg";

/** The shape of `launchImageLibraryAsync`'s result this screen depends on. */
export type LibraryPickResult = {
  canceled: boolean;
  assets?:
    | ({
        uri: string;
        mimeType?: string | null;
        fileName?: string | null;
        fileSize?: number | null;
        width?: number | null;
        height?: number | null;
      } | null)[]
    | null;
};

/** What a picked receipt hands to the preview (mirrors `CapturedShot`). */
export type PickedShot = {
  uri: string;
  mimeType: string;
  filename: string;
  /** What the picker or camera reported, when it did. */
  fileSize?: number;
  width?: number;
  height?: number;
};

/**
 * The most a receipt image may be: the model that reads it takes 5 MB and 8000
 * pixels a side, and a larger one failed every parse as "Could not read
 * receipt", with a Try Again that could not help (w21/955). The dashboard caps
 * uploads at the same 5 MB.
 */
const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const RECEIPT_MAX_SIDE = 8000;

/** Whether a shot reports a size or a side past what can be read. */
export const receiptTooLarge = (
  shot: Pick<PickedShot, "fileSize" | "width" | "height">,
): boolean =>
  (shot.fileSize ?? 0) > RECEIPT_MAX_BYTES ||
  (shot.width ?? 0) > RECEIPT_MAX_SIDE ||
  (shot.height ?? 0) > RECEIPT_MAX_SIDE;

const sizeField = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;

/**
 * Normalize one library pick into a shot, or `null` when there is nothing to
 * use (the user cancelled, or the picker returned no asset).
 *
 * Pure so the library-pick path can be unit-tested without a picker: the screen
 * passes whatever `ImagePicker.launchImageLibraryAsync` resolved to straight in.
 */
export const shotFromLibraryResult = (
  result: LibraryPickResult | null | undefined,
): PickedShot | null => {
  const asset = result && !result.canceled ? result.assets?.[0] : null;
  if (!asset?.uri) {
    return null;
  }
  const reported = asset.mimeType ?? "image/jpeg";
  // The file the picker returned says what it is: on Android it re-encodes a
  // HEIC photo into a `.jpeg` cache file yet still reports `image/heic` and
  // the `.heic` name, which the server then refuses (w21/282). Fall back to
  // the reported type only when the extension says nothing.
  const fileType = typeOfExtension(extensionOf(asset.uri));
  const mimeType = fileType ?? reported;
  const nameType = asset.fileName
    ? typeOfExtension(extensionOf(asset.fileName))
    : null;
  const filename =
    asset.fileName && (fileType === null || nameType === fileType)
      ? asset.fileName
      : `${stem(asset.fileName)}.${fileType ? extensionOf(asset.uri) : mimeToExt(mimeType)}`;
  const fileSize = sizeField(asset.fileSize);
  const width = sizeField(asset.width);
  const height = sizeField(asset.height);
  return {
    uri: asset.uri,
    mimeType,
    filename,
    ...(fileSize !== undefined ? { fileSize } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };
};

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** The lower-cased extension of a path or URI, without query or fragment. */
const extensionOf = (path: string): string => {
  const name = path.split(/[?#]/u)[0]!.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
};

const typeOfExtension = (extension: string): string | null =>
  EXTENSION_TYPES[extension] ?? null;

/** A file name without its extension, or `receipt` when there is none. */
const stem = (fileName: string | null | undefined): string => {
  const dot = fileName ? fileName.lastIndexOf(".") : -1;
  const base = fileName && dot > 0 ? fileName.slice(0, dot) : (fileName ?? "");
  return base || "receipt";
};

/**
 * What the "Receipt read" reveal shows and speaks: the date as the reader's
 * language writes it and the total as money in the ledger's currency. The raw
 * "2026-03-01" was read by VoiceOver as digits and "1234.50" had no grouping or
 * currency (w21/538). The form still gets the plain values (`receiptAmountText`).
 */
export const receiptRevealFields = (
  receipt: { payee: string; amount: number; date: string },
  currency: string,
  locale: string,
): { payee: string; amount: string; date: string } => ({
  payee: receipt.payee,
  // At the digits the form is given, so the reveal and the saved amount agree:
  // rounded to the currency's minor unit, 12.5 on a yen ledger read "¥13" and
  // 4.995 read "$5.00" over a form holding the exact value (w21/870).
  amount: formatMoneyWithCurrency(
    Math.abs(receipt.amount),
    currency,
    receiptAmountText(receipt.amount).split(".")[1]?.length ?? 0,
  ),
  date: formatLedgerDate(receipt.date, locale),
});

/**
 * Whether the camera screen is still waiting on the system camera prompt: not
 * granted, the app may still ask, and the one automatic request has not come
 * back. An undetermined permission is `granted: false`, so the first visit drew
 * "Camera access is needed… Enable it in Settings" behind the prompt, where
 * VoiceOver could land once it closed (w21/637). The plain letterbox shows
 * instead; a refusal on record (`canAskAgain: false`) shows the denied copy at
 * once.
 */
export const cameraPromptPending = (
  permission: { granted: boolean; canAskAgain: boolean },
  prompted: boolean,
): boolean => !permission.granted && permission.canAskAgain && !prompted;
