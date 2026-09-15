import fs from "fs";
import path from "path";

/**
 * Static guardrail: every file wraps in the code editor. The component is a
 * DOM component built on ESM-only CodeMirror packages the unit runner cannot
 * load, so this reads its source. Wrapping used to share the language
 * compartment (`beancount ? language : EditorView.lineWrapping`), so Beancount
 * files never wrapped and the raw transaction editor hid its amounts past the
 * right edge.
 */
const source = fs.readFileSync(
  path.join(__dirname, "..", "code-editor.tsx"),
  "utf8",
);
const compact = source.replace(/\s+/gu, "");
const count = (haystack: string, needle: string) =>
  haystack.split(needle).length - 1;

describe("code editor line wrapping", () => {
  it("installs line wrapping unconditionally in the editor's extensions", () => {
    const start = source.indexOf("function buildExtensions(");
    const body = source.slice(
      start,
      source.indexOf("function jumpToEditorLine("),
    );
    expect(start === -1).toBe(false);
    expect(/^\s*EditorView\.lineWrapping,$/mu.test(body)).toBe(true);
    expect(count(source, "EditorView.lineWrapping")).toBe(1);
  });

  it("leaves wrapping out of the language compartment, initially and on reconfigure", () => {
    expect(count(compact, "beancount?beancountStreamLanguage:[]")).toBe(2);
  });
});
