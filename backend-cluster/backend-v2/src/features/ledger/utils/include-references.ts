/**
 * Shared include-aware guard code for rename and delete (w23/m4/t001).
 *
 * Rename and delete both reason about `include` lines, and both must see the
 * whole tree rather than trusting the entry-point-reachable set: an orphan
 * file nobody includes today breaks the day someone includes it. The other
 * files the ledger loads join the tree's `.bean` files, since their includes
 * count as much (w31/023). The walk is shared with the rename guard so the
 * two cannot drift, and both delete paths share the scan, the Fava reads,
 * and the refusal below.
 */
import { assertWritableText, decodeFileContent } from "@/shared/file-content";
import type { Identity } from "@/server/api/identity";
import type { ILedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import type { ILedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { BadUserInputError } from "@/shared/errors";
import { type FavaApiClient, unwrapFavaResponse } from "@/foundation/fava";
import { operationNotAllowedFromCause } from "./operation-not-allowed-from-cause";
import {
  isGlobPattern,
  isUrlTarget,
  resolveIncludeTarget,
  scanIncludeLines,
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
  "the directory of the file that declares it, and glob includes never count. " +
  "`removeIncludes` (alias `remove_includes`) drops those exact include " +
  "lines in the same commit; globs stay.";

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

export interface IncluderScan {
  /**
   * The files whose `include` lines the guards read: every
   * `.bean`/`.beancount` file in the tree, loaded or not, plus every other
   * file the ledger loads — an `include "accounts.txt"` makes that `.txt`
   * one (w31/023). A text file the ledger never loads is not, so a README
   * quoting an include line never blocks a rename. Tree order.
   */
  includers: string[];
  /** Every non-directory entry in the tree. */
  allFiles: string[];
}

/** The ledger's committed include closure, as the ledger service lists it. */
export type ListSourceFiles = () => Promise<
  ReadonlyArray<string> | null | undefined
>;

/**
 * List the includers under the repository root, descending into all
 * directories. `listDir` lists one level (undefined for the root) and
 * translates its own failures; a tree that cannot be listed fails the scan.
 * The closure is the ledger service's to compute, because only its loader
 * knows what an include reaches. A ledger it cannot load (no entry point,
 * past its caps) still has every `.bean` file scanned, as before w31/023.
 */
export async function scanLedgerIncluders(
  listDir: (
    dir?: string,
  ) => Promise<ReadonlyArray<LedgerDirEntry> | null | undefined>,
  listSourceFiles: ListSourceFiles,
): Promise<IncluderScan> {
  // Read alongside the walk; a throw of either kind means no closure.
  const loading = Promise.resolve()
    .then(listSourceFiles)
    .then(
      (paths) => new Set(paths ?? []),
      () => new Set<string>(),
    );
  const includers: string[] = [];
  const allFiles: string[] = [];
  const regularFiles: string[] = [];
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
      if (entry.type === "file") regularFiles.push(entry.path);
    }
  }
  const loaded = await loading;
  for (const path of regularFiles) {
    if (/\.(bean|beancount)$/.test(path) || loaded.has(path))
      includers.push(path);
  }
  return { includers, allFiles };
}

export interface LedgerFileContent {
  path: string;
  content?: string | null;
  encoding?: string | null;
  sha?: string | null;
  /** Set when the reader already knows the text is not valid UTF-8. */
  lossy?: boolean;
}

/**
 * The Fava reads behind {@link findDanglingDeleteIncluders}, shared by both
 * delete paths (w23/m4/t005): the repo service's batches and the workflow's
 * single-file delete list and read with identical calls, so the pair lives
 * here rather than once per caller.
 */
export function deleteGuardFileAccess(
  favaApiClient: FavaApiClient,
  ledgerOwner: string,
  ledgerName: string,
): Pick<
  Parameters<typeof findDanglingDeleteIncluders>[0],
  "listDir" | "readFiles" | "listSourceFiles"
> {
  return {
    listDir: (dir) =>
      unwrapFavaResponse(
        favaApiClient.ledgers.getLedgerDirContent(ledgerOwner, ledgerName, {
          ...(dir === undefined ? {} : { dir_path: dir }),
        }),
        "list ledger files for delete guard",
        (cause) =>
          operationNotAllowedFromCause(
            "list ledger files for delete guard",
            cause,
          ),
      ),
    readFiles: (paths) =>
      unwrapFavaResponse(
        favaApiClient.ledgers.getLedgerFilesContent(ledgerOwner, ledgerName, {
          files: paths,
        }),
        "read ledger files for delete guard",
        (cause) =>
          operationNotAllowedFromCause(
            "read ledger files for delete guard",
            cause,
          ),
      ),
    listSourceFiles: () =>
      unwrapFavaResponse(
        favaApiClient.reports.getLedgerSourceFiles(ledgerOwner, ledgerName),
        "list ledger source files for delete guard",
      ),
  };
}

/**
 * The files a delete would strand: for each deleted path, the surviving
 * includers ({@link scanLedgerIncluders}) whose `include` lines still
 * resolve to it (w23/m4/t001–t002, w31/023). Includes match on resolved
 * paths like rename's (w23/029). `overlays` carry projected batch contents
 * (null for a path the batch deletes), so a batch that drops the include
 * lines alongside the delete finds nothing. Glob includes are ignored: a file leaving a glob's
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
  listSourceFiles: ListSourceFiles;
  deletedPaths: ReadonlySet<string> | ReadonlyArray<string>;
  overlays?: ReadonlyMap<string, string | null>;
}): Promise<Map<string, string[]>> {
  const deleted = new Set(opts.deletedPaths);
  const overlays = opts.overlays ?? new Map<string, string | null>();
  const { includers } = await scanLedgerIncluders(
    opts.listDir,
    opts.listSourceFiles,
  );
  const survivors = new Set(includers.filter((path) => !deleted.has(path)));
  const contents = new Map<string, string>();
  for (const [path, content] of overlays) {
    if (content !== null && survivors.has(path)) contents.set(path, content);
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
    for (const { include } of scanIncludeLines(content)) {
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

/** `content` without the exact `include` lines that resolve into `deleted`. */
function stripIncludeLines(
  includerPath: string,
  content: string,
  deleted: ReadonlySet<string>,
): string {
  return scanIncludeLines(content)
    .filter(({ include }) => {
      if (!include || isUrlTarget(include.target)) return true;
      const resolved = resolveIncludeTarget(includerPath, include.target);
      return isGlobPattern(resolved) || !deleted.has(resolved);
    })
    .map(({ line }) => line)
    .join("\n");
}

export interface IncludeRemoval {
  path: string;
  /** The includer's new plain UTF-8 text, the exact include lines dropped. */
  content: string;
  sha?: string;
}

/**
 * The rewrites that let a delete go through (`removeIncludes`): each
 * surviving file with an exact `include` of a deleted path, minus those
 * lines. Glob includes are left alone — removing one would affect the other
 * files it matches. Commit these with the delete in one batch.
 */
export async function planIncludeRemovals(opts: {
  listDir: Parameters<typeof findDanglingDeleteIncluders>[0]["listDir"];
  readFiles: Parameters<typeof findDanglingDeleteIncluders>[0]["readFiles"];
  listSourceFiles: ListSourceFiles;
  deletedPaths: ReadonlySet<string> | ReadonlyArray<string>;
}): Promise<IncludeRemoval[]> {
  const deleted = new Set(opts.deletedPaths);
  const dangling = await findDanglingDeleteIncluders({
    ...opts,
    deletedPaths: deleted,
  });
  const includers = [...new Set([...dangling.values()].flat())].sort();
  if (includers.length === 0) return [];
  const files = await opts.readFiles(includers);
  return (files ?? []).map((file) => {
    const decoded = decodeFileContent(file);
    // A rewrite re-encodes the whole including file (w23/030).
    assertWritableText(
      { path: file.path, lossy: decoded.lossy || file.lossy },
      "removeIncludes",
    );
    return {
      path: file.path,
      content: stripIncludeLines(file.path, decoded.content, deleted),
      ...(file.sha ? { sha: file.sha } : {}),
    };
  });
}

/**
 * The tree reads {@link planIncludeRemovals} needs, over the repo service,
 * and the include closure over the data service.
 */
export function repoServiceFileAccess(
  services: {
    ledgerRepo: ILedgerRepoService;
    ledgerData: Pick<ILedgerDataService, "getSourceFiles">;
  },
  ledgerId: string,
  identity: Identity,
): Pick<
  Parameters<typeof planIncludeRemovals>[0],
  "listDir" | "readFiles" | "listSourceFiles"
> {
  const { ledgerRepo, ledgerData } = services;
  return {
    listDir: (dir) =>
      ledgerRepo.listDirContent({
        ledgerId,
        identity,
        ...(dir === undefined ? {} : { dirPath: dir }),
      }),
    readFiles: (paths) =>
      ledgerRepo.getFilesContent({ ledgerId, identity, paths }),
    listSourceFiles: () => ledgerData.getSourceFiles({ ledgerId, identity }),
  };
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
