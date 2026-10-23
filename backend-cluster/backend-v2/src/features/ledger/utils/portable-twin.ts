import { ConflictError, DomainError, ErrorCategory } from "@/shared/errors";

/** Characters that draw nothing: a name holding one looks like one without. */
const INVISIBLE = /[\u00ad\u200b-\u200d\u2060\ufeff]/gu;

/**
 * A repository path as every checkout sees it: one letter case, composed
 * Unicode, no invisible characters. Two paths with one key are one file on
 * macOS and Windows, which keep only one of them.
 */
export function portablePathKey(path: string): string {
  return path.normalize("NFC").replace(INVISIBLE, "").toLowerCase();
}

type DirectoryEntry = { path: string };

/**
 * Refuses a new file whose path differs from one the repository has only by
 * letter case, Unicode form or an invisible character, its folders included:
 * "Main.bean" beside main.bean was created, and a clone on macOS or Windows
 * kept only one of the pair (w21/770). `list` reads a folder of the
 * repository, the root for `undefined`. A folder that does not exist yet has
 * nothing to collide with.
 */
export async function assertNoPortableTwin(
  path: string,
  list: (dir: string | undefined) => Promise<readonly DirectoryEntry[]>,
): Promise<void> {
  const segments = path.split("/");
  let dir: string | undefined;
  for (let depth = 1; depth <= segments.length; depth += 1) {
    const wanted = segments.slice(0, depth).join("/");
    let entries: readonly DirectoryEntry[];
    try {
      entries = await list(dir);
    } catch (error) {
      if (
        error instanceof DomainError &&
        error.category === ErrorCategory.NOT_FOUND
      ) {
        return;
      }
      throw error;
    }
    const twin = entries.find(
      (entry) =>
        entry.path !== wanted &&
        portablePathKey(entry.path) === portablePathKey(wanted),
    );
    if (twin) {
      throw new ConflictError(
        "File",
        `${path} already exists as ${twin.path}`,
        {
          hint: "macOS and Windows keep one of two names that differ only by letter case, accents or an invisible character. Choose another name, or edit the existing file.",
        },
      );
    }
    if (!entries.some((entry) => entry.path === wanted)) return;
    dir = wanted;
  }
}

/**
 * The `list` for {@link assertNoPortableTwin} over a tree already walked:
 * `files` is every file it keeps, so a folder is there while a file under it
 * is.
 */
export function listingOf(
  files: readonly string[],
): (dir: string | undefined) => Promise<DirectoryEntry[]> {
  return async (dir) => {
    const prefix = dir === undefined ? "" : `${dir}/`;
    const children = new Set<string>();
    for (const file of files) {
      if (!file.startsWith(prefix)) continue;
      children.add(prefix + file.slice(prefix.length).split("/")[0]);
    }
    return [...children].map((path) => ({ path }));
  };
}

/** Refuses a batch that creates two paths with one portable key. */
export function assertNoTwinsAmong(paths: readonly string[]): void {
  const seen = new Map<string, string>();
  for (const path of paths) {
    const key = portablePathKey(path);
    const other = seen.get(key);
    if (other !== undefined && other !== path) {
      throw new ConflictError("File", `${path} already exists as ${other}`, {
        hint: "macOS and Windows keep one of two names that differ only by letter case, accents or an invisible character.",
      });
    }
    seen.set(key, path);
  }
}
