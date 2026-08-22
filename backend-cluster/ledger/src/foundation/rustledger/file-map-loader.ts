import { posix } from "node:path";
import type { FileMap } from "@rustledger/wasm";
import type {
  ContentsResponse,
  GitEntry,
  GitTreeResponse,
} from "@/features/gitea/client/gitea-api";
import { NotFoundError, ResourceLimitReachedError } from "@/shared/errors";
import { toSafeRepoUrlPath } from "@/shared/safe-repo-path";
import {
  readGiteaFileText,
  type GiteaRawFileClient,
  type GiteaTextContents,
} from "@/features/gitea/utils/gitea-file-content";

/**
 * Build the `FileMap` (`path -> contents`) that `@rustledger/wasm`'s
 * `Ledger.fromFiles(files, entryPoint)` consumes, by reading a ledger repo's
 * `.bean` files straight from Gitea — instead of over HTTP to the Python
 * fava_api we're replacing. This is `w4/m2/t001`.
 *
 * The fetch (`fetchBeanFileMap`) is deliberately **entry-point-agnostic**: it
 * pulls the repo's whole `.bean` tree and leaves `include` resolution to the
 * WASM engine. Because the whole `.bean`/`.beancount` tree is loaded, every
 * `.bean` include is already present; the one thing we DO resolve ourselves is
 * **non-`.bean` includes** (`include "accounts.txt"`, extensionless data
 * files) — beancount permits any extension, but those files are not in the
 * `.bean` sweep, so we scan the loaded text for their `include` targets and
 * fetch them too (transitively) or the engine reports them missing. The entry
 * point only selects/validates the parse root, so it is checked separately
 * (`requireEntryPoint`) — which is also what lets the SHA-keyed cache
 * (`foundation/clients/load-cached-ledger-file-map.ts`) store one FileMap per
 * commit shared by every entry point.
 */

const BEAN_FILE_RE = /\.(bean|beancount)$/;
const TREE_PAGE_LIMIT = 100;
/** Keep one cache miss from flooding Gitea with repository-content requests. */
export const GITEA_FILE_FETCH_CONCURRENCY = 8;
/** Hard operational limits independent of subscription-tier repo quotas. */
export const MAX_LEDGER_SOURCE_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_LEDGER_FILE_MAP_BYTES = 32 * 1024 * 1024;
export const MAX_LEDGER_FILE_MAP_FILES = 4_096;
/** Upper bound on aggregate NFA state/path work across include glob expansion. */
export const MAX_INCLUDE_GLOB_WORK = 10_000_000;

/**
 * Beancount's `include "path"` directive. `include` must be the first token on
 * the line (a top-level directive), so a comment (`; include "x"`) or a string
 * value never matches. Only the double-quoted form exists in beancount syntax.
 */
const INCLUDE_RE = /^[^\S\r\n]*include[^\S\r\n]+"([^"]*)"/gmu;
/** Safety bound on transitive include-resolution passes. */
const MAX_INCLUDE_PASSES = 100;

/** Every `include "…"` target declared in one file's text. */
export function extractIncludeTargets(content: string): string[] {
  return [...content.matchAll(INCLUDE_RE)].map((match) => match[1]);
}

/**
 * Resolve an `include` target the way beancount does — relative to the directory
 * of the file that declares it — into a normalized, repo-relative path. That
 * path is both the Gitea blob key we fetch and the key the WASM engine looks the
 * include up under, so the two agree. Glob metacharacters (`*` / `?` / `[…]`)
 * survive normalization, so the result can be a pattern.
 */
export function resolveIncludeTarget(
  includingPath: string,
  target: string,
): string {
  const joined = target.startsWith("/")
    ? target
    : posix.join(posix.dirname(includingPath), target);
  return posix.normalize(joined).replace(/^\/+/u, "");
}

