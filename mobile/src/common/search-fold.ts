import { foldArabicScript } from "./arabic-script-fold";
import { withoutInvisibleMarks } from "./clean-free-text";
import { foldQuotes } from "./merchant-key";
import { foldWidth } from "./width-fold";

/**
 * Text as it is compared in a search: NFC, lower-cased, curly quotes as
 * straight, full-width Latin and half-width katakana as ordinary, invisible
 * marks gone, one Arabic-script spelling, runs of whitespace as one space, and
 * the dot a lower-cased Turkish "İ" leaves (`i` + U+0307) taken off. One fold
 * for every free-text search in the app, so the same words find the same thing
 * (w21/257, w21/519, w21/569, w21/785, w21/912, w21/965, w21/966).
 *
 * Import-light so the unit runner can load it.
 */
export function foldForSearch(text: string): string {
  return foldArabicScript(
    foldQuotes(foldWidth(withoutInvisibleMarks(text))).normalize("NFC"),
  )
    .toLowerCase()
    .replace(/i̇/gu, "i")
    .replace(/\s+/gu, " ");
}
