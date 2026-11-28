import type { FileMap } from "@rustledger/wasm";
import {
  neutralizeIncludedOptionsAndPlugins,
  runPluginBundlesAsMembers,
  stripFavaPlugins,
  stripUnavailablePlugins,
} from "../strip";

describe("stripFavaPlugins", () => {
  it("blanks fava.plugins.* lines in place, keeps native plugins, preserves line numbers", () => {
    const source = [
      'option "title" "My Ledger"', // line 1
      'plugin "beancount.plugins.auto_accounts"', // line 2 (native — keep)
      'plugin "fava.plugins.amortize_over"', // line 3 (fava — strip)
      'plugin "fava.plugins.link_documents" "cfg"', // line 4 (fava + config — strip)
      "", // line 5
      "2020-01-01 open Assets:Cash", // line 6
    ].join("\n");
    const files: FileMap = { "main.bean": source };

    const { strippedFiles, stripped } = stripFavaPlugins(files, "main.bean");

    expect(stripped).toEqual([
      { name: "fava.plugins.amortize_over", line: 3 },
      { name: "fava.plugins.link_documents", line: 4 },
    ]);
    const out = strippedFiles["main.bean"].split("\n");
    expect(out).toHaveLength(6); // line count (and thus line numbers) preserved
    expect(out[1]).toBe('plugin "beancount.plugins.auto_accounts"'); // native untouched
    expect(out[2]).toBe(""); // amortize blanked
    expect(out[3]).toBe(""); // link_documents blanked
    expect(out[5]).toBe("2020-01-01 open Assets:Cash");
  });

  // w31/099: Beancount skips a whole line starting with any of `*#:!&?%`,
  // and a `"` on it opens no string, so the plugin after it is still read.
  it.each(
    ["*", "#", ":", "!", "&", "?", "%"].flatMap((start) => [
      [start, "without a quote", ""],
      [start, "with an unmatched quote", ' 5"'],
    ]),
  )("strips the plugin after a %s line %s", (start, _case, quote) => {
    const files: FileMap = {
      "main.bean": `${start} a note${quote}\nplugin "fava.plugins.amortize_over"\n`,
    };
    const { strippedFiles, stripped } = stripFavaPlugins(files, "main.bean");
    expect(stripped).toEqual([{ name: "fava.plugins.amortize_over", line: 2 }]);
    expect(strippedFiles["main.bean"]).toBe(`${start} a note${quote}\n\n`);
  });

  it("returns the same FileMap reference when there is nothing to strip", () => {
    const files: FileMap = {
      "main.bean":
        'plugin "beancount.plugins.auto_accounts"\n2020-01-01 open Assets:Cash\n',
    };
    const result = stripFavaPlugins(files, "main.bean");
    expect(result.stripped).toEqual([]);
    expect(result.strippedFiles).toBe(files);
  });

  it("only scans the entry-point file", () => {
    const files: FileMap = {
      "main.bean": 'include "included.bean"',
      "included.bean": 'plugin "fava.plugins.amortize_over"',
    };
    const { strippedFiles, stripped } = stripFavaPlugins(files, "main.bean");
    expect(stripped).toEqual([]);
    expect(strippedFiles["included.bean"]).toBe(
      'plugin "fava.plugins.amortize_over"',
    );
  });

  it("returns the same reference when the entry point is absent", () => {
    const files: FileMap = { "other.bean": "" };
    const result = stripFavaPlugins(files, "main.bean");
    expect(result.strippedFiles).toBe(files);
    expect(result.stripped).toEqual([]);
  });
});

describe("stripUnavailablePlugins", () => {
  it("blanks the qualified alias and reports its original source line", () => {
    const files = {
      "main.bean": [
        'plugin "unrealized"',
        'plugin "beancount.plugins.implicit_prices"',
        '  plugin "beancount.plugins.unrealized" "Unrealized" ; legacy',
        "2026-01-01 open Assets:Cash",
      ].join("\n"),
    };

    const result = stripUnavailablePlugins(files, "main.bean");
    expect(result.strippedFiles["main.bean"].split("\n")).toEqual([
      'plugin "unrealized"',
      'plugin "beancount.plugins.implicit_prices"',
      "",
      "2026-01-01 open Assets:Cash",
    ]);
    expect(result.errors).toMatchObject([
      { code: "E8005", severity: "error", file: "main.bean", line: 3 },
    ]);
  });

  it("leaves plugin text in comments, quoted content and included files alone", () => {
    const plugin = 'plugin "beancount.plugins.unrealized"';
    const files = {
      "main.bean": [
        `; ${plugin}`,
        '2026-01-01 note Assets:Cash "continued',
        plugin,
        'text"',
        'include "included.bean"',
      ].join("\n"),
      "included.bean": plugin,
    };
    const result = stripUnavailablePlugins(files, "main.bean");
    expect(result.strippedFiles).toBe(files);
    expect(result.errors).toEqual([]);
  });
});