/** Whether an include target is a glob pattern (`include "accounts/*.txt"`). */
export function isGlob(target: string): boolean {
  return /[*?[]/u.test(target);
}

/** Run repository-content reads with a fixed number of in-flight requests. */
async function fetchPathsWithBoundedConcurrency(
  paths: readonly string[],
  fetchPath: (path: string) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  let stopped = false;
  const workers = Array.from(
    { length: Math.min(GITEA_FILE_FETCH_CONCURRENCY, paths.length) },
    async () => {
      while (!stopped && nextIndex < paths.length) {
        const index = nextIndex;
        nextIndex += 1;
        try {
          await fetchPath(paths[index]);
        } catch (error) {
          stopped = true;
          throw error;
        }
      }
    },
  );
  await Promise.all(workers);
}

export interface GlobMatcher {
  test(path: string): boolean;
  estimatedWork(path: string): number;
}

export class GlobWorkBudget {
  private used = 0;

  public test(pattern: GlobMatcher, path: string): boolean {
    const work = pattern.estimatedWork(path);
    const next = this.used + work;
    if (!Number.isSafeInteger(next) || next > MAX_INCLUDE_GLOB_WORK) {
      throw new ResourceLimitReachedError(
        "Ledger include glob work units",
        MAX_INCLUDE_GLOB_WORK,
        Number.isSafeInteger(next) ? next : Number.MAX_SAFE_INTEGER,
      );
    }
    this.used = next;
    return pattern.test(path);
  }
}

type GlobToken =
  | { type: "literal"; value: string }
  | { type: "one" }
  | { type: "star" }
  | { type: "globstar" }
  | { type: "globstar-directory" }
  | {
      type: "class";
      negated: boolean;
      ranges: Array<readonly [string, string]>;
    };

function classMatches(
  token: Extract<GlobToken, { type: "class" }>,
  char: string,
): boolean {
  const codePoint = char.codePointAt(0) ?? -1;
  const included = token.ranges.some(([start, end]) => {
    const startPoint = start.codePointAt(0) ?? -1;
    const endPoint = end.codePointAt(0) ?? -1;
    return codePoint >= startPoint && codePoint <= endPoint;
  });
  return token.negated ? !included : included;
}

/**
 * Compile a beancount-style include glob to a bounded, non-backtracking
 * matcher. It matches Python's `glob.glob(..., recursive=True)`: `*` stays
 * within one path segment, `**` crosses segments, `?` consumes one non-`/`
 * character, and `[…]` / `[!…]` are character classes.
 *
 * This intentionally does not use RegExp. A user-controlled pattern such as
 * `a*a*a*…b` causes exponential backtracking in JavaScript's regex engine and
 * can freeze the API event loop. The NFA simulation below evaluates at most
 * `(tokens + 1) * path.length` states.
 *
 * Returns `null` for a malformed or over-budget pattern. The caller skips it
 * and lets the ledger engine surface its ordinary "matched no files" error.
 */
export function globToRegExp(glob: string): GlobMatcher | null {
  // Include patterns are ledger-controlled. Bound matcher state size and
  // wildcard count before evaluating them synchronously over a repo tree.
  const wildcardCount = [...glob].filter(
    (char) => char === "?" || char === "*" || char === "[",
  ).length;
  if (glob.length > 1024 || wildcardCount > 64) {
    return null;
  }
  const chars = [...glob];
  const tokens: GlobToken[] = [];
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    if (c === "*") {
      let end = i + 1;
      while (chars[end] === "*") end += 1;
      if (end - i >= 2) {
        if (chars[end] === "/") {
          tokens.push({ type: "globstar-directory" });
          i = end + 1;
        } else {
          tokens.push({ type: "globstar" });
          i = end;
        }
        continue;
      }
      tokens.push({ type: "star" });
      i += 1;
      continue;
    }
    if (c === "?") {
      tokens.push({ type: "one" });
      i += 1;
      continue;
    }
    if (c === "[") {
      let j = i + 1;
      let negated = false;
      if (chars[j] === "!") {
        negated = true;
        j += 1;
      }
      const classChars: string[] = [];
      while (j < chars.length && chars[j] !== "]") {
        classChars.push(chars[j]);
        j += 1;
      }
      if (j < chars.length && classChars.length > 0) {
        const ranges: Array<readonly [string, string]> = [];
        for (
          let classIndex = 0;
          classIndex < classChars.length;
          classIndex += 1
        ) {
          const start = classChars[classIndex];
          if (
            classChars[classIndex + 1] === "-" &&
            classIndex + 2 < classChars.length
          ) {
            const end = classChars[classIndex + 2];
            if ((start.codePointAt(0) ?? 0) > (end.codePointAt(0) ?? 0)) {
              return null;
            }
            ranges.push([start, end]);
            classIndex += 2;
          } else {
            ranges.push([start, start]);
          }
        }
        tokens.push({ type: "class", negated, ranges });
        i = j + 1;
        continue;
      }
      tokens.push({ type: "literal", value: "[" });
      i += 1;
      continue;
    }
    tokens.push({ type: "literal", value: c });
    i += 1;
  }

  const addEpsilonClosure = (states: Set<number>): void => {
    for (let index = 0; index < tokens.length; index += 1) {
      if (!states.has(index)) continue;
      const type = tokens[index].type;
      if (
        type === "star" ||
        type === "globstar" ||
        type === "globstar-directory"
      ) {
        states.add(index + 1);
      }
    }
  };

  return {
    estimatedWork(path: string): number {
      return (tokens.length + 1) * ([...path].length + 1);
    },
    test(path: string): boolean {
      let states = new Set<number>([0]);
      addEpsilonClosure(states);
      for (const char of path) {
        const next = new Set<number>();
        for (const state of states) {
          const token = tokens[state];
          if (token === undefined) continue;
          if (token.type === "literal" && token.value === char) {
            next.add(state + 1);
          } else if (token.type === "one" && char !== "/") {
            next.add(state + 1);
          } else if (
            token.type === "class" &&
            char !== "/" &&
            classMatches(token, char)
          ) {
            next.add(state + 1);
          } else if (token.type === "star" && char !== "/") {
            next.add(state);
          } else if (token.type === "globstar") {
            next.add(state);
          } else if (token.type === "globstar-directory") {
            next.add(state);
            if (char === "/") next.add(state + 1);
          }
        }
        states = next;
        addEpsilonClosure(states);
        if (states.size === 0) return false;
      }
      return states.has(tokens.length);
    },
  };
}

