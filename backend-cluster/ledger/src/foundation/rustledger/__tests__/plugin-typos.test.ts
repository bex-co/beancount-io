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

  // w1/208: a bare name the engine does not know came as E8001 "Plugin not
  // found" and was dropped as a missing document, so the typo went unreported.
  it("names an unknown bare plugin and suggests the native one it is near", () => {
    const notFound = (name: string): BeancountError => ({
      ...error(name),
      code: "E8001",
      message: `Plugin not found: "${name}"`,
    });
    const [typo, unknown] = explainUnknownPlugins([
      notFound("noduplicate"),
      notFound("qa_nonexistent_plugin"),
    ]);
    expect(typo).toMatchObject({
      message:
        'Unknown plugin "noduplicate": Beancount.io can\'t run this plugin',
      hint: 'Did you mean "noduplicates"?',
      code: "E8001",
      file: "main.bean",
      line: 3,
    });
    expect(unknown).toMatchObject({
      message:
        'Unknown plugin "qa_nonexistent_plugin": Beancount.io can\'t run this plugin',
      hint: null,
    });
  });
});
