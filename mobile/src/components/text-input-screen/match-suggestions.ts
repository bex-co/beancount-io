import { foldArabicScript } from "../../common/arabic-script-fold";
import { foldQuotes } from "../../common/merchant-key";

/**
 * A suggestion in the form text is compared in: NFC, lower-cased, runs of whitespace as one space, with the dot
 * a lower-cased Turkish "İ" leaves behind (`i` + U+0307) taken off. Plain
 * `toLowerCase().includes()` found nothing for "iş" in "İşBank ATM" and nothing
 * for a composed "café" in a ledger that stores "Cafe" + U+0301 (w21/257).
 */
function fold(text: string): string {
  return foldArabicScript(foldQuotes(text).normalize("NFC"))
    .toLowerCase()
    .replace(/i\u0307/gu, "i")
    .replace(/\s+/gu, " ");
}

/**
 * The suggestions to offer for what is typed: trimmed, the empty ones dropped,
 * those that contain the query (an empty query keeps all), at most `max`. The
 * NFC and NFD spellings, or spacings, of one payee are one row, shown as the ledger first
 * spelled it.
 */
export function matchSuggestions(
  suggestions: readonly string[] | undefined,
  typed: string,
  max: number,
): string[] {
  if (!suggestions?.length) return [];
  const query = fold(typed.trim());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const suggestion of suggestions) {
    const item = suggestion.trim();
    if (!item) continue;
    const key = foldArabicScript(foldQuotes(item.normalize("NFC"))).replace(
      /\s+/gu,
      " ",
    );
    if (seen.has(key)) continue;
    seen.add(key);
    if (!query || fold(item).includes(query)) {
      out.push(item);
      if (out.length >= max) break;
    }
  }
  return out;
}
