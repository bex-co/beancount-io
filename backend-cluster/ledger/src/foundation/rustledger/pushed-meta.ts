import type { DirectiveJson, FileMap } from "@rustledger/wasm";
import { buildEntryIdMap } from "./entry-hash";
import { splitIntoBlocks } from "./source-slice";

/** A block that is a `pushmeta`/`popmeta` statement. */
const META_STACK_RE = /^(?:pushmeta|popmeta)[^\S\r\n]/u;
/** Any line that may start one, to skip files without a stack. */
const META_STACK_LINE_RE = /^(?:pushmeta|popmeta)[^\S\r\n]/mu;
/** A pushed key; the lexer's key has two characters at least (w23/237). */
const PUSHED_KEY_RE = /^pushmeta[^\S\r\n]+([a-z][A-Za-z0-9_-]+):/gmu;

/**
 * Whether a file pushes a key that one of its indented lines also writes, so
 * an entry may set a key its open `pushmeta` holds. Cheap and loose: a
 * posting's key or a key outside the scope is a false positive, which only
 * costs the second parse.
 */
export function sourceMayShadowPushedMeta(files: FileMap): boolean {
  return Object.values(files).some((source) => {
    const keys = [...source.matchAll(PUSHED_KEY_RE)].map(([, key]) => key);
    if (keys.length === 0) return false;
    return new RegExp(`^[ \\t]+(?:${keys.join("|")}):`, "mu").test(source);
  });
}

/** `files` with every `pushmeta`/`popmeta` statement blanked, line for line. */
export function withoutMetaStacks(files: FileMap): FileMap {
  return Object.fromEntries(
    Object.entries(files).map(([file, source]) => {
      if (!META_STACK_LINE_RE.test(source)) return [file, source];
      const lines = source.split("\n");
      for (const block of splitIntoBlocks(source)) {
        if (!META_STACK_RE.test(block.text)) continue;
        for (let line = block.startLine; line < block.endLine; line += 1) {
          lines[line] = "";
        }
      }
      return [file, lines.join("\n")];
    }),
  );
}

/**
 * Give each entry back the value of every key it writes itself, read from a
 * parse of the same files without their `pushmeta` statements
 * ({@link withoutMetaStacks}). Beancount sets an entry's pushed keys first
 * and its own on top, so inside `pushmeta k: "pushed"` an entry that writes
 * `k: "own"` keeps `"own"`. rustledger 0.24 applies the stack last, so the
 * pushed value won on every read and BQL `entry_meta` (w31/028). Upstream
 * fixed that in 593b7d46 (#2853), which no release holds yet. Once a bump
 * brings it, both parses agree, and this pass and its second parse can go.
 *
 * Every value comes from the engine; the two parses differ only in metadata,
 * which the entry hash excludes, so the same entry ID names one entry in both.
 * Updated in place: the directives are this parse's own, not yet shared.
 */
export function keepOwnMetaOverPushed(
  directives: DirectiveJson[],
  unpushed: DirectiveJson[],
): void {
  const ownMeta = new Map<string, NonNullable<DirectiveJson["meta"]>>();
  for (const [directive, id] of buildEntryIdMap(unpushed)) {
    if (directive.meta !== undefined && Object.keys(directive.meta).length > 0)
      ownMeta.set(id, directive.meta);
  }
  if (ownMeta.size === 0) return;
  for (const [directive, id] of buildEntryIdMap(directives)) {
    const own = ownMeta.get(id);
    if (own === undefined) continue;
    // A key keeps its place; only a value the push replaced changes.
    if (directive.meta === undefined) directive.meta = { ...own };
    else Object.assign(directive.meta, own);
  }
}