// w31/155: the engine has no `auto`, and its `pedantic` runs no check_drained.
describe("runPluginBundlesAsMembers", () => {
  const rewrite = (...lines: string[]) =>
    runPluginBundlesAsMembers({ "main.bean": lines.join("\n") }, "main.bean")[
      "main.bean"
    ]!.split("\n");

  it("runs auto as auto_accounts then implicit_prices, keeping every line", () => {
    expect(
      rewrite('plugin "beancount.plugins.auto"', "2026-01-01 open Assets:Cash"),
    ).toEqual([
      "",
      "2026-01-01 open Assets:Cash",
      'plugin "beancount.plugins.auto_accounts"',
      'plugin "beancount.plugins.implicit_prices"',
    ]);
  });

  it("adds check_drained after pedantic, before the plugins declared after it", () => {
    expect(
      rewrite(
        'plugin "beancount.plugins.leafonly"',
        'plugin "beancount.plugins.pedantic"',
        "2026-01-01 open Assets:Cash",
        '  plugin "beancount.plugins.close_tree" ; closes children',
        "2026-01-02 open Assets:Bank",
      ),
    ).toEqual([
      'plugin "beancount.plugins.leafonly"',
      "",
      "2026-01-01 open Assets:Cash",
      "",
      "2026-01-02 open Assets:Bank",
      'plugin "beancount.plugins.pedantic"',
      'plugin "beancount.plugins.check_drained"',
      '  plugin "beancount.plugins.close_tree" ; closes children',
    ]);
  });

  it("gives each member the bundle's config, as Beancount does", () => {
    expect(rewrite('plugin "beancount.plugins.auto" "a\\"b"')).toEqual([
      "",
      'plugin "beancount.plugins.auto_accounts" "a\\"b"',
      'plugin "beancount.plugins.implicit_prices" "a\\"b"',
    ]);
  });

  it("leaves a ledger without a bundle, or one in a string or comment, as it is", () => {
    for (const source of [
      'plugin "beancount.plugins.auto_accounts"\n',
      '; plugin "beancount.plugins.auto"\n',
      '2026-01-01 note Assets:Cash "a\nplugin "beancount.plugins.auto"\nb"\n',
      // Appended inside the open string, the members would not run.
      'plugin "beancount.plugins.pedantic"\n2026-01-01 note Assets:Cash "open\n',
    ]) {
      const files: FileMap = { "main.bean": source };
      expect(runPluginBundlesAsMembers(files, "main.bean")).toBe(files);
    }
  });

  it("reads plugins only from the entry point", () => {
    const files: FileMap = {
      "main.bean": 'include "other.bean"\n',
      "other.bean": 'plugin "beancount.plugins.auto"\n',
    };
    expect(runPluginBundlesAsMembers(files, "main.bean")).toBe(files);
  });
});

describe("neutralizeIncludedOptionsAndPlugins (#4)", () => {
  it("blanks option/plugin lines in INCLUDED files, preserving line numbers", () => {
    const files: FileMap = {
      "main.bean": 'include "opts.bean"\n2024-01-01 open Assets:Cash',
      "opts.bean": [
        'option "name_assets" "Actif"', // line 1 — blank
        'plugin "fava.plugins.amortize_over"', // line 2 — blank
        "2023-06-01 open Assets:Cash", // line 3 — keep (a real directive)
      ].join("\n"),
    };
    const out = neutralizeIncludedOptionsAndPlugins(files, "main.bean");
    const opts = out["opts.bean"].split("\n");
    expect(opts).toHaveLength(3); // line numbers preserved
    expect(opts[0]).toBe(""); // included option neutralized
    expect(opts[1]).toBe(""); // included plugin neutralized
    expect(opts[2]).toBe("2023-06-01 open Assets:Cash"); // real directive untouched
    // The entry point's own option/plugin directives are authoritative — untouched.
    expect(out["main.bean"]).toBe(files["main.bean"]);
  });

  it("never touches the entry-point file's option/plugin directives", () => {
    const files: FileMap = {
      "main.bean": 'option "name_assets" "Actif"\ninclude "a.bean"',
      "a.bean": "2024-01-01 open Assets:Cash",
    };
    const out = neutralizeIncludedOptionsAndPlugins(files, "main.bean");
    // Nothing to neutralize in a.bean → same FileMap reference returned.
    expect(out).toBe(files);
    expect(out["main.bean"]).toContain('option "name_assets" "Actif"');
  });

  it("returns the same reference when no included file has option/plugin lines", () => {
    const files: FileMap = {
      "main.bean": 'include "a.bean"',
      "a.bean":
        '2024-01-01 open Assets:Cash\n2024-01-02 * "x"\n  Assets:Cash 1 USD\n  Income:Y',
    };
    expect(neutralizeIncludedOptionsAndPlugins(files, "main.bean")).toBe(files);
  });
});
