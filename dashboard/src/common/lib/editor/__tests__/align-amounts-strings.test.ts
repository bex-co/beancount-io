import { describe, expect, it } from "vitest";
import type * as monaco from "monaco-editor";
import { alignAmounts } from "../monaco-beancount-actions";

/**
 * A multiline narration's continuation line looked like a posting, so Align
 * Amounts padded the text inside the quotes and changed the narration
 * (w4/1013). String contents are now left byte for byte.
 */
function editorWith(initial: string) {
  let value = initial;
  let edits = 0;
  const lines = () => value.split("\n");
  const editor = {
    getModel: () => ({
      getValue: () => value,
      getLineCount: () => lines().length,
      getLineContent: (line: number) => lines()[line - 1] ?? "",
      getFullModelRange: () => ({}),
    }),
    executeEdits: (_source: string, changes: { text: string }[]) => {
      edits += 1;
      value = changes[0]!.text;
    },
    pushUndoStop: () => {},
  };
  return {
    align: () =>
      alignAmounts(editor as unknown as monaco.editor.IStandaloneCodeEditor),
    value: () => value,
    edits: () => edits,
  };
}

const lineOf = (text: string, start: string) =>
  text.split("\n").find((line) => line.startsWith(start));

describe("Align Amounts and quoted strings", () => {
  it("leaves a multiline narration exact while aligning the postings", () => {
    const source = [
      '2016-01-02 * "qa alignment" "first line',
      "  Assets:InsideString 12.50 USD",
      'last line"',
      "  Assets:Cash 1.00 USD",
      "  Equity:Alignment -1.00 USD",
    ].join("\n");
    const editor = editorWith(source);
    editor.align();

    const after = editor.value().split("\n");
    expect(after.slice(0, 3)).toEqual(source.split("\n").slice(0, 3));
    // Both real postings end at the same currency column.
    expect(after[3]!.indexOf("USD")).toBe(after[4]!.indexOf("USD"));
    expect(after[3]!).toMatch(/^ {2}Assets:Cash {2,}1\.00 USD$/);
  });

  it("follows escaped quotes and backslashes to the real closing quote", () => {
    const source = [
      '2016-01-02 * "says \\"hi\\" and C:\\\\',
      "  Assets:InsideString 12.50 USD",
      'still inside \\" here"',
      "  Assets:Cash 1.00 USD",
    ].join("\n");
    const editor = editorWith(source);
    editor.align();
    expect(editor.value().split("\n").slice(0, 3)).toEqual(
      source.split("\n").slice(0, 3),
    );
    expect(lineOf(editor.value(), "  Assets:Cash")).not.toBe(
      "  Assets:Cash 1.00 USD",
    );
  });

  it("ignores a quote inside a comment", () => {
    const source = ['; a stray " in a comment', "  Assets:Cash 1.00 USD"].join(
      "\n",
    );
    const editor = editorWith(source);
    editor.align();
    // Not mistaken for an open string: the posting still aligns.
    expect(lineOf(editor.value(), "  Assets:Cash")).toMatch(
      /^ {2}Assets:Cash {2,}1\.00 USD$/,
    );
  });

  it("aligns as before around single-line strings", () => {
    const source = [
      '2016-01-02 * "Payee" "Assets:InsideString 12.50 USD"',
      "  Assets:Cash 1.00 USD",
    ].join("\n");
    const editor = editorWith(source);
    editor.align();
    const [header, posting] = editor.value().split("\n");
    expect(header).toBe(source.split("\n")[0]);
    expect(posting).toMatch(/^ {2}Assets:Cash {2,}1\.00 USD$/);
  });

  it("makes no edit when only string contents look like postings", () => {
    const source = [
      '2016-01-02 note Assets:Cash "first',
      "  Assets:InsideString 12.50 USD",
      'last"',
    ].join("\n");
    const editor = editorWith(source);
    editor.align();
    expect(editor.value()).toBe(source);
    expect(editor.edits()).toBe(0);
  });
});
