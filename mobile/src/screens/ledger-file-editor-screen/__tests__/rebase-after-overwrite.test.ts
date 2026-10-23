import fs from "fs";
import path from "path";
import { createEditorRecovery } from "../../../components/code-editor/editor-recovery";

/**
 * w21/522: Overwrite and Recreate save outside the editor's own save, so its
 * saved-text baseline stayed at the text first loaded and a revert read as no
 * change. Source checks (the screen needs the native runtime), with the
 * recovery's `latest()` the screen reads to keep what was typed meanwhile.
 */
const screen = fs
  .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
  .replace(/\s+/g, "");
const body = (from: string, to: string) =>
  screen.slice(screen.indexOf(from), screen.indexOf(to, screen.indexOf(from)));

describe("after Overwrite or Recreate succeeds", () => {
  it("hands the editor the text it had against the text just saved", () => {
    const rebase = body("constrebaseOnSaved", "constoverwriteRemote");
    expect(
      rebase.includes("setDocumentSpec({value:latest,epoch,savedValue:saved})"),
    ).toBe(true);
    expect(
      rebase.includes("resetRevisionTracker(revisionTrackerRef.current)"),
    ).toBe(true);
    expect(rebase.includes("setHasUnsavedChanges(latest!==saved)")).toBe(true);
  });

  // w21/689: the text is read after the save, so what was typed meanwhile stays.
  it("is done by Overwrite once its save succeeds, on the editor's text then", () => {
    const overwrite = body(
      "constoverwriteRemote=",
      "[rebaseOnSaved,refetch,t],",
    );
    const save = overwrite.indexOf(
      "handleSaveRef.current?.(content,epoch,revision,true)",
    );
    const rebase = overwrite.indexOf(
      "rebaseOnSaved(recoveryRef.current.latest(),content)",
    );
    expect(save > -1 && rebase > save).toBe(true);
  });

  it("is done by Recreate once the file is created, on the editor's text then", () => {
    const recreate = body("constrecreateFile=", "consthandleSave=");
    expect(recreate.includes("recoveryRef.current.saving(content)")).toBe(true);
    expect(
      recreate.includes("rebaseOnSaved(recoveryRef.current.latest(),content)"),
    ).toBe(true);
  });
});

describe("the recovery's latest text", () => {
  it("follows the editor's drafts and a save", () => {
    const recovery = createEditorRecovery();
    recovery.loaded("a");
    expect(recovery.latest()).toBe("a");
    recovery.draft("ab");
    expect(recovery.latest()).toBe("ab");
    // A save starts with the text it sends as the latest, and finishing it
    // leaves the latest to the editor.
    recovery.saving("abc");
    expect(recovery.latest()).toBe("abc");
    recovery.draft("abcd");
    recovery.saved("abc");
    expect(recovery.latest()).toBe("abcd");
  });
});
