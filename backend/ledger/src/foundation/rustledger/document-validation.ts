import { posix } from "node:path";
import type { BeancountError } from "@rustledger/wasm";

/**
 * Reconcile the WASM engine's document-existence validation, which is broken in
 * this architecture.
 *
 * `@rustledger/wasm` is a `wasm-pack --target web` build with NO filesystem
 * access (it exists precisely for filesystem-less environments — that's why the
 * `fromFiles(FileMap)` API exists). Yet it still runs beancount's
 * filesystem-dependent document checks: `Path::exists()` always returns false,
 * so EVERY `document "..."` directive yields `E8001 Document file not found`
 * and every `option "documents"` yields `[E7006] Document root … does not
 * exist`, flipping `isValid()` to false — even though the files really are
 * committed in git.
 *
 * The engine never needs the document bytes (a `document` directive carries no
 * amount and is not part of any computation; the file itself is served to the
 * frontend straight from Gitea). It only needs to *parse* the directive, which
 * it does. So we FILTER the engine's document errors against the real repo file
 * inventory (`repoPaths` — the Gitea blob tree):
 *   - `E8001` (explicit `document`): the engine's error is KEPT (preserving its
 *     original source file/line) only when the referenced file is genuinely
 *     absent from the repo — a real typo; otherwise it is a false positive and
 *     dropped.
 *   - `E7006` (`option "documents"` root): kept only when the configured root
 *     directory genuinely has no files under it in the repo. (The *auto-discovery*
 *     of files under that root is still a no-op — the engine has no filesystem to
 *     enumerate — but a mistyped/nonexistent root is a real config error.)
 *
 * Because we filter (rather than reconstruct) the engine's own errors, the
 * original source location (which file / line, including from `include`d files)
 * is preserved. When `repoPaths` is unavailable (a synthetic/entry-point-less
 * parse), the always-failing engine errors are dropped — there is nothing to
 * validate against.
 */

const DOCUMENT_NOT_FOUND_CODE = "E8001";
const DOCUMENT_ROOT_TAG = "[E7006]";

/** The WASM's (always-failing) existence check for an explicit `document` file. */
function isFileNotFound(error: BeancountError): boolean {
  return error.code === DOCUMENT_NOT_FOUND_CODE;
}

/** The WASM's (always-failing) `option "documents"` root check (code is null). */
function isDocumentRootError(error: BeancountError): boolean {
  return error.message.includes(DOCUMENT_ROOT_TAG);
}

/** Whether an error belongs to rustledger's filesystem-dependent checks. */
export function isDocumentValidationError(error: BeancountError): boolean {
  return isFileNotFound(error) || isDocumentRootError(error);
}

/**
 * Normalize a repo-relative path with POSIX semantics: resolve `.` / `..`,
 * collapse duplicate slashes, and strip leading/trailing slashes — so a directive
 * path like `documents/../receipts/x.pdf` matches the repo blob `receipts/x.pdf`.
 */
function normalizePath(path: string): string {
  return posix.normalize(path).replace(/^\/+/u, "").replace(/\/+$/u, "");
}

/**
 * Resolve a document path the way beancount does — relative to the DIRECTORY OF
 * THE FILE that declares it (`error.file`), not the repo root. So `document
 * "receipts/x.pdf"` declared in `sub/ledger.bean` resolves to
 * `sub/receipts/x.pdf`. An absolute path (leading `/`) and the fallback when the
 * declaring file is unknown are treated as repo-root-relative.
 */
function resolveDocumentPath(
  rawPath: string,
  declaringFile: string | null | undefined,
): string {
  if (rawPath.startsWith("/") || !declaringFile) return normalizePath(rawPath);
  return normalizePath(posix.join(posix.dirname(declaringFile), rawPath));
}

/** The document file named in an `E8001` message (`… not found: <path>`). */
function extractDocumentPath(message: string): string | null {
  const match = /Document file not found: (.+)$/u.exec(message);
  return match === null ? null : match[1];
}

/** The documents root named in an `[E7006]` message (`… root 'X' does not exist`). */
function extractDocumentRoot(message: string): string | null {
  // Greedy + end-anchored on the fixed suffix, so a root name that itself
  // contains a single quote (e.g. `docs'archive`) is captured whole rather than
  // truncated at the first `'` (which `'([^']*)'` would do).
  const match = /Document root '(.*)' does not exist$/u.exec(message);
  return match === null ? null : match[1];
}

/**
 * Whether `root` exists in the (already-normalized) repo inventory as a directory
 * — i.e. some file lives under it.
 */
function directoryExists(repoNorm: string[], root: string): boolean {
  const normalizedRoot = normalizePath(root);
  if (normalizedRoot === "." || normalizedRoot === "") {
    return repoNorm.length > 0;
  }
  const prefix = `${normalizedRoot}/`;
  return repoNorm.some(
    (path) => path === normalizedRoot || path.startsWith(prefix),
  );
}

/**
 * Filter the engine's filesystem-less document errors, validating each against
 * the real repo file inventory. See the module doc for the rationale. The
 * engine's original errors are preserved (with their source location) — only
 * confirmed false positives are dropped.
 */
export function reconcileDocumentErrors(
  errors: BeancountError[],
  repoPaths: string[] | undefined,
): BeancountError[] {
  const repoNorm = repoPaths?.map(normalizePath);
  const repoSet = repoNorm ? new Set(repoNorm) : undefined;

  return errors.filter((error) => {
    if (isFileNotFound(error)) {
      if (repoSet === undefined) return false; // nothing to validate against → drop
      const path = extractDocumentPath(error.message);
      // Keep the real error only when the referenced file is genuinely missing —
      // resolving the path relative to the file that DECLARED it (beancount
      // semantics), so a relative `document` in a subdirectory ledger validates.
      return (
        path !== null && !repoSet.has(resolveDocumentPath(path, error.file))
      );
    }
    if (isDocumentRootError(error)) {
      if (repoNorm === undefined) return false;
      const root = extractDocumentRoot(error.message);
      return (
        root !== null &&
        !directoryExists(repoNorm, resolveDocumentPath(root, error.file))
      );
    }
    return true; // unrelated error — keep
  });
}
