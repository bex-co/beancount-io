/**
 * What the editor body should render.
 *
 * - `loading` — first load, or a query that has not settled yet.
 * - `error` — the query failed and no session was ever initialized.
 * - `unavailable` — the query settled successfully but `getLedgerFile` is null.
 *   `LedgerFileContent` is nullable in the schema, so a stale or mistyped source
 *   link reaches this. The session guard never initializes from a null file, so
 *   without this state the body rendered nothing at all — a blank screen.
 * - `content` — a session is initialized (including a genuinely empty file,
 *   which is a real document with content `""`).
 */
export type LedgerFileEditorState =
  "loading" | "error" | "unavailable" | "content";

export function selectLedgerFileEditorState(input: {
  /** The query is in flight. */
  loading: boolean;
  /** The query errored. */
  hasError: boolean;
  /** The query produced a data object (i.e. it settled successfully). */
  hasData: boolean;
  /** That data object carries a non-null `getLedgerFile`. */
  hasFile: boolean;
  /** An editor session has been seeded from a loaded file. */
  initialized: boolean;
}): LedgerFileEditorState {
  if (input.initialized) {
    return "content";
  }
  if (input.loading) {
    return "loading";
  }
  if (input.hasError) {
    return "error";
  }
  // Settled, successful, and the file is not there.
  if (input.hasData && !input.hasFile) {
    return "unavailable";
  }
  // Nothing has settled yet (pre-flight render): keep the skeleton rather than
  // claiming the file is missing.
  return "loading";
}
