/**
 * Marks that draw nothing: zero-width space, the left- and right-to-left
 * marks, the bidi embeddings and isolates, the word joiner and invisible
 * operators, the Arabic letter mark, the soft hyphen, the Mongolian vowel
 * separator and a byte-order mark inside a string. `trim()` strips none of them
 * but the last, so pasted text kept them: one merchant split in two, and Open
 * Account refused a name that looked fine (w21/965). The zero-width non-joiner
 * and joiner are left, since Persian and Indic words need them.
 *
 * Import-free so the unit runner can load it.
 */
const INVISIBLE_MARKS = /[­؜᠎​‎‏‪-‮⁠-⁤⁦-⁩﻿]/gu;

/** Text without its invisible marks. */
export function withoutInvisibleMarks(text: string): string {
  return text.replace(INVISIBLE_MARKS, "");
}

/** Free text as it is saved: those marks gone, then the ends trimmed. */
export function cleanFreeText(text: string): string {
  return withoutInvisibleMarks(text).trim();
}
