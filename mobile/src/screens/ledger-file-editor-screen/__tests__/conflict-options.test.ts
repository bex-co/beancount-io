import fs from "fs";
import path from "path";
import { en } from "../../../translations/en";
import { translationLocales } from "../../../translations/__tests__/locale-parity";

// w21/273: after a File Changed conflict, Keep Editing could never save (every
// save sent the same stale sha) and Reload threw the text away. The screen runs
// queries this runner cannot execute, so the wiring is checked on its source.
describe("the file editor's conflict alert", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
    .replace(/\s+/g, "");
  const body = (start: string, end: string) => {
    const from = source.indexOf(start);
    expect(from === -1).toBe(false);
    return source.slice(from, source.indexOf(end, from));
  };

  it("offers to keep a copy before reloading", () => {
    const copy = body("constcopyThenReload=useCallback(", "[handleReload,t],");
    const setClip = copy.indexOf("Clipboard.setStringAsync(");
    const reload = copy.indexOf("awaithandleReload()");
    expect(setClip === -1).toBe(false);
    // Copied first, and a failed copy returns before the reload.
    expect(setClip < reload).toBe(true);
    expect(copy.indexOf("return;") < reload).toBe(true);
    // The text now in the editor, which may be newer than the save's (w21/689).
    expect(
      copy.includes("constcurrent=recoveryRef.current.latest()||content;"),
    ).toBe(true);
    expect(copy.includes("withLineEnding(current,lineEndingRef.current)")).toBe(
      true,
    );
  });

  it("offers to save the text over the remote version after a confirmation", () => {
    const overwrite = body(
      "constoverwriteRemote=useCallback(",
      "[rebaseOnSaved,refetch,t],",
    );
    // Takes the current sha, then saves the same buffer with it.
    const sha = overwrite.indexOf("shaRef.current=current");
    const save = overwrite.indexOf(
      "handleSaveRef.current?.(content,epoch,revision,true)",
    );
    expect(sha === -1 || save === -1).toBe(false);
    expect(sha < save).toBe(true);
    // The alert names both ways out and asks before overwriting.
    const alert = body('t("ledgerEditorConflictTitle")', "}else{");
    expect(alert.includes('t("ledgerEditorKeepEditing")')).toBe(true);
    expect(alert.includes('t("ledgerEditorCopyReload")')).toBe(true);
    expect(alert.includes('t("ledgerEditorOverwriteTitle")')).toBe(true);
    expect(alert.includes("overwriteRemote(content,epoch,revision)")).toBe(
      true,
    );
  });

  it("is worded in every shipped language", () => {
    expect(en.ledgerEditorOverwrite).toBe("Overwrite");
    expect(en.ledgerEditorCopyReload).toBe("Copy & Reload");
    for (const locale of translationLocales()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../../../translations/${locale}`)[locale];
      for (const key of [
        "ledgerEditorOverwrite",
        "ledgerEditorCopyReload",
        "ledgerEditorOverwriteTitle",
        "ledgerEditorOverwriteMessage",
        "ledgerEditorCopyFailed",
      ]) {
        expect(typeof catalog[key]).toBe("string");
      }
    }
  });
});
