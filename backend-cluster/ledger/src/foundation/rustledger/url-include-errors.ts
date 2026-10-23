import type { BeancountError } from "@rustledger/wasm";
import { config } from "@/config";
import { parseManagedPriceUrl } from "@/foundation/managed-prices/managed-price-policy";
import {
  extractIncludeDeclarations,
  isUrlIncludeTarget,
  resolveIncludeTarget,
} from "./file-map-loader";
import { loadedFiles } from "./source-slice";
import { PLUGIN_LINE_RE, decodeStringLiteral } from "./plugins/collect-plugins";

const ENGINE_READ_FAILURE = "failed to read file ";

/**
 * The message for a URL include the engine could not find. An allowed managed
 * price URL is missing only when no validated revision exists yet (the loader
 * overlays every source that has one, ADR 015 section 10); the per-source
 * status carries the cause. Any other URL is not something the service will
 * ever fetch, and the message says why.
 */
function urlIncludeMessage(target: string, origins: readonly string[]): string {
  const decision = parseManagedPriceUrl(target, origins);
  if (decision.allowed) {
    return `include "${target}": managed price source is unavailable; no validated price feed could be fetched yet (see the ledger's managed price status)`;
  }
  return `include "${target}": not an allowed managed price source (${decision.detail}); include targets must be paths inside the ledger repository or an allowed managed price URL`;
}

/**
 * Name an include the way the user wrote it, and say where it is.
 *
 * rustledger resolves `include "https://host/p"` like any path: joined to the
 * including file's directory and normalized, so it reports
 * `failed to read file https:/host/p` with no file or line. That names a path
 * absent from the ledger. The engine's report is replaced with one that
 * quotes the target, points at the `include` line, and says whether the URL
 * is a managed price source that is currently unavailable or not an allowed
 * source at all. A missing plain path gets the same treatment: located at its
 * `include` line, reading "Included file not found: <as written>" (w21/189).
 *
 * Each include of a target gets an error of its own: the k-th the engine
 * reports for it goes to its k-th `include`, read only in the files the entry
 * point loads. Every one went to the first include in the repository, so a
 * second was never pointed to, and a file the ledger does not read could be
 * blamed (w21/772).
 */
export function reportUrlIncludes(
  errors: BeancountError[],
  files: Readonly<Record<string, string>>,
  entryPoint: string,
  origins: readonly string[] = config.managedPrices.origins,
): BeancountError[] {
  const urlIncludes = new Map<
    string,
    { file: string; line: number; target: string; url: boolean }[]
  >();
  for (const file of loadedFiles(files, entryPoint)) {
    for (const { target, line } of extractIncludeDeclarations(files[file]!)) {
      // The key the engine reports: the same join-and-normalize it applies.
      const engineKey = resolveIncludeTarget(file, target);
      urlIncludes.set(engineKey, [
        ...(urlIncludes.get(engineKey) ?? []),
        { file, line, target, url: isUrlIncludeTarget(target) },
      ]);
    }
  }
  if (urlIncludes.size === 0) return errors;

  const reported = new Map<string, number>();
  return errors.map((error) => {
    if (error.code !== "LOAD" || !error.message.startsWith(ENGINE_READ_FAILURE))
      return error;
    const rest = error.message.slice(ENGINE_READ_FAILURE.length);
    for (const [engineKey, declared] of urlIncludes) {
      if (rest.startsWith(`${engineKey}: `)) {
        const count = reported.get(engineKey) ?? 0;
        reported.set(engineKey, count + 1);
        const include = declared[Math.min(count, declared.length - 1)]!;
        return {
          ...error,
          // A plain path is just a file that is not in the repository: the
          // engine's "file not found in virtual filesystem: <resolved path>"
          // named neither what the user typed nor where (w21/189).
          message: include.url
            ? urlIncludeMessage(include.target, origins)
            : `Included file not found: ${include.target}`,
          file: include.file,
          line: include.line,
        };
      }
    }
    return error;
  });
}

const GLOB_UNMATCHED = /^include pattern "(.*)" does not match any files$/u;
const DUPLICATE_INCLUDE = /^Duplicate filename parsed: "(.*)"$/u;
const PYTHON_PLUGIN =
  /^Python plugin "(.*)" requires the python-plugins feature$/u;

/**
 * Put the engine's other include and plugin errors on the line they are
 * about. A glob matching nothing, a file included twice and a Python plugin
 * the engine cannot run came with no file or line, so their Notifications row
 * could not be opened and the file's editor banner never listed them
 * (w21/773). An unmatched pattern goes to its `include`, a duplicate to the
 * second `include` of its file, read only in the files the entry point loads;
 * a plugin to its `plugin` line in the entry point, the one file Beancount
 * reads plugins from.
 */
export function locateIncludeAndPluginErrors(
  errors: BeancountError[],
  files: Readonly<Record<string, string>>,
  entryPoint: string,
): BeancountError[] {
  const located = (error: BeancountError) =>
    error.file !== null && error.file !== undefined;
  if (
    !errors.some(
      (error) =>
        !located(error) &&
        (GLOB_UNMATCHED.test(error.message) ||
          DUPLICATE_INCLUDE.test(error.message) ||
          PYTHON_PLUGIN.test(error.message)),
    )
  ) {
    return errors;
  }
  const includes = loadedFiles(files, entryPoint).flatMap((file) =>
    extractIncludeDeclarations(files[file]!).map((include) => ({
      file,
      line: include.line,
      target: include.target,
      resolved: resolveIncludeTarget(file, include.target),
    })),
  );
  const pluginLines = new Map<string, number>();
  (files[entryPoint] ?? "").split(/\r\n|\r|\n/u).forEach((text, index) => {
    const name = PLUGIN_LINE_RE.exec(text)?.[1];
    if (name !== undefined) {
      const plugin = decodeStringLiteral(name);
      if (!pluginLines.has(plugin)) pluginLines.set(plugin, index + 1);
    }
  });
  const at = (place: { file: string; line: number } | undefined) =>
    place === undefined ? null : place;

  return errors.map((error) => {
    if (located(error)) return error;
    let place: { file: string; line: number } | null = null;
    const glob = GLOB_UNMATCHED.exec(error.message);
    const duplicate = DUPLICATE_INCLUDE.exec(error.message);
    const plugin = PYTHON_PLUGIN.exec(error.message);
    if (glob) {
      place = at(
        includes.find(
          (include) =>
            include.target === glob[1] || include.resolved === glob[1],
        ),
      );
    } else if (duplicate) {
      place = at(
        includes.filter((include) => include.resolved === duplicate[1])[1],
      );
    } else if (plugin) {
      const line = pluginLines.get(plugin[1]!);
      place = line === undefined ? null : { file: entryPoint, line };
    }
    return place === null
      ? error
      : { ...error, file: place.file, line: place.line, column: 1 };
  });
}