/** Default ledger parse root (see the Python service's `clone_and_load_beanfile`). */
export const DEFAULT_ENTRY_POINT = "main.bean";

/** The narrow slice of the generated Gitea client this loader depends on. */
export interface GiteaReposContentClient extends GiteaRawFileClient {
  getTree(
    owner: string,
    repo: string,
    sha: string,
    query?: { recursive?: boolean; page?: number; per_page?: number },
  ): Promise<{ data: GitTreeResponse }>;
  repoGetContents(
    owner: string,
    repo: string,
    filepath: string,
    query?: { ref?: string },
  ): Promise<{
    data: Omit<ContentsResponse, "content" | "encoding"> & GiteaTextContents;
  }>;
}

export interface GiteaClientLike {
  repos: GiteaReposContentClient;
}

export interface LoadLedgerOptions {
  /** commit/branch/tag to read; defaults to `"HEAD"`. Prefer a resolved SHA. */
  ref?: string;
  /** ledger entry point (must exist among the `.bean` files); defaults to `"main.bean"`. */
  entryPoint?: string;
}

export interface LoadedLedger {
  files: FileMap;
  entryPoint: string;
  /**
   * The entry point plus only the files transitively reachable through its
   * `include` directives. `files` intentionally contains the repo-wide bean
   * sweep for SHA caching; callers that expose or accept ledger source paths
   * must use this closure so an unreferenced scratch file cannot become a
   * write target whose entries disappear from reports.
   */
  sourceFiles: string[];
  /**
   * Every blob path in the repo at this ref (`.bean` AND non-`.bean` — e.g.
   * committed receipt PDFs), as the real inventory of files that exist. The
   * WASM engine has no filesystem, so `document`/`option "documents"` existence
   * is validated against THIS set (see `document-validation.ts`), not the
   * engine's own (always-failing) filesystem check.
   */
  repoPaths: string[];
}

