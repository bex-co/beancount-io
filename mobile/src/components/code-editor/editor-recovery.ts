/**
 * What the screen needs to put the editor's text back if iOS kills its web
 * view's process (w21/342). Expo reloads a DOM component whose WebContent
 * process died, and the reloaded page gets the *first* render's props: the
 * original file text, a revision counter back at 0, and the last insert request
 * again. The screen keeps the latest text it has been told of, and re-seeds the
 * editor from it when the page announces it is ready a second time.
 *
 * Import-free so the unit runner can load it.
 */

/** How long after the last keystroke the editor reports its text. */
export const DRAFT_DEBOUNCE_MS = 400;

export type EditorRecovery = {
  /** The file as loaded or reloaded: the saved text, and the draft's start. */
  loaded(text: string): void;
  /** A save of this text is starting: it is the latest the editor has, so far. */
  saving(text: string): void;
  /**
   * The text as saved: the saved text only. The latest stays whatever the editor
   * has reported since the save began, so keystrokes typed during "Saving…" are
   * not put back to the saved text by a later restart, Overwrite or Recreate
   * (w21/689).
   */
  saved(text: string): void;
  /** The latest text reported by the editor. */
  draft(text: string): void;
  /** The latest text the editor reported, saved or not. */
  latest(): string;
  /**
   * The page says it is ready. Null for the first time; afterwards the page is
   * a reload, and this is the text to put back with the saved text it differs
   * from.
   */
  ready(): { value: string; savedValue: string } | null;
};

export function createEditorRecovery(): EditorRecovery {
  let latest = "";
  let savedText = "";
  let readyBefore = false;
  return {
    loaded(text) {
      latest = text;
      savedText = text;
    },
    saving(text) {
      latest = text;
    },
    saved(text) {
      savedText = text;
    },
    draft(text) {
      latest = text;
    },
    latest() {
      return latest;
    },
    ready() {
      if (!readyBefore) {
        readyBefore = true;
        return null;
      }
      return { value: latest, savedValue: savedText };
    },
  };
}
