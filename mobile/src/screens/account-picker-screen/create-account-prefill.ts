/** A Latin letter: Basic Latin, Latin-1 Supplement, and Latin Extended-A/B. */
const LATIN_LETTER = /[A-Za-zÀ-ÖØ-öø-ɏ]/;

/**
 * The account name the picker's "Create" row hands to Open Account.
 *
 * Search is case-insensitive, so people type `groceries`, but Open Account
 * requires each component to start with an uppercase letter or a digit, so the
 * raw query opened a form that was already invalid. Each component's first
 * character is capitalized only when it is a lowercase Latin letter with a
 * single-character uppercase form. Caseless scripts (Han, Kana, …), digits,
 * and everything after the first character pass through as typed, so a name
 * that is invalid for another reason still shows its own error on the form.
 */
export function capitalizeAccountPrefill(query: string): string {
  return query
    .split(":")
    .map((component) => {
      const [initial, ...rest] = [...component];
      if (initial === undefined || !LATIN_LETTER.test(initial)) {
        return component;
      }
      const upper = initial.toUpperCase();
      if (upper === initial || [...upper].length !== 1) return component;
      return upper + rest.join("");
    })
    .join(":");
}
