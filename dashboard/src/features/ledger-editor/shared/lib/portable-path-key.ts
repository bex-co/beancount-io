import { CombinedGraphQLErrors } from "@apollo/client/errors";

/** Characters that draw nothing: a name holding one looks like one without. */
const INVISIBLE = /[\u00ad\u200b-\u200d\u2060\ufeff]/gu;

/**
 * A repository path as every checkout sees it: one letter case, composed
 * Unicode, no invisible characters. The server refuses a new path whose key
 * matches an existing one, because macOS and Windows keep only one of the
 * pair (w21/770). A local copy of backend-v2's rule: packages stay
 * independent (w2/113).
 */
export function portablePathKey(path: string): string {
  return path.normalize("NFC").replace(INVISIBLE, "").toLowerCase();
}

/**
 * The listed name that `name` would collide with: itself when spelled the
 * same, a portable twin otherwise (`main.bean` for `Main.bean`), or null.
 */
export function existingNameFor(
  name: string,
  names: Iterable<string>,
): string | null {
  const key = portablePathKey(name);
  let twin: string | null = null;
  for (const existing of names) {
    if (existing === name) return existing;
    if (twin === null && portablePathKey(existing) === key) twin = existing;
  }
  return twin;
}

/** `File conflict: Main.bean already exists as main.bean`. */
const TWIN_CONFLICT = /\balready exists as ([^\n\p{Cc}]{1,1024})$/u;

/**
 * The existing path a server refusal of a portable twin names, or null for
 * any other error.
 */
export function portableTwinOf(error: unknown): string | null {
  if (!CombinedGraphQLErrors.is(error)) return null;
  for (const item of error.errors) {
    if (item.extensions?.code !== "CONFLICT") continue;
    const match = TWIN_CONFLICT.exec(item.message);
    if (match) return match[1];
  }
  return null;
}
