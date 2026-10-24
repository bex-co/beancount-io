import { foldArabicScript } from "../../common/arabic-script-fold";
import { foldQuotes } from "../../common/merchant-key";
import { cleanFreeText } from "../../common/clean-free-text";
import { foldForSearch as fold } from "../../common/search-fold";

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
  const query = fold(cleanFreeText(typed));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const suggestion of suggestions) {
    const item = cleanFreeText(suggestion);
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
