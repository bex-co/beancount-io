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
/**
 * Directives a plugin or the pad pass made from another one: a copy shares its
 * source's identity (so a click on it reaches the source's text), which is why
 * a client has to be told it is a copy before offering to edit or delete it.
 * A directive a plugin only rewrites in place (links, tags) is not one. A
 * document found in an `option "documents"` folder has no source text at all,
 * and is marked too (w21/738).
 */
const generatedDirectives = new WeakSet<DirectiveJson>();

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
  // A rewrite of a copy (a link added to it) is still a copy.
  if (generatedDirectives.has(source)) generatedDirectives.add(output);
}

/** Record that `output` was generated from the directive it inherited its source from. */
export function markGeneratedDirective(output: DirectiveJson): void {
  generatedDirectives.add(output);
}

/** Whether a directive is a copy a plugin or the pad pass generated. */
export function isGeneratedDirective(directive: DirectiveJson): boolean {
  return generatedDirectives.has(directive);
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

/** Serialize which directives are generated copies, parallel to the input. */
export function captureGeneratedDirectives(
  directives: readonly DirectiveJson[],
): boolean[] {
  return directives.map((directive) => generatedDirectives.has(directive));
}

/** Restore the generated marks on the fresh objects created by postMessage. */
export function restoreGeneratedDirectives(
  directives: readonly DirectiveJson[],
  captured: readonly boolean[],
): void {
  directives.forEach((directive, index) => {
    if (captured[index] === true) generatedDirectives.add(directive);
  });
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

/** Serialize source locations, parallel to the input, across a worker clone. */
export function captureDirectiveSourceLocations(
  directives: readonly DirectiveJson[],
): Array<DirectiveSourceLocation | null> {
  return directives.map((directive) => sourceLocations.get(directive) ?? null);
}

/** Restore source locations on the fresh directive objects from postMessage. */
export function restoreDirectiveSourceLocations(
  directives: readonly DirectiveJson[],
  captured: readonly (DirectiveSourceLocation | null)[],
): void {
  directives.forEach((directive, index) => {
    const location = captured[index];
    if (location !== undefined && location !== null)
      sourceLocations.set(directive, location);
  });
}
