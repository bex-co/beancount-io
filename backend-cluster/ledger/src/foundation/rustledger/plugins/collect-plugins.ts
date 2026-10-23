/**
 * The list of Beancount plugins configured in a ledger — a faithful port of the
 * `getLedgerPlugins` endpoint (`reports.py`):
 *
 *   ledger = ctx.fava_client.get_ledger(...)
 *   plugins = ledger.options.get("plugin", [])
 *   return [plugin_name for plugin_name, _plugin_config in plugins]
 *
 * i.e. the ordered list of plugin *names* declared via `plugin "..."` directives,
 * with each plugin's optional config string dropped.
 *
 * WHY A SOURCE SCAN (not the directive stream / parsed options):
 * Beancount does not model `plugin` directives as first-class entries — the
 * parser consumes them into `options_map["plugin"]`, exactly as it does
 * `option` directives (see the sibling {@link deriveBeancountOptions} in
 * `beancount-options.ts`). The rustledger WASM only surfaces `title` and
 * `operating_currencies` in `getOptions()` (see `engine.ts`), and `plugin`
 * directives never appear in `getDirectives()` (verified live against the WASM:
 * a source with `plugin "..."` lines yields an empty `custom`/`plugin` directive
 * set). So the only way to recover the plugin list is to scan the raw source,
 * replicating Beancount's lexer/grammar semantics for the `plugin` directive.
 *
 * ENTRY-POINT FILE ONLY (critical parity detail):
 * Beancount collects `plugin` (and `option`) directives ONLY from the top-level
 * entry-point file — directives of these kinds in `include`d files are silently
 * ignored (verified live: `plugin "..."` in an included file does NOT appear in
 * `options_map["plugin"]`; only the main file's plugins do). Callers therefore
 * pass the entry-point file's source (`files[entryPoint]`), NOT a concatenation
 * of every file in the ledger.
 *
 * Matching Beancount's *effective* parse behaviour (verified empirically via
 * `beancount.parser.parser.parse_string`, which populates `options_map["plugin"]`
 * at parse time regardless of whether the plugin is loadable):
 *   - `plugin "name"`                         -> `["name"]`
 *   - `plugin "name" "config"`                -> `["name"]` (config dropped)
 *   - duplicates are PRESERVED, not deduped   -> `["name", "name"]`
 *   - source order is preserved
 *   - leading whitespace is tolerated (an indented `plugin` line still applies)
 *   - whitespace between the `plugin` keyword and the string literal(s) is
 *     optional (`plugin"name"` and `plugin "name""config"` both parse)
 *   - a `;`-prefixed line is a comment and is skipped
 *   - a trailing `;` comment after the directive is allowed
 *   - trailing non-comment content invalidates the directive
 *     (`plugin "name" "config" extra` is NOT applied)
 *   - both string literals are double-quoted; embedded quotes must be escaped
 *     (`\"`), and Beancount's C-lexer string escapes are decoded
 *   - an empty name (`plugin ""`) yields `[""]` (parse-valid; only fails later at
 *     plugin *load* time, which the endpoint's options read never reaches)
 *
 * These are exactly the semantics {@link deriveBeancountOptions} implements for
 * `option` directives; this module mirrors that structure for `plugin`.
 */

/**
 * Decode Beancount's string-literal escapes as its C lexer does: the recognized
 * escapes `\n \t \r \\ \"` map to their control/literal characters; any other
 * `\<char>` sequence drops the backslash and keeps the following character.
 * (Identical to the decoder in `beancount-options.ts`.)
 */
export function decodeStringLiteral(raw: string): string {
  let out = "";
  let escaped = false;
  for (const ch of raw) {
    if (escaped) {
      if (ch === "n") out += "\n";
      else if (ch === "t") out += "\t";
      else if (ch === "r") out += "\r";
      else out += ch;
      escaped = false;
    } else if (ch === "\\") {
      escaped = true;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Match one `plugin "<name>"` or `plugin "<name>" "<config>"` directive per
 * source line and capture the (unescaped) plugin name and config.
 *
 * Mirrors {@link deriveBeancountOptions}'s `OPTION_LINE_RE` structure:
 *   - `^[ \t]*` — leading whitespace tolerated (indented directive still applies).
 *   - `plugin` — the keyword.
 *   - `[ \t]*"..."` — the required name literal, keyword/string space optional.
 *   - `(?:[ \t]*"...")?` — the optional config literal.
 *   - `[ \t]*(?:;.*)?$` — only trailing whitespace and an optional `;` comment
 *     may follow; any other trailing content fails the match (invalidating the
 *     directive, matching Beancount).
 * Each string capture stops at the first unescaped `"`.
 */
export const PLUGIN_LINE_RE =
  /^[ \t]*plugin[ \t]*"((?:[^"\\]|\\.)*)"(?:[ \t]*"((?:[^"\\]|\\.)*)")?[ \t]*(?:;.*)?$/;

/**
 * The ordered list of Beancount plugin names declared in the entry-point source,
 * matching `getLedgerPlugins` byte-for-byte.
 *
 * @param entryPointSource - The raw text of the ledger's entry-point file
 *   (`files[entryPoint]`). Plugin directives in `include`d files are ignored by
 *   Beancount, so only this file's source is scanned. `undefined`/empty yields
 *   `[]` (matching an empty or absent `options_map["plugin"]`).
 *
 * Config strings are dropped; duplicates and source order are preserved.
 */
export function collectLedgerPlugins(
  entryPointSource: string | undefined,
): string[] {
  return collectLedgerPluginDeclarations(entryPointSource).map(
    (plugin) => plugin.name,
  );
}

/**
 * {@link collectLedgerPlugins} with each plugin's config string, `null` when
 * the directive gives none: what Beancount passes the plugin as `config`.
 */
export function collectLedgerPluginDeclarations(
  entryPointSource: string | undefined,
): { name: string; config: string | null }[] {
  if (!entryPointSource) return [];
  const plugins: { name: string; config: string | null }[] = [];
  entryPointSource.split(/\r\n|\r|\n/u).forEach((line) => {
    const match = PLUGIN_LINE_RE.exec(line);
    if (!match) return;
    plugins.push({
      name: decodeStringLiteral(match[1]),
      config: match[2] === undefined ? null : decodeStringLiteral(match[2]),
    });
  });
  return plugins;
}

/** The plugins `beancount.plugins.pedantic` runs, each with no config. */
const PEDANTIC_PLUGINS = new Set([
  "check_commodity",
  "coherent_cost",
  "leafonly",
  "noduplicates",
  "nounused",
  "onecommodity",
  "sellgains",
  "unique_prices",
  "check_drained",
]);

/**
 * The config of each run of Beancount's `beancount.plugins.<name>` the entry
 * point declares (`null` without one): its own declarations, and one with no
 * config per `pedantic`, which runs its plugins with none.
 */
export function beancountPluginRuns(
  entryPointSource: string | undefined,
  name: string,
): (string | null)[] {
  return collectLedgerPluginDeclarations(entryPointSource).flatMap((plugin) => {
    if (plugin.name === `beancount.plugins.${name}`) return [plugin.config];
    return plugin.name === "beancount.plugins.pedantic" &&
      PEDANTIC_PLUGINS.has(name)
      ? [null]
      : [];
  });
}