/** List every tree entry across pages (recursive), bounded for safety. */
async function listAllTreeEntries(
  client: GiteaClientLike,
  owner: string,
  repo: string,
  ref: string,
): Promise<{ entries: GitEntry[]; resolvedRef: string }> {
  const entries: GitEntry[] = [];
  let page = 1;
  let truncated = true;
  let resolvedRef = ref;
  while (truncated && page <= TREE_PAGE_LIMIT) {
    const response = await client.repos.getTree(owner, repo, resolvedRef, {
      recursive: true,
      page,
      per_page: 1000,
    });
    // The first tree response resolves a floating HEAD/branch to a commit SHA.
    // Pin every subsequent page and content read to that same snapshot.
    if (page === 1 && response.data.sha) resolvedRef = response.data.sha;
    entries.push(...(response.data.tree ?? []));
    truncated = response.data.truncated === true;
    page += 1;
  }
  if (truncated) {
    throw new Error("Gitea tree listing exceeded the pagination safety bound");
  }
  return { entries, resolvedRef };
}

/**
 * Fetch every `.bean`/`.beancount` file in a ledger repo at `ref` into a
 * FileMap. Entry-point-agnostic — the result is a pure function of
 * `(owner, repo, ref)`, which is what makes it cacheable per commit SHA.
 */
