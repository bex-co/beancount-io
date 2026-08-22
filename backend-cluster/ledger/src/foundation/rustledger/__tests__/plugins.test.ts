import { collectLedgerPlugins } from "@/foundation/rustledger/plugins";
import golden from "./plugins.golden.json";

/**
 * GOLDEN VALUES (plugins.golden.json) were produced by the REAL beancount 3.2.0
 * parser via the in-repo venv — the exact list `getLedgerPlugins` returns
 * (`ledger.options.get("plugin", [])`, config dropped):
 *
 *   cd backend-cluster/beancount-ledger
 *   ./.venv/bin/python -c "
 *     from beancount.parser import parser
 *     _e, _err, options_map = parser.parse_string(SOURCE)
 *     print([name for name, cfg in options_map.get('plugin', [])])"
 *
 * `collectLedgerPlugins` scans the raw entry-point source (the WASM does not
 * surface `plugin` directives — it only exposes `title`/`operating_currencies`
 * in `getOptions()`; verified live), so each case below feeds the same SOURCE
 * string the golden was captured from.
 */

const SOURCES: Record<keyof typeof golden & string, string> = {
  _comment: "",
  single: 'plugin "beancount.plugins.auto_accounts"\n',
  with_config: 'plugin "beancount.plugins.leafonly" "config-string"\n',
  multiple:
    'plugin "beancount.plugins.auto_accounts"\nplugin "beancount.plugins.leafonly"\n',
  duplicate: 'plugin "p.a"\nplugin "p.a"\n',
  indented: '  plugin "p.indented"\n',
  comment_line: '; plugin "p.commented"\nplugin "p.real"\n',
  trailing_comment: 'plugin "p.real" ; a comment\n',
  trailing_junk: 'plugin "p.a" "cfg" extra\n',
  empty: "2020-01-01 open Assets:Checking\n",
  empty_name: 'plugin ""\n',
};

describe("collectLedgerPlugins", () => {
  const cases = (
    Object.keys(golden) as Array<keyof typeof golden & string>
  ).filter((key) => key !== "_comment");

  it.each(cases)("matches the beancount golden for %s", (key) => {
    expect(collectLedgerPlugins(SOURCES[key])).toEqual(golden[key]);
  });

  it("returns [] for undefined/empty source", () => {
    expect(collectLedgerPlugins(undefined)).toEqual([]);
    expect(collectLedgerPlugins("")).toEqual([]);
  });

  it("only scans the entry-point source it is given (included files ignored)", () => {
    // Beancount collects `plugin` directives only from the top-level file; the
    // caller therefore passes files[entryPoint], never a concatenation. A source
    // with no plugin lines yields [].
    expect(collectLedgerPlugins('include "accounts.bean"\n')).toEqual([]);
  });

  it("decodes escaped quotes in the plugin name", () => {
    expect(collectLedgerPlugins('plugin "a\\"b"\n')).toEqual(['a"b']);
  });

  it("tolerates no space between the keyword and the name literal", () => {
    expect(collectLedgerPlugins('plugin"p.nospace"\n')).toEqual(["p.nospace"]);
  });
});
