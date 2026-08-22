import type { DirectiveJson } from "@rustledger/wasm";
import { buildEntryIdMap } from "../entry-hash";

export interface DirectiveSourceLocation {
  /** Repository-relative file containing the original source directive. */
  filename: string;
  /** One-based line number of the directive's source block. */
  lineno: number;
}

/**
 * Source identity carried across post-parse plugin rewrites. A WeakMap keeps the
 * provenance internal (it never leaks into Beancount metadata/JSON) and lets the
 * cached directive objects be collected normally.
 */
const sourceIds = new WeakMap<DirectiveJson, string>();
const sourceLocations = new WeakMap<DirectiveJson, DirectiveSourceLocation>();

/** Seed source IDs and optional locations on the raw pre-plugin stream. */
export function seedDirectiveSourceIds(
  directives: DirectiveJson[],
  locationsById?: ReadonlyMap<string, DirectiveSourceLocation>,
): void {
  const ids = buildEntryIdMap(directives);
  directives.forEach((directive) => {
    const id = ids.get(directive);
    if (id === undefined) return;
    sourceIds.set(directive, id);
    const location = locationsById?.get(id);
    if (location !== undefined) sourceLocations.set(directive, location);
  });
}

/** Copy a directive's original source identity onto a plugin-generated clone. */
export function inheritDirectiveSourceId(
  source: DirectiveJson,
  output: DirectiveJson,
): void {
  const id = sourceIds.get(source);
  if (id !== undefined) sourceIds.set(output, id);
  const location = sourceLocations.get(source);
  if (location !== undefined) sourceLocations.set(output, location);
}

/** Original pre-plugin entry ID for a directive, when it has source provenance. */
export function getDirectiveSourceId(
  directive: DirectiveJson,
): string | undefined {
  return sourceIds.get(directive);
}

/** Original source file/line for a directive, including plugin-generated clones. */
export function getDirectiveSourceLocation(
  directive: DirectiveJson,
): DirectiveSourceLocation | undefined {
  return sourceLocations.get(directive);
}

/** Serialize provenance before directives cross a worker structured clone. */
export function captureDirectiveSourceIds(
  directives: readonly DirectiveJson[],
): Array<string | null> {
  return directives.map((directive) => sourceIds.get(directive) ?? null);
}

/** Restore provenance on the fresh directive objects created by postMessage. */
export function restoreDirectiveSourceIds(
  directives: readonly DirectiveJson[],
  captured: readonly (string | null)[],
): void {
  directives.forEach((directive, index) => {
    const id = captured[index];
    if (id !== undefined && id !== null) sourceIds.set(directive, id);
  });
}
