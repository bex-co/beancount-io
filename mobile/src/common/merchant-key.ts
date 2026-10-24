import { foldArabicScript } from "./arabic-script-fold";
import { foldWidth } from "./width-fold";
import { withoutInvisibleMarks } from "./clean-free-text";

/**
 * One merchant however its payee is spelled: trimmed, composed (NFC), with each
 * run of whitespace one space ("Whole  Foods" from a bank import is "Whole
 * Foods", w21/460), and case-folded, the same grouping the Merchants directory merges spellings by
 * (w21/046). A decomposed "Café" ("e" and a combining accent) and a composed
 * one look identical and are two strings, so they were two merchants with half
 * the history each (w21/410).
 * Recurrence and manual marks keyed by the displayed spelling saw only part
 * of a merchant's history, and a mark was lost when the display flipped
 * (w21/169). Arabic and Persian spellings of one letter are one (w21/835). The dotted capital İ lowercases to i + U+0307, folded to i so a
 * typed "iş" finds "İşBank" (w21/569). Curly quotes read as straight ones (w21/519). Full-width Latin and half-width katakana read as the ordinary forms (w21/917). Import-free so the unit runner can load it.
 */
export function merchantKey(payee: string): string {
  return foldArabicScript(
    foldQuotes(foldWidth(withoutInvisibleMarks(payee)).trim().normalize("NFC")),
  )
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/i\u0307/gu, "i");
}

/**
 * Curly quotes as the straight ones. iOS Smart Punctuation turns a typed ' into
 * ’ even in a field with autocorrect off, so "Trader Joe’s" and "Trader Joe's"
 * were two payees to every lookup that compared them literally (w21/519).
 */
export function foldQuotes(text: string): string {
  return text
    .replace(/[\u2018\u2019\u02bc]/gu, "'")
    .replace(/[\u201c\u201d]/gu, '"');
}

/** Every spelling's series merged under its merchant key, by date. */
export function seriesByMerchant<T extends { date: string }>(
  seriesByPayee: ReadonlyMap<string, readonly T[]>,
): Map<string, T[]> {
  const merged = new Map<string, T[]>();
  for (const [payee, series] of seriesByPayee) {
    const key = merchantKey(payee);
    merged.set(key, [...(merged.get(key) ?? []), ...series]);
  }
  for (const series of merged.values()) {
    series.sort((a, b) => a.date.localeCompare(b.date));
  }
  return merged;
}
