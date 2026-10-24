import fs from "fs";
import path from "path";
import { EDITOR_LINE_SEPARATOR, editorText, pastedText } from "../editor-text";
import { withLineEnding } from "../../../common/ledger-file-content";

// w21/815: CodeMirror's default separator broke lines at a lone carriage
// return, so a save rewrote "Order 12\r34" to two lines and an error's line
// number landed early. The editor is a DOM component on ESM-only CodeMirror
// the unit runner cannot load, so its wiring is checked on source.
describe("the editor's text", () => {
  it("reads CRLF as LF and keeps a lone carriage return", () => {
    expect(editorText('2026-10-20 * "Order 12\r34"\r\n  Assets:Cash\r\n')).toBe(
      '2026-10-20 * "Order 12\r34"\n  Assets:Cash\n',
    );
    expect(editorText("a\nb\n")).toBe("a\nb\n");
    expect(EDITOR_LINE_SEPARATOR).toBe("\n");
  });

  it("numbers lines as Beancount does", () => {
    const text = 'x\n2026-10-20 * "Order 12\r34"\n  Assets:Cash\n';
    expect(editorText(text).split(EDITOR_LINE_SEPARATOR).length).toBe(4);
  });

  it("is what the editor loads, compares and splits by", () => {
    const source = fs
      .readFileSync(path.join(__dirname, "..", "code-editor.tsx"), "utf8")
      .replace(/\s+/g, "");
    expect(
      source.includes("EditorState.lineSeparator.of(EDITOR_LINE_SEPARATOR),"),
    ).toBe(true);
    expect(source.split("doc:editorText(documentSpec.value),").length - 1).toBe(
      2,
    );
    expect(source.includes("doc:documentSpec.value")).toBe(false);
    expect(
      source.includes(
        "if(editorText(documentSpec.value)!==view.state.doc.toString()){",
      ),
    ).toBe(true);
    expect(
      source.includes(
        'Text.of(editorText(documentSpec.savedValue).split("\\n"))',
      ),
    ).toBe(true);
  });
});

// w21/940: saving a `\r\r\n` file dropped one carriage return from every line.
describe("a file's line endings across open and save", () => {
  it("round-trips a doubled carriage return byte for byte", () => {
    for (const file of [
      "a\r\nb\r\nc\r\r\n",
      "a\r\r\nb\r\r\nc\r\r\n",
      "Order 12\r34\r\nx\r\n",
    ]) {
      expect(withLineEnding(editorText(file), "\r\n")).toBe(file);
    }
    expect(withLineEnding(editorText("a\nb\n"), "\n")).toBe("a\nb\n");
  });

  it("writes a pasted CRLF text with the file's own ending", () => {
    expect(withLineEnding(pastedText("x\r\ny"), "\r\n")).toBe("x\r\ny");
    expect(withLineEnding(pastedText("x\r\ny"), "\n")).toBe("x\ny");
  });

  it("filters what the editor takes from the clipboard", () => {
    const source = fs
      .readFileSync(path.join(__dirname, "..", "code-editor.tsx"), "utf8")
      .replace(/\s+/g, "");
    expect(
      source.includes(
        "EditorView.clipboardInputFilter.of((text)=>pastedText(text)),",
      ),
    ).toBe(true);
  });
});

// w21/941: Cmd-S on a clean buffer sent an unchanged file as a write.
describe("the editor's save request", () => {
  it("does nothing for a buffer equal to the saved document", () => {
    const source = fs
      .readFileSync(path.join(__dirname, "..", "code-editor.tsx"), "utf8")
      .replace(/\s+/g, "");
    const start = source.indexOf("requestSaveRef.current=()=>{");
    const guard = source.indexOf(
      "if(document.eq(savedDocumentRef.current))return;",
      start,
    );
    const send = source.indexOf(
      "onSaveRef.current(content,epoch,revision)",
      start,
    );
    expect(start > -1 && guard > start && send > guard).toBe(true);
  });
});
