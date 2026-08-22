import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";
import {
  applyPlugins,
  pluginError,
  skippedPluginWarning,
  type PluginFn,
} from "../index";

/**
 * Fault isolation of {@link applyPlugins}: plugins transform USER-AUTHORED
 * ledger data, so a plugin that throws must degrade to a `phase: "plugin"`
 * ledger error — never an unhandled exception that 500s every report for the
 * ledger.
 */

const OPTS = {} as LedgerOptions;
const CTX = { today: "2099-01-01" };

const OPEN: DirectiveJson = {
  type: "open",
  date: "2024-01-01",
  account: "Assets:Cash",
  currencies: [],
} as DirectiveJson;

const APPENDED: DirectiveJson = {
  type: "open",
  date: "2024-02-01",
  account: "Assets:Savings",
  currencies: [],
} as DirectiveJson;

const EARLY: DirectiveJson = {
  type: "open",
  date: "2023-01-01",
  account: "Assets:Early",
  currencies: [],
} as DirectiveJson;

const SAME_DAY_BALANCE: DirectiveJson = {
  type: "balance",
  date: "2024-01-01",
  account: "Assets:Cash",
  amount: { number: "0", currency: "USD" },
} as DirectiveJson;

const THROWING = "fava.plugins.__test_throwing__";
const APPENDING = "fava.plugins.__test_appending__";

function registryWith(
  entries: Record<string, PluginFn>,
): Record<string, PluginFn> {
  return { ...entries };
}

describe("applyPlugins — per-plugin fault isolation", () => {
  it("ignores Object.prototype plugin names instead of invoking them", () => {
    const { directives, errors } = applyPlugins(
      ["__proto__", "constructor", "valueOf"],
      [OPEN],
      OPTS,
      CTX,
    );
    expect(directives).toEqual([OPEN]);
    expect(errors).toEqual([]);
  });

  it("converts a plugin throw into a TS_PLUGIN_FAILED plugin error instead of propagating", () => {
    const registry = registryWith({
      [THROWING]: () => {
        throw new Error("boom");
      },
    });
    const { directives, errors } = applyPlugins(
      [THROWING],
      [OPEN],
      OPTS,
      CTX,
      registry,
    );
    // The stream is exactly what it was before the failed plugin ran.
    expect(directives).toEqual([OPEN]);
    expect(errors).toHaveLength(1);
    expect(errors[0].phase).toBe("plugin");
    expect(errors[0].severity).toBe("error");
    expect(errors[0].code).toBe("TS_PLUGIN_FAILED");
    expect(errors[0].message).toContain(THROWING);
    expect(errors[0].message).toContain("boom");
  });

  it("stringifies non-Error throw values", () => {
    const registry = registryWith({
      [THROWING]: () => {
        throw "not-an-error";
      },
    });
    const { errors } = applyPlugins([THROWING], [OPEN], OPTS, CTX, registry);
    expect(errors[0].message).toContain("not-an-error");
  });

  it("keeps running later plugins after one fails, preserving their transforms and errors", () => {
    const registry = registryWith({
      [THROWING]: () => {
        throw new Error("boom");
      },
      [APPENDING]: (directives) => ({
        directives: [...directives, APPENDED],
        errors: [pluginError("appended-note", { severity: "warning" })],
      }),
    });
    const { directives, errors } = applyPlugins(
      [THROWING, APPENDING],
      [OPEN],
      OPTS,
      CTX,
      registry,
    );
    // The second plugin transformed the pre-failure stream.
    expect(directives).toEqual([OPEN, APPENDED]);
    // Both the failure and the second plugin's own error are surfaced, in order.
    expect(errors.map((error) => error.code)).toEqual([
      "TS_PLUGIN_FAILED",
      null,
    ]);
    expect(errors[1].message).toBe("appended-note");
  });

  it("preserves the existing semantics for declared-but-unregistered names (skipped silently)", () => {
    const registry = registryWith({
      [APPENDING]: (directives) => ({
        directives: [...directives, APPENDED],
        errors: [],
      }),
    });
    const { directives, errors } = applyPlugins(
      ["beancount.plugins.auto_accounts", APPENDING],
      [OPEN],
      OPTS,
      CTX,
      registry,
    );
    expect(directives).toEqual([OPEN, APPENDED]);
    expect(errors).toEqual([]);
  });

  it("sorts the full stream by Beancount entry_sortkey after each plugin", () => {
    const registry = registryWith({
      [APPENDING]: () => ({
        directives: [SAME_DAY_BALANCE, OPEN, EARLY],
        errors: [],
      }),
    });
    const { directives } = applyPlugins(
      [APPENDING],
      [OPEN],
      OPTS,
      CTX,
      registry,
    );

    expect(directives).toEqual([EARLY, OPEN, SAME_DAY_BALANCE]);
  });
});

describe("skippedPluginWarning", () => {
  it("suggests a nearby handled plugin name for likely typos", () => {
    const warning = skippedPluginWarning(
      "fava.plugins.amortize_ovr",
      3,
      "main.bean",
    );
    expect(warning.hint).toContain('"fava.plugins.amortize_over"');
  });

  it("keeps the generic remediation for unrelated plugin names", () => {
    const warning = skippedPluginWarning(
      "fava.plugins.custom_reporting",
      3,
      "main.bean",
    );
    expect(warning.hint).toMatch(/Reimplement this plugin/);
  });
});
