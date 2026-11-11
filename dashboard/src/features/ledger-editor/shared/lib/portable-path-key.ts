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

/** Windows device names, with or without an extension. */
const DEVICE_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const utf8 = new TextEncoder();

/**
 * Whether a new path is one every checkout can store: no control or bidi
 * character, none of `<>:"|?*`, no part ending in a dot or a space, no
 * Windows device name (`con.txt`, not `console.bean`) and no part over 255
 * bytes. A local copy of backend-v2's `assertPortableRepoPath` (w23/054), so
 * Create File and Upload say so before the server refuses (w2/127).
 */
export function isPortablePath(path: string): boolean {
  if (/[\p{Cc}\u2028\u2029]/u.test(path)) return false;
  if (/\p{Bidi_Control}/u.test(path)) return false;
  if (/[<>:"|?*]/.test(path)) return false;
  return path
    .split("/")
    .every(
      (segment) =>
        !/[. ]$/.test(segment) &&
        !DEVICE_NAME.test(segment) &&
        utf8.encode(segment).length <= 255,
    );
}

/** The server's refusal of a name `isPortablePath` rejects (w23/054). */
const PORTABLE_REFUSAL =
  /^File path .* (?:contains a control character|contains a bidirectional text control|contains one of <>:"\|\?\*|has a part ending in a dot or a space|uses the Windows device name|has a part longer than 255 bytes)/s;

/** `a.bean/b.bean cannot be created: a.bean is a file, not a folder`. */
const FILE_AS_FOLDER =
  /cannot be created: ([^\n\p{Cc}]{1,1024}) is a file, not a folder$/u;

/**
 * What a refused create or upload says in the reader's words: a name the
 * server cannot store, or a file used as a folder. Null for anything else.
 */
export function pathRefusalOf(
  error: unknown,
): { kind: "portable" } | { kind: "fileAsFolder"; name: string } | null {
  if (!CombinedGraphQLErrors.is(error)) return null;
  for (const item of error.errors) {
    const code = item.extensions?.code;
    if (code === "BAD_USER_INPUT" && PORTABLE_REFUSAL.test(item.message)) {
      return { kind: "portable" };
    }
    const folder =
      code === "CONFLICT" ? FILE_AS_FOLDER.exec(item.message) : null;
    if (folder) return { kind: "fileAsFolder", name: folder[1]! };
  }
  return null;
}
