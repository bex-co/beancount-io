/**
 * Whether Delete Account's typed confirmation may be confirmed: the phrase,
 * ignoring surrounding spaces (an iOS suggestion appends one), or else why
 * not. Matched exactly, a trailing space left Delete greyed out with nothing
 * saying why (w21/158). Empty text, and the phrase still being typed, disable
 * without a message: the mismatch showed from the first correct letter
 * (w21/714).
 */
export function deleteConfirmationCheck(
  text: string,
  phrase: string,
  mismatch: string,
): true | false | string {
  const typed = text.trim();
  if (typed === phrase) return true;
  return typed && !phrase.startsWith(typed) ? mismatch : false;
}