export async function fetchBeanFileMap(
  client: GiteaClientLike,
  owner: string,
  repo: string,
  ref: string = "HEAD",
): Promise<{ files: FileMap; repoPaths: string[] }> {
  const { entries: treeEntries, resolvedRef } = await listAllTreeEntries(
    client,
    owner,
    repo,
    ref,
  );
  // Every blob path in the repo — the real file inventory (used to validate
  // `document` existence, since the WASM engine has no filesystem).
  const repoBlobEntries = treeEntries.filter(
    (entry): entry is GitEntry & { path: string } =>
      entry.type === "blob" && typeof entry.path === "string",
  );
  const repoPaths = repoBlobEntries.map((entry) => entry.path);
  const sizeByPath = new Map(
    repoBlobEntries
      .filter((entry) => typeof entry.size === "number" && entry.size >= 0)
      .map((entry) => [entry.path, entry.size as number]),
  );
  const beanPaths = repoPaths.filter((path) => BEAN_FILE_RE.test(path));
  if (beanPaths.length > MAX_LEDGER_FILE_MAP_FILES) {
    throw new ResourceLimitReachedError(
      "Ledger source file count",
      MAX_LEDGER_FILE_MAP_FILES,
      beanPaths.length,
    );
  }
  const declaredBeanBytes = beanPaths.reduce(
    (sum, path) => sum + (sizeByPath.get(path) ?? 0),
    0,
  );
  const declaredOversizedBean = beanPaths.find(
    (path) => (sizeByPath.get(path) ?? 0) > MAX_LEDGER_SOURCE_FILE_BYTES,
  );
  if (declaredOversizedBean !== undefined) {
    throw new ResourceLimitReachedError(
      "Ledger source file bytes",
      MAX_LEDGER_SOURCE_FILE_BYTES,
      sizeByPath.get(declaredOversizedBean) ?? 0,
    );
  }
  if (declaredBeanBytes > MAX_LEDGER_FILE_MAP_BYTES) {
    throw new ResourceLimitReachedError(
      "Ledger source bytes",
      MAX_LEDGER_FILE_MAP_BYTES,
      declaredBeanBytes,
    );
  }

  // Gitea's `contents` endpoint does not resolve symbolic `HEAD`; normally the
  // tree response above supplies its concrete SHA. Retain the old omission only
  // for non-conforming mocks/servers that omit `GitTreeResponse.sha`.
  const contentsQuery =
    resolvedRef === "HEAD" ? undefined : { ref: resolvedRef };
  const files = Object.create(null) as FileMap;
  let loadedBytes = 0;
  let loadedFileCount = 0;
  const fetchInto = async (path: string): Promise<void> => {
    // The generated client splices the path RAW into the URL, so a legally
    // named file containing a URL metacharacter (`budget#1.bean`, `q?.bean`)
    // would truncate/rewrite the request and fail the whole FileMap load —
    // encode each segment like every other Gitea content read (see
    // safe-repo-path.ts). The FileMap keeps the RAW path as its key.
    const urlPath = toSafeRepoUrlPath(path);
    const contents = await client.repos.repoGetContents(
      owner,
      repo,
      urlPath,
      contentsQuery,
    );
    const text = await readGiteaFileText(
      client.repos,
      owner,
      repo,
      urlPath,
      contents.data,
      contentsQuery,
      { maxBytes: MAX_LEDGER_SOURCE_FILE_BYTES, requireUtf8: true },
    );
    const nextBytes = loadedBytes + Buffer.byteLength(text, "utf-8");
    if (nextBytes > MAX_LEDGER_FILE_MAP_BYTES) {
      throw new ResourceLimitReachedError(
        "Ledger source bytes",
        MAX_LEDGER_FILE_MAP_BYTES,
        nextBytes,
      );
    }
    loadedBytes = nextBytes;
    loadedFileCount += 1;
    files[path] = text;
  };

  await fetchPathsWithBoundedConcurrency(beanPaths, fetchInto);

  // Pull in non-`.bean` files reached through `include` (e.g.
  // `include "accounts.txt"`, or a glob `include "accounts/*.txt"`). Every
  // `.bean` file is already loaded, so this only fetches the extra text files an
  // include points at; resolve transitively (an included file may itself
  // `include`) and only fetch paths that genuinely exist in the repo blob
  // inventory. The WASM engine expands globs against the FileMap, so for a glob
  // target we load ALL matching repo blobs (else the pattern matches nothing).
  const repoSet = new Set(repoPaths);
  const globBudget = new GlobWorkBudget();
  const processedIncludes = new Set<string>();
  for (let pass = 0; pass < MAX_INCLUDE_PASSES; pass += 1) {
    const missing = new Set<string>();
    let declaredMissingBytes = 0;
    const addMissing = (path: string): void => {
      if (missing.has(path)) return;
      const declaredBytes = sizeByPath.get(path) ?? 0;
      if (declaredBytes > MAX_LEDGER_SOURCE_FILE_BYTES) {
        throw new ResourceLimitReachedError(
          "Ledger source file bytes",
          MAX_LEDGER_SOURCE_FILE_BYTES,
          declaredBytes,
        );
      }
      const nextDeclaredBytes = declaredMissingBytes + declaredBytes;
      if (loadedBytes + nextDeclaredBytes > MAX_LEDGER_FILE_MAP_BYTES) {
        throw new ResourceLimitReachedError(
          "Ledger source bytes",
          MAX_LEDGER_FILE_MAP_BYTES,
          loadedBytes + nextDeclaredBytes,
        );
      }
      if (loadedFileCount + missing.size + 1 > MAX_LEDGER_FILE_MAP_FILES) {
        throw new ResourceLimitReachedError(
          "Ledger source file count",
          MAX_LEDGER_FILE_MAP_FILES,
          loadedFileCount + missing.size + 1,
        );
      }
      declaredMissingBytes = nextDeclaredBytes;
      missing.add(path);
    };
    for (const [path, content] of Object.entries(files)) {
      for (const target of extractIncludeTargets(content)) {
        const includeKey = `${path}\0${target}`;
        if (processedIncludes.has(includeKey)) continue;
        processedIncludes.add(includeKey);
        const resolved = resolveIncludeTarget(path, target);
        if (isGlob(resolved)) {
          const pattern = globToRegExp(resolved);
          // A malformed glob compiles to null → load nothing; the engine reports
          // a normal "no match" ledger error rather than throwing.
          if (pattern) {
            for (const repoPath of repoPaths) {
              if (
                !Object.hasOwn(files, repoPath) &&
                globBudget.test(pattern, repoPath)
              ) {
                addMissing(repoPath);
              }
            }
          }
        } else if (!Object.hasOwn(files, resolved) && repoSet.has(resolved)) {
          addMissing(resolved);
        }
      }
    }
    if (missing.size === 0) break;
    await fetchPathsWithBoundedConcurrency([...missing], fetchInto);
  }

  // Return the FileMap with DETERMINISTIC key order (sorted). Blobs are fetched
  // in parallel, so raw insertion order follows network-completion order — which
  // makes the source-slice file-walk (and thus cross-file duplicate-entry
  // resolution) non-deterministic. Sorting pins it to a stable order.
  const orderedFiles = Object.create(null) as FileMap;
  for (const path of Object.keys(files).sort())
    orderedFiles[path] = files[path];

  return { files: orderedFiles, repoPaths };
}

