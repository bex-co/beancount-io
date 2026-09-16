import type { BeancountError } from "@rustledger/wasm";
import { config } from "@/config";
import { parseManagedPriceUrl } from "@/foundation/managed-prices/managed-price-policy";
import {
  extractIncludeDeclarations,
  isUrlIncludeTarget,
  resolveIncludeTarget,
} from "./file-map-loader";

const ENGINE_READ_FAILURE = "failed to read file ";

/**
 * The message for a URL include the engine could not find. An allowed managed
 * price URL is missing only when no validated revision exists yet (the loader
 * overlays every source that has one, ADR 015 section 10); the per-source
 * status carries the cause. Any other URL is not something the service will
 * ever fetch, and the message says why.
 */
function urlIncludeMessage(
  target: string,
  origins: readonly string[],
): string {
  const decision = parseManagedPriceUrl(target, origins);
  if (decision.allowed) {
    return `include "${target}": managed price source is unavailable; no validated price feed could be fetched yet (see the ledger's managed price status)`;
  }
  return `include "${target}": not an allowed managed price source (${decision.detail}); include targets must be paths inside the ledger repository or an allowed managed price URL`;
}

/**
 * Name a URL include the way the user wrote it.
 *
 * rustledger resolves `include "https://host/p"` like any path: joined to the
 * including file's directory and normalized, so it reports
 * `failed to read file https:/host/p` with no file or line. That names a path
 * absent from the ledger. The engine's report is replaced with one that
 * quotes the target, points at the `include` line, and says whether the URL
 * is a managed price source that is currently unavailable or not an allowed
 * source at all.
 */
export function reportUrlIncludes(
  errors: BeancountError[],
  files: Readonly<Record<string, string>>,
  origins: readonly string[] = config.managedPrices.origins,
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
          message: urlIncludeMessage(include.target, origins),
          file: include.file,
          line: include.line,
        };
      }
    }
    return error;
  });
}
