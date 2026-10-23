import fs from "fs";
import path from "path";
import { createEditorRecovery, DRAFT_DEBOUNCE_MS } from "../editor-recovery";

// w21/342: iOS can kill the editor's web view process. Expo reloads it with the
// first render's props: the original file text, a revision counter at 0 and the
// last insert request again. The draft was lost, an insert was applied again at
// the top of the file, and every later edit was dropped as stale.
describe("createEditorRecovery", () => {
  it("does nothing for the first time the page is ready", () => {
    const recovery = createEditorRecovery();
    recovery.loaded("original");
    expect(recovery.ready()).toBe(null);
  });

  it("puts the latest draft back when the page is ready again", () => {
    const recovery = createEditorRecovery();
    recovery.loaded("original");
    expect(recovery.ready()).toBe(null);
    recovery.draft("original\n2026-10-21 * edited");
    expect(recovery.ready()).toEqual({
      value: "original\n2026-10-21 * edited",
      savedValue: "original",
    });
  });

  it("measures unsaved against the saved text after a save", () => {
    const recovery = createEditorRecovery();
    recovery.loaded("one");
    recovery.ready();
    recovery.draft("two");
    recovery.saved("two");
    recovery.draft("three");
    expect(recovery.ready()).toEqual({ value: "three", savedValue: "two" });
  });

  // w21/689: BBB was typed while the save of "L1\nAAA\n" was in flight.
  it("keeps text typed during a save, through a restart", () => {
    const recovery = createEditorRecovery();
    recovery.loaded("L1\n");
    recovery.ready();
    recovery.draft("L1\nAAA\n");
    recovery.saving("L1\nAAA\n");
    recovery.draft("L1\nAAA\nBBB\n");
    recovery.saved("L1\nAAA\n");
    expect(recovery.latest()).toBe("L1\nAAA\nBBB\n");
    expect(recovery.ready()).toEqual({
      value: "L1\nAAA\nBBB\n",
      savedValue: "L1\nAAA\n",
    });
  });

  it("takes the saved text as the latest when nothing was typed meanwhile", () => {
    const recovery = createEditorRecovery();
    recovery.loaded("a");
    recovery.ready();
    recovery.saving("b");
    recovery.saved("b");
    expect(recovery.ready()).toEqual({ value: "b", savedValue: "b" });
  });

  it("restores a clean file as it was loaded or last saved", () => {
    const recovery = createEditorRecovery();
    recovery.loaded("a");
    recovery.ready();
    expect(recovery.ready()).toEqual({ value: "a", savedValue: "a" });
    recovery.loaded("b");
    expect(recovery.ready()).toEqual({ value: "b", savedValue: "b" });
  });

  it("reports drafts after a pause, not on every keystroke", () => {
    expect(DRAFT_DEBOUNCE_MS >= 200 && DRAFT_DEBOUNCE_MS <= 1000).toBe(true);
  });
});

describe("the editor and screen wiring", () => {
  const read = (...parts: string[]) =>
    fs
      .readFileSync(path.join(__dirname, "..", "..", "..", ...parts), "utf8")
      .replace(/\s+/gu, "");

  it("the editor announces itself, reports drafts and measures unsaved against the saved text", () => {
    const editor = read("components", "code-editor", "code-editor.tsx");
    expect(
      editor.includes(
        "void onReadyRef.current?.()?.catch(()=>undefined);".replace(
          /\s+/gu,
          "",
        ),
      ),
    ).toBe(true);
    expect(editor.includes("draftSink.timer=setTimeout(()=>{")).toBe(true);
    expect(editor.includes("documentSpec.savedValue===undefined||")).toBe(true);
    expect(editor.includes("Text.of(documentSpec.savedValue.split")).toBe(true);
  });

  it("the screen re-seeds the draft under a new epoch and resets the tracker", () => {
    const screen = read("screens", "ledger-file-editor-screen", "index.tsx");
    const ready = screen.slice(screen.indexOf("consthandleEditorReady="));
    const body = ready.slice(0, ready.indexOf("[],);"));
    expect(
      body.includes("constplan=recoveryRef.current.ready();if(!plan)return;"),
    ).toBe(true);
    expect(
      body.includes(
        "documentEpochRef.current=epoch;resetRevisionTracker(revisionTrackerRef.current);",
      ),
    ).toBe(true);
    expect(body.includes("savedValue:plan.savedValue,")).toBe(true);
    expect(
      screen.includes("onReady={handleEditorReady}onDraft={handleDraft}"),
    ).toBe(true);
  });

  it("an insert is spent once the editor reports the edit, so a reload does not repeat it", () => {
    const screen = read("screens", "ledger-file-editor-screen", "index.tsx");
    const edit = screen.slice(screen.indexOf("consthandleEdit="));
    expect(
      edit.slice(0, edit.indexOf("[],);")).includes("setInsertSpec(null);"),
    ).toBe(true);
  });

  it("the screen keeps the draft from loads, saves and reports", () => {
    const screen = read("screens", "ledger-file-editor-screen", "index.tsx");
    expect(screen.split("recoveryRef.current.loaded(fc);").length - 1).toBe(2);
    expect(screen.includes("recoveryRef.current.saved(content);")).toBe(true);
    expect(
      screen.includes(
        "if(epoch===documentEpochRef.current)recoveryRef.current.draft(text);",
      ),
    ).toBe(true);
  });
});
