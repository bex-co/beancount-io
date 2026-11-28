import type { BeancountError, FileMap } from "@rustledger/wasm";
import { OPTION_LINE_RE } from "../beancount-options";
import { isSkippedLine } from "../parseable-files";
import { endsInsideString } from "../source-slice";
import { PLUGIN_LINE_RE, decodeStringLiteral } from "./collect-plugins";
import { pluginError } from "./types";

/** The python-only plugin namespace the WASM engine cannot run (emits `E8005`). */
const FAVA_PREFIX = "fava.plugins.";
const UNAVAILABLE_UNREALIZED = "beancount.plugins.unrealized";

interface StrippedPlugin {
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
  return stripPluginLines(files, entryPoint, (name) =>
    name.startsWith(FAVA_PREFIX),
  );
}

/** Beancount 3 removed this plugin. Rustledger's alias only emits warnings. */
export function stripUnavailablePlugins(
  files: FileMap,
  entryPoint: string,
): { strippedFiles: FileMap; errors: BeancountError[] } {
  const { strippedFiles, stripped } = stripPluginLines(
    files,
    entryPoint,
    (name) => name === UNAVAILABLE_UNREALIZED,
  );
  return {
    strippedFiles,
    errors: stripped.map(({ name, line }) =>
      pluginError(`Unavailable plugin "${name}" in Beancount 3`, {
        code: "E8005",
        file: entryPoint,
        line,
        hint: "The Balance Sheet's At Market Value view shows unrealized gains under Equity:Unrealized by default.",
      }),
    ),
  };
}

/**
 * What the engine runs for each of Beancount's two plugin bundles: `auto` is
 * `auto_accounts` then `implicit_prices`, and `pedantic` ends with
 * `check_drained`, which the engine's own `pedantic` leaves out.
 */
const BUNDLE_MEMBERS = new Map([
  [
    "beancount.plugins.auto",
    ["beancount.plugins.auto_accounts", "beancount.plugins.implicit_prices"],
  ],
  [
    "beancount.plugins.pedantic",
    ["beancount.plugins.pedantic", "beancount.plugins.check_drained"],
  ],
]);

/**
 * Run Beancount's `auto` and `pedantic` bundles as their plugins. The engine
 * has no `auto`, so it refused the plugin with E8005 and opened no account,
 * and its `pedantic` runs no `check_drained`, so closing an account that
 * still held money read clean (w31/155). Each member gets the bundle's
 * config, as Beancount passes it to every member.
 *
 * Plugins run in the order declared, and every other line must keep its
 * number, so the bundle and each plugin line after it are blanked in place
 * and written again, in order and with the bundle expanded, after the file's
 * last line. A file that ends inside a string is left as it is.
 */
export function runPluginBundlesAsMembers(
  files: FileMap,
  entryPoint: string,
): FileMap {
  const source = files[entryPoint];
  if (source === undefined) return files;
  const lines = source.split(/\r\n|\r|\n/u);
  const moved: string[] = [];
  let inString = false;
  lines.forEach((line, index) => {
    if (!inString && isSkippedLine(line)) return;
    const startsInsideString = inString;
    inString = endsInsideString(line, inString);
    const match = startsInsideString ? null : PLUGIN_LINE_RE.exec(line);
    if (match === null) return;
    const members = BUNDLE_MEMBERS.get(decodeStringLiteral(match[1]));
    if (members === undefined && moved.length === 0) return;
    const config = match[2] === undefined ? "" : ` "${match[2]}"`;
    moved.push(
      ...(members?.map((name) => `plugin "${name}"${config}`) ?? [line]),
    );
    lines[index] = "";
  });
  if (moved.length === 0 || inString) return files;
  return { ...files, [entryPoint]: [...lines, ...moved].join("\n") };
}

function stripPluginLines(
  files: FileMap,
  entryPoint: string,
  shouldStrip: (name: string) => boolean,
): StripResult {
  const source = files[entryPoint];
  if (source === undefined) return { strippedFiles: files, stripped: [] };

  const stripped: StrippedPlugin[] = [];
  const lines = source.split(/\r\n|\r|\n/u);
  let inString = false;
  lines.forEach((line, index) => {
    // A line Beancount skips whole opens no string (w31/099).
    if (!inString && isSkippedLine(line)) return;
    const startsInsideString = inString;
    inString = endsInsideString(line, inString);
    const match = startsInsideString ? null : PLUGIN_LINE_RE.exec(line);
    if (match === null) return;
    const name = decodeStringLiteral(match[1]);
    if (shouldStrip(name)) {
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