/**
 * Assert that `entryPoint` exists in the FileMap.
 *
 * @throws NotFoundError if the entry point is not among the repo's `.bean` files.
 */
export function requireEntryPoint(
  files: FileMap,
  owner: string,
  repo: string,
  entryPoint: string,
): void {
  if (!Object.hasOwn(files, entryPoint)) {
    throw new NotFoundError(
      "Ledger entry point",
      `${owner}/${repo}:${entryPoint}`,
    );
  }
}

/**
 * Compute the deterministic include closure for one entry point from an
 * already-loaded FileMap. Missing and malformed targets are left for the
 * ledger engine to report; only files that actually exist in the map are
 * returned. Cycles are safe because every path is visited at most once.
 */
export function collectSourceFiles(
  files: FileMap,
  entryPoint: string,
): string[] {
  const filePaths = Object.keys(files);
  const visited = new Set<string>();
  const pending = [entryPoint];
  const globBudget = new GlobWorkBudget();

  while (pending.length > 0) {
    const path = pending.pop();
    if (path === undefined || visited.has(path) || !Object.hasOwn(files, path))
      continue;
    visited.add(path);

    for (const target of extractIncludeTargets(files[path] ?? "")) {
      const resolved = resolveIncludeTarget(path, target);
      if (isGlob(resolved)) {
        const pattern = globToRegExp(resolved);
        if (!pattern) continue;
        for (const candidate of filePaths) {
          if (!visited.has(candidate) && globBudget.test(pattern, candidate)) {
            pending.push(candidate);
          }
        }
      } else if (!visited.has(resolved) && Object.hasOwn(files, resolved)) {
        pending.push(resolved);
      }
    }
  }

  return [...visited].sort();
}

/** Approximate serialized payload bytes for Redis cache admission decisions. */
export function ledgerFileMapPayloadBytes(
  files: FileMap,
  repoPaths: readonly string[],
): number {
  let total = 0;
  for (const [path, content] of Object.entries(files)) {
    total += Buffer.byteLength(path, "utf-8");
    total += Buffer.byteLength(content, "utf-8");
  }
  for (const path of repoPaths) total += Buffer.byteLength(path, "utf-8");
  return total;
}

/**
 * Load a ledger repo's `.bean`/`.beancount` files from Gitea into a FileMap
 * plus its entry point, ready for the rustledger engine.
 *
 * @throws NotFoundError if the entry point is not among the repo's `.bean` files.
 */
export async function loadLedgerFileMap(
  client: GiteaClientLike,
  owner: string,
  repo: string,
  options: LoadLedgerOptions = {},
): Promise<LoadedLedger> {
  const ref = options.ref ?? "HEAD";
  const entryPoint = options.entryPoint ?? DEFAULT_ENTRY_POINT;

  const { files, repoPaths } = await fetchBeanFileMap(client, owner, repo, ref);
  requireEntryPoint(files, owner, repo, entryPoint);
  const sourceFiles = collectSourceFiles(files, entryPoint);

  return { files, entryPoint, sourceFiles, repoPaths };
}
