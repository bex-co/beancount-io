import type { BeancountError } from "@rustledger/wasm";
import {
  extractIncludeDeclarations,
  isUrlIncludeTarget,
  resolveIncludeTarget,
} from "./file-map-loader";

const ENGINE_READ_FAILURE = "failed to read file ";

/**
 * Name a URL include the way the user wrote it.
 *
 * rustledger resolves `include "https://host/p"` like any path: joined to the
 * including file's directory and normalized, so it reports
 * `failed to read file https:/host/p` with no file or line. That names a path
 * absent from the ledger. Includes are repository paths and nothing fetches a
 * remote target, so the engine's report is replaced with one that quotes the
 * target and points at the `include` line.
 */
export function reportUrlIncludes(
  errors: BeancountError[],
  files: Readonly<Record<string, string>>,
): BeancountError[] {
  const urlIncludes = new Map<
    string,
    { file: string; line: number; target: string }
  >();
  for (const [file, content] of Object.entries(files)) {
    for (const { target, line } of extractIncludeDeclarations(content)) {
      if (!isUrlIncludeTarget(target)) continue;
      // The key the engine reports: the same join-and-normalize it applies.
      const engineKey = resolveIncludeTarget(file, target);
      if (!urlIncludes.has(engineKey)) {
        urlIncludes.set(engineKey, { file, line, target });
      }
    }
  }
  if (urlIncludes.size === 0) return errors;

  return errors.map((error) => {
    if (error.code !== "LOAD" || !error.message.startsWith(ENGINE_READ_FAILURE))
      return error;
    const rest = error.message.slice(ENGINE_READ_FAILURE.length);
    for (const [engineKey, include] of urlIncludes) {
      if (rest.startsWith(`${engineKey}: `)) {
        return {
          ...error,
          message: `include "${include.target}": include targets must be paths inside the ledger repository; remote URLs are not supported`,
          file: include.file,
          line: include.line,
        };
      }
    }
    return error;
  });
}
