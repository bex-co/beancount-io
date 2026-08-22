import type { FileMap } from "@rustledger/wasm";
import { OPTION_LINE_RE } from "../beancount-options";
import { PLUGIN_LINE_RE, decodeStringLiteral } from "./collect-plugins";

/** The python-only plugin namespace the WASM engine cannot run (emits `E8005`). */
const FAVA_PREFIX = "fava.plugins.";

export interface StrippedPlugin {
  name: string;
  /** 1-based line number of the stripped `plugin` directive in the entry-point. */
  line: number;
}

export interface StripResult {
  /** The FileMap with `fava.plugins.*` lines blanked (same ref if nothing changed). */
  strippedFiles: FileMap;
  stripped: StrippedPlugin[];
}

/**
 * Blank every `plugin "fava.plugins.*"` line in the entry-point file so the WASM
 * parser does not emit `E8005: requires the python-plugins feature` (which would
 * flip `isValid()` to false). fava plugins are reimplemented in the TS post-parse
 * layer instead (see `plugins/index.ts`).
 *
 * The line is blanked **in place** (not removed) so line numbers of every other
 * directive — and therefore the source locations of any remaining errors — are
 * preserved. Native beancount plugins (e.g. `beancount.plugins.auto_accounts`)
 * never carry the `fava.plugins.` prefix and are left untouched for the WASM to
 * run. Beancount only reads `plugin` directives from the entry-point file
 * (`include`d files are ignored), so only that file is scanned.
 */
export function stripFavaPlugins(
  files: FileMap,
  entryPoint: string,
): StripResult {
  const source = files[entryPoint];
  if (source === undefined) return { strippedFiles: files, stripped: [] };

  const stripped: StrippedPlugin[] = [];
  const lines = source.split(/\r\n|\r|\n/u);
  lines.forEach((line, index) => {
    const match = PLUGIN_LINE_RE.exec(line);
    if (match === null) return;
    const name = decodeStringLiteral(match[1]);
    if (name.startsWith(FAVA_PREFIX)) {
      stripped.push({ name, line: index + 1 });
      lines[index] = "";
    }
  });

  if (stripped.length === 0) return { strippedFiles: files, stripped: [] };
  return {
    strippedFiles: { ...files, [entryPoint]: lines.join("\n") },
    stripped,
  };
}

/**
 * Neutralize every `option` and `plugin` directive in the ledger's INCLUDED
 * (non-entry-point) files, so the WASM does not apply them.
 *
 * Beancount reads `option`/`plugin` directives ONLY from the top-level
 * entry-point file — the same ones in `include`d files are silently ignored
 * (verified live; see {@link "./collect-plugins".collectLedgerPlugins}). The
 * rustledger WASM instead applies them from every file, which can invalidate an
 * otherwise-valid ledger: e.g. an included `option "name_assets" "Actif"` renames
 * the Assets root, so the entry-point's `Assets:Cash` postings fail with `E1005`
 * even though real Beancount would have ignored the included option entirely.
 *
 * Each matched directive line is blanked **in place** (not removed) so every
 * other directive's line number — and therefore the source location of any
 * remaining error — is preserved. The entry-point file is never touched (its
 * options/plugins are authoritative). A ledger with no includes, or whose
 * includes carry no option/plugin lines, is returned by reference unchanged.
 */
export function neutralizeIncludedOptionsAndPlugins(
  files: FileMap,
  entryPoint: string,
): FileMap {
  let changed = false;
  const result: FileMap = { ...files };
  for (const [path, source] of Object.entries(files)) {
    if (path === entryPoint || source === undefined) continue;
    let fileChanged = false;
    const lines = source.split(/\r\n|\r|\n/u);
    lines.forEach((line, index) => {
      if (OPTION_LINE_RE.test(line) || PLUGIN_LINE_RE.test(line)) {
        lines[index] = "";
        fileChanged = true;
      }
    });
    if (fileChanged) {
      result[path] = lines.join("\n");
      changed = true;
    }
  }
  return changed ? result : files;
}
