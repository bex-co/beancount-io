import { posix } from "node:path";
import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { getDirectiveSourceLocation } from "./plugins/provenance";

/**
 * Reconcile the WASM engine's document-existence validation, which is broken in
 * this architecture.
 *
 * `@rustledger/wasm` is a `wasm-pack --target web` build with NO filesystem
 * access (it exists precisely for filesystem-less environments — that's why the
 * `fromFiles(FileMap)` API exists). Older builds still ran beancount's
 * filesystem-dependent document checks: `Path::exists()` always returned false,
 * so EVERY `document "..."` directive yielded `E8001 Document file not found`
 * and every `option "documents"` yielded `[E7006] Document root … does not
 * exist`, flipping `isValid()` to false — even though the files really are
 * committed in git. `@rustledger/wasm` ≥0.24 still emits E8001 for explicit
 * `document` paths (reconciled below) but no longer emits E7006 for the
 * documents option root.
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
 *   - `E7006` (`option "documents"` root): always dropped. Discovery
 *     (`document-discovery.ts`) walks each root in the same inventory and
 *     reports a root that does not exist itself, resolved against the entry
 *     point as Beancount does, so an engine that emitted the check again
 *     would only repeat it (w31/021).
 *
 * Because we filter (rather than reconstruct) the engine's own errors, the
 * original source location (which file / line, including from `include`d files)
 * is preserved. When `repoPaths` is unavailable (a synthetic/entry-point-less
 * parse), the always-failing engine errors are dropped — there is nothing to
 * validate against.
 */

const DOCUMENT_NOT_FOUND_CODE = "E8001";
const DOCUMENT_ROOT_TAG = "[E7006]";

/**
 * The WASM's (always-failing) existence check for an explicit `document`
 * file. The engine also spends E8001 on `Plugin not found: "X"`, which this
 * dropped as a document error, so a typo in a plugin name turned its checks
 * off with nothing reported (w1/208); the message tells them apart.
 */
function isFileNotFound(error: BeancountError): boolean {
  return (
    error.code === DOCUMENT_NOT_FOUND_CODE &&
    /Document file not found: /u.test(error.message)
  );
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

/**
 * The repository-relative file a Document directive names. A relative path
 * resolves against the directory of the file that declares it, as for the
 * existence check above, so `document … "receipt.txt"` in
 * `books/documents.bean` is `books/receipt.txt`, not a root `receipt.txt`
 * (w4/301). An absolute path, or one whose declaring file is unknown, is
 * returned as written.
 */
export function documentFilePath(
  directive: Extract<DirectiveJson, { type: "document" }>,
): string {
  const declaringFile = getDirectiveSourceLocation(directive)?.filename;
  if (declaringFile === undefined || directive.path.startsWith("/")) {
    return directive.path;
  }
  return resolveDocumentPath(directive.path, declaringFile);
}

/** The document file named in an `E8001` message (`… not found: <path>`). */
function extractDocumentPath(message: string): string | null {
  const match = /Document file not found: (.+)$/u.exec(message);
  return match === null ? null : match[1];
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
  const repoSet = repoPaths ? new Set(repoPaths.map(normalizePath)) : undefined;

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
    // Discovery reports a missing root (see the module doc).
    if (isDocumentRootError(error)) return false;
    return true; // unrelated error — keep
  });
}
