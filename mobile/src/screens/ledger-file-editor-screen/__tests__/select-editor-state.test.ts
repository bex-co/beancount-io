import { selectLedgerFileEditorState } from "../select-editor-state";

const state = (overrides: {
  loading?: boolean;
  hasError?: boolean;
  hasData?: boolean;
  hasFile?: boolean;
  initialized?: boolean;
}) =>
  selectLedgerFileEditorState({
    loading: false,
    hasError: false,
    hasData: false,
    hasFile: false,
    initialized: false,
    ...overrides,
  });

describe("selectLedgerFileEditorState", () => {
  it("shows the skeleton on first load", () => {
    expect(state({ loading: true })).toBe("loading");
  });

  it("shows the skeleton before anything settles", () => {
    // No data, no error, not (yet) flagged loading — nothing is known.
    expect(state({})).toBe("loading");
  });

  it("reports a failed load", () => {
    expect(state({ hasError: true })).toBe("error");
  });

  // Note 179: the session guard refuses to initialize from a null file, so a
  // settled `{ getLedgerFile: null }` left every render branch false and the body
  // rendered a literal `null` — a blank screen. `LedgerFileContent` is nullable
  // in the schema, so a stale or mistyped source link reaches this.
  it("reports a settled-null file as unavailable, not blank", () => {
    expect(state({ hasData: true, hasFile: false })).toBe("unavailable");
  });

  it("does not call a file unavailable while the query is still in flight", () => {
    expect(state({ loading: true, hasData: true, hasFile: false })).toBe(
      "loading",
    );
  });

  it("prefers the error state over unavailable when the query failed", () => {
    expect(state({ hasError: true, hasData: true, hasFile: false })).toBe(
      "error",
    );
  });

  it("renders content once a session is initialized", () => {
    expect(state({ hasData: true, hasFile: true, initialized: true })).toBe(
      "content",
    );
  });

  it("treats a genuinely empty file as content, not unavailable", () => {
    // An empty `.bean` is a real document: the file exists, so the session
    // initializes and the editor opens on an empty buffer.
    expect(state({ hasData: true, hasFile: true, initialized: true })).toBe(
      "content",
    );
  });

  it("keeps showing content through a background refetch or later error", () => {
    expect(state({ loading: true, initialized: true })).toBe("content");
    expect(state({ hasError: true, initialized: true })).toBe("content");
  });
});
