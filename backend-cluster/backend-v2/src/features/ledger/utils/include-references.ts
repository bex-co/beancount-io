/**
 * Shared repository walk for include-aware guards (w23/m4/t001).
 *
 * Rename and delete both reason about `include` lines, and both must see the
 * whole tree rather than trusting the entry-point-reachable set: an orphan
 * file nobody includes today breaks the day someone includes it. This walk is
 * extracted verbatim from the rename guard so the two cannot drift.
 */
import { decodeFileContent } from "@/shared/file-content";
import { BadUserInputError } from "@/shared/errors";
import {
  isGlobPattern,
  isUrlTarget,
  parseIncludeLine,
  resolveIncludeTarget,
} from "./include-target";

/**
 * The one delete-guard description every surface publishes (w23/m4/t003):
 * the MCP `deleteLedgerFiles` tool (plus `editLedgerFiles`' delete line),
 * the REST file DELETE, and the GraphQL `deleteLedgerFile` mutation.
 * Surface-neutral by construction — no spelling names its home.
 *
 * Every sentence here is proven: the refusal on all three surfaces
 * (`delete guard via %s` in rename-parity.test.ts), the resolved-path
 * matching and the glob exemption in the repo-service tests
 * (`deleting an included file` in ledger-repo-service.test.ts).
 */
export const DELETE_INCLUDE_GUARD_DESCRIPTION =
  "Deleting a file still `include`d by another ledger file is refused as " +
  "`BAD_USER_INPUT` naming the includers; remove the include from the " +
  "including file(s) first, then delete. An include counts when its target " +
  "resolves to the deleted path the way the ledger loads it, relative to " +
  "the directory of the file that declares it, and glob includes never count.";

/**
 * The batch half of the delete guard, for callers that mix operations in
 * one commit — the in-process `editLedgerFiles` dispatcher, whose `files[]`
 * can drop an include line and delete the file together. The wire surfaces
 * commit one operation per call (`deleteLedgerFiles` batches deletes only),
 * so they publish the core description only and drop the include first in a
 * separate call. Proven by `allows the delete when the same batch drops the
 * include` in ledger-repo-service.test.ts.
 */
export const DELETE_INCLUDE_GUARD_BATCH_NOTE =
  "A batch that drops the include lines and deletes the file in the same " +
  "commit passes — the check runs over the projected tree.";

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

export interface LedgerFileContent {
  path: string;
  content?: string | null;
  encoding?: string | null;
}

/**
 * The files a delete would strand: for each deleted path, the surviving
 * `.bean`/`.beancount` files whose `include` lines still resolve to it
 * (w23/m4/t001–t002). Includes match on resolved paths like rename's
 * (w23/029). `overlays` carry projected batch contents (null for a path the
 * batch deletes), so a batch that drops the include lines alongside the
 * delete finds nothing. Glob includes are ignored: a file leaving a glob's
 * match breaks no load. Both delete paths — the repo service's batches and
 * the workflow's single-file delete — share this scan and the refusal below,
 * so their messages cannot drift.
 */
export async function findDanglingDeleteIncluders(opts: {
  listDir: (
    dir?: string,
  ) => Promise<ReadonlyArray<LedgerDirEntry> | null | undefined>;
  readFiles: (
    paths: string[],
  ) => Promise<ReadonlyArray<LedgerFileContent> | null | undefined>;
  deletedPaths: ReadonlySet<string> | ReadonlyArray<string>;
  overlays?: ReadonlyMap<string, string | null>;
}): Promise<Map<string, string[]>> {
  const deleted = new Set(opts.deletedPaths);
  const overlays = opts.overlays ?? new Map<string, string | null>();
  const { beanFiles } = await scanLedgerBeanFiles(opts.listDir);
  const survivors = new Set(
    beanFiles.filter((path) => !deleted.has(path)),
  );
  const contents = new Map<string, string>();
  for (const [path, content] of overlays) {
    if (content !== null && survivors.has(path))
      contents.set(path, content);
  }
  const toRead = [...survivors].filter((path) => !contents.has(path));
  if (toRead.length > 0) {
    const files = await opts.readFiles(toRead);
    for (const file of files ?? []) {
      contents.set(file.path, decodeFileContent(file).content);
    }
  }
  const dangling = new Map<string, string[]>();
  for (const [path, content] of contents) {
    for (const line of content.split("\n")) {
      const include = parseIncludeLine(line);
      if (!include || isUrlTarget(include.target)) continue;
      const resolved = resolveIncludeTarget(path, include.target);
      if (isGlobPattern(resolved)) continue;
      if (deleted.has(resolved)) {
        const includers = dangling.get(resolved) ?? [];
        if (!includers.includes(path)) includers.push(path);
        dangling.set(resolved, includers);
      }
    }
  }
  return dangling;
}

/**
 * Refuse a delete that {@link findDanglingDeleteIncluders} flagged, naming
 * every stranded file and its includers. Silent when nothing dangles.
 */
export function refuseDanglingDeletes(
  dangling: ReadonlyMap<string, string[]>,
): void {
  if (dangling.size === 0) return;
  const reports = [...dangling.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(
      ([path, includers]) =>
        `${path} is still included by ${includers.join(", ")}`,
    );
  throw new BadUserInputError(
    `${reports.join("; ")}; remove the include from the including file(s) first, then delete`,
    undefined,
    "Edit the including file(s) to drop the include line(s), then resend the delete.",
  );
}
