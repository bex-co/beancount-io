/**
 * Shared repository walk for include-aware guards (w23/m4/t001).
 *
 * Rename and delete both reason about `include` lines, and both must see the
 * whole tree rather than trusting the entry-point-reachable set: an orphan
 * file nobody includes today breaks the day someone includes it. This walk is
 * extracted verbatim from the rename guard so the two cannot drift.
 */

export interface LedgerDirEntry {
  type?: string | null;
  path?: string | null;
}

export interface BeanFileScan {
  /** Every `.bean`/`.beancount` file in the tree. */
  beanFiles: string[];
  /** Every non-directory entry in the tree. */
  allFiles: string[];
}

/**
 * List every `.bean`/`.beancount` file under the repository root,
 * descending into all directories. `listDir` lists one level (undefined for
 * the root) and translates its own failures.
 */
export async function scanLedgerBeanFiles(
  listDir: (
    dir?: string,
  ) => Promise<ReadonlyArray<LedgerDirEntry> | null | undefined>,
): Promise<BeanFileScan> {
  const beanFiles: string[] = [];
  const allFiles: string[] = [];
  const pendingDirs: (string | undefined)[] = [undefined];
  while (pendingDirs.length > 0) {
    const dir = pendingDirs.pop();
    const entries = await listDir(dir);
    for (const entry of entries ?? []) {
      if (entry.type === "dir") {
        pendingDirs.push(entry.path ?? undefined);
        continue;
      }
      if (entry.path === undefined || entry.path === null) continue;
      allFiles.push(entry.path);
      if (
        entry.type === "file" &&
        /\.(bean|beancount)$/.test(entry.path)
      )
        beanFiles.push(entry.path);
    }
  }
  return { beanFiles, allFiles };
}
