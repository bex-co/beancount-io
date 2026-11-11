import { parseDecimalNumber } from "./decimal-number";

/** What an amount field's text means for the ledger. */
export type TypedAmount =
  | { kind: "empty" }
  | { kind: "decimal"; decimal: string }
  /** `4,500` in a comma-decimal language: a thousands group, or a decimal. */
  | { kind: "ambiguous"; grouped: string; decimal: string }
  | { kind: "invalid" };

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Whether `language` writes its decimals with a comma (de, fr, es, …). */
export function isCommaDecimalLanguage(language: string): boolean {
  try {
    return (
      new Intl.NumberFormat(language)
        .formatToParts(1.5)
        .find((part) => part.type === "decimal")?.value === ","
    );
  } catch {
    return false;
  }
}

/** `1.234.567` without its group separators, or null when not grouped so. */
function ungroup(whole: string, separator: string): string | null {
  const [first = "", ...rest] = whole.split(separator);
  if (!/^\d{1,3}$/.test(first) || rest.some((group) => !/^\d{3}$/.test(group)))
    return null;
  return first + rest.join("");
}

/**
 * The ledger decimal an amount field's text denotes. A native number field
 * parsed it with the browser's language, so `4,50` in an English browser was
 * booked as 450, silently (w2/120). Here both separators are read the way
 * people write them: with both present the last one is the decimal; a single
 * one followed by other than three digits is the decimal (`4,50` cannot be a
 * thousands group); a single one followed by exactly three digits is read
 * in the dashboard's language — `4.500` and `4,500` are a decimal and a group
 * in English, and in a comma-decimal language either could be meant, so the
 * reader is asked. Persian and Arabic-Indic digits and separators count, a
 * space or apostrophe groups, and the ledger's own `1e3` form still works.
 */
export function parseTypedAmount(
  text: string,
  commaDecimal: boolean,
): TypedAmount {
  let value = text.trim();
  if (!value) return { kind: "empty" };
  value = value
    .replace(/[\u06f0-\u06f9]/g, (digit) =>
      String(PERSIAN_DIGITS.indexOf(digit)),
    )
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String(ARABIC_DIGITS.indexOf(digit)),
    )
    .replace(/\u066b/g, ".")
    .replace(/[\u066c\s\u00a0\u202f']/g, "")
    .replace(/^\u2212/, "-");
  const decimal = (candidate: string): TypedAmount => {
    const parsed = parseDecimalNumber(candidate);
    return parsed === null
      ? { kind: "invalid" }
      : { kind: "decimal", decimal: parsed };
  };
  if (/[eE]/.test(value)) return decimal(value);

  const match = /^([+-]?)([\d.,]+)$/.exec(value);
  if (!match) return { kind: "invalid" };
  const [, sign = "", body = ""] = match;
  const commas = body.split(",").length - 1;
  const dots = body.split(".").length - 1;

  if (commas > 0 && dots > 0) {
    const point = body.lastIndexOf(",") > body.lastIndexOf(".") ? "," : ".";
    const group = point === "," ? "." : ",";
    const at = body.lastIndexOf(point);
    const fraction = body.slice(at + 1);
    const whole = ungroup(body.slice(0, at), group);
    if (whole === null || !/^\d*$/.test(fraction)) return { kind: "invalid" };
    return decimal(`${sign}${whole}.${fraction}`);
  }
  if (commas + dots === 0) return decimal(sign + body);

  const separator = commas > 0 ? "," : ".";
  const parts = body.split(separator);
  if (parts.length > 2) {
    const whole = ungroup(body, separator);
    return whole === null ? { kind: "invalid" } : decimal(sign + whole);
  }
  const [whole = "", fraction = ""] = parts;
  const couldBeGroup = fraction.length === 3 && /^[1-9]\d{0,2}$/.test(whole);
  if (!couldBeGroup) return decimal(`${sign}${whole}.${fraction}`);
  const asGroup = decimal(sign + whole + fraction);
  const asDecimal = decimal(`${sign}${whole}.${fraction}`);
  if (commaDecimal) {
    return asGroup.kind === "decimal" && asDecimal.kind === "decimal"
      ? {
          kind: "ambiguous",
          grouped: asGroup.decimal,
          decimal: asDecimal.decimal,
        }
      : { kind: "invalid" };
  }
  return separator === "." ? asDecimal : asGroup;
}
