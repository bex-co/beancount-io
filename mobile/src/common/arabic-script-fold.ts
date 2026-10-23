/**
 * Arabic-script text as one spelling, the mobile counterpart of the ledger
 * service's search fold (w21/785). The iOS Persian keyboard types ی and ک where
 * Arabic keyboards and many bank exports write ي and ك, so "کافی" never found
 * "كافي شاپ" in a payee suggestion, a merchant or an account (w21/835, w21/836).
 *
 * Import-free so the unit runner can load it.
 */

/** Arabic letters a Persian keyboard types another way, and alef with hamza or madda. */
const LETTER_FOLDS: Readonly<Record<string, string>> = {
  ي: "ی", // yeh → Farsi yeh
  ى: "ی", // alef maksura → Farsi yeh
  ك: "ک", // kaf → keheh
  ة: "ه", // teh marbuta → heh
  أ: "ا", // alef with hamza above → alef
  إ: "ا", // alef with hamza below → alef
  آ: "ا", // alef with madda → alef
};
const FOLDED_LETTER = /[يىكةأإآ]/gu;
/** Harakat, the superscript alef and the tatweel: written or not, one word. */
const MARK = /[ً-ٰٟـ]/gu;
const DIGIT = /[٠-٩۰-۹]/gu;
const ARABIC_OR_ZWNJ = /[؀-ۿ‌]/u;

/**
 * The folds that keep every character's place (letters, digits, the zero-width
 * non-joiner as a space), for matching that reports positions.
 */
export function foldArabicLetters(text: string): string {
  if (!ARABIC_OR_ZWNJ.test(text)) return text;
  return text
    .replace(FOLDED_LETTER, (letter) => LETTER_FOLDS[letter]!)
    .replace(DIGIT, (digit) =>
      String(digit.charCodeAt(0) - (digit >= "۰" ? 0x06f0 : 0x0660)),
    )
    .replace(/‌/gu, " ");
}

/** The same, with the marks dropped: for comparing whole names. */
export function foldArabicScript(text: string): string {
  if (!ARABIC_OR_ZWNJ.test(text)) return text;
  return foldArabicLetters(text.replace(MARK, ""));
}
