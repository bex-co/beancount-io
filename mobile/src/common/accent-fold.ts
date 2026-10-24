/**
 * Latin letters with their accents taken off, one unit for one, for matching
 * account names: "cafe" finds `Expenses:Café`, "epargne" `Assets:Épargne`, and
 * "isbank" `İşBank` (w21/929). A character folds only when its canonical
 * decomposition is a base letter and combining marks, and the base takes the
 * character's length, so every index into the text stays where it was. Hangul
 * syllables, which also decompose, and anything without a base are left alone.
 *
 * Import-free so the unit runner can load it.
 */
const COMBINING_MARKS = /^[̀-ͯ]+$/u;

export function foldAccents(text: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7f]*$/.test(text)) return text;
  let folded = "";
  for (const char of text.normalize("NFC")) {
    const decomposed = char.normalize("NFD");
    const base = String.fromCodePoint(decomposed.codePointAt(0)!);
    folded +=
      decomposed.length > base.length &&
      base.length === char.length &&
      COMBINING_MARKS.test(decomposed.slice(base.length))
        ? base
        : char;
  }
  return folded;
}
