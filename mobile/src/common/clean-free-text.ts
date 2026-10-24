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

/**
 * Marks dropped from text that is saved: the ones that carry nothing a reader
 * sees. The left- and right-to-left marks, the Arabic letter mark and the soft
 * hyphen stay: a user may have typed an RLM so that trailing punctuation sits
 * on the right side of Arabic or Hebrew text, and stripping it moved the
 * punctuation (w21/986). Names, keys and searches fold all of them away through
 * {@link withoutInvisibleMarks}, so a pasted trailing LRM still merges merchants
 * and suggestions.
 */
const UNSEEN_MARKS =
  /[\u180e\u200b\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/gu;

/** Free text as it is saved: unseen marks gone, direction marks kept, then the ends trimmed. */
export function cleanFreeText(text: string): string {
  return text.replace(UNSEEN_MARKS, "").trim();
}
