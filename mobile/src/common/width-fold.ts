/**
 * Full-width Latin and half-width katakana as their ordinary forms, as the
 * ledger service folds the text it searches (w21/912). Card and bank exports
 * write "ＡＭＡＺＯＮ．ＣＯ．ＪＰ" and "ｽﾀｰﾊﾞｯｸｽ" where a keyboard types "amazon"
 * and "スターバックス". Full-width forms are U+FF01–FF5E, 0xFEE0 above ASCII,
 * and U+3000 is a space; a run of half-width katakana is composed (ｶ + ﾞ is ガ)
 * by NFKC.
 *
 * Import-free so the unit runner can load it.
 */
export function foldWidth(text: string): string {
  return text
    .replace(/[！-～　]/gu, (char) =>
      char === "　" ? " " : String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/[｡-ﾟ]+/gu, (run) => run.normalize("NFKC"));
}
