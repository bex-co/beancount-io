import type { BeancountError } from "@rustledger/wasm";
import { explainUnknownPlugins } from "../plugin-typos";

// w21/902: a misspelled built-in plugin read as a missing engine feature.
const error = (name: string): BeancountError => ({
  message: `Python plugin "${name}" requires the python-plugins feature`,
  code: "E8005",
  phase: "validate",
  hint: null,
  file: "main.bean",
  line: 3,
  column: 1,
  end_line: null,
  end_column: null,
  severity: "error",
});

describe("explainUnknownPlugins", () => {
  it("names a typo as unknown and suggests the plugin it is near", () => {
    const [result] = explainUnknownPlugins([
      error("beancount.plugins.auto_acounts"),
    ]);
    expect(result!.message).toBe(
      'Unknown plugin "beancount.plugins.auto_acounts": Beancount.io can\'t run this plugin',
    );
    expect(result!.hint).toBe(
      'Did you mean "beancount.plugins.auto_accounts"?',
    );
    expect([result!.file, result!.line, result!.code]).toEqual([
      "main.bean",
      3,
      "E8005",
    ]);
  });

  it("offers no suggestion for a name near nothing", () => {
    const [result] = explainUnknownPlugins([
      error("beancount.plugins.zzzzzzzzzzzz"),
    ]);
    expect(result!.message.startsWith("Unknown plugin")).toBe(true);
    expect(result!.hint).toBe(null);
  });

  it("leaves a real plugin and other modules as the engine said", () => {
    const real = error("beancount.plugins.check_closing");
    const mine = error("my_plugins.rules");
    expect(explainUnknownPlugins([real, mine])).toEqual([real, mine]);
  });
});
