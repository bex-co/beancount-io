import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type * as monacoType from "monaco-editor";
import { BQL_LANGUAGE_ID, registerBqlLanguage } from "../bql-language";

// The suite aliases "monaco-editor" to a mock; this test drives the real
// editor and its real comment command, so it imports Monaco by path.
const MONACO_ESM = "../../../../../node_modules/monaco-editor/esm/vs";

let monaco: typeof monacoType;
let editor: monacoType.editor.IStandaloneCodeEditor;
let disposables: monacoType.IDisposable[] = [];

beforeAll(async () => {
  // jsdom has neither media queries nor a canvas; Monaco only measures with
  // them, so inert stand-ins are enough to construct a real editor.
  window.matchMedia ??= ((media: string) => ({
    matches: false,
    media,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  HTMLCanvasElement.prototype.getContext = function () {
    return new Proxy(
      {},
      {
        get: (_target, key) =>
          key === "measureText" ? () => ({ width: 7 }) : () => undefined,
      },
    );
  } as unknown as HTMLCanvasElement["getContext"];

  monaco = (await import(
    /* @vite-ignore */ `${MONACO_ESM}/editor/editor.api.js`
  )) as typeof monacoType;
  await import(
    /* @vite-ignore */ `${MONACO_ESM}/editor/contrib/comment/browser/comment.js`
  );
  disposables = registerBqlLanguage(monaco);
  // Monaco's built-in SQL configuration arrives through a lazy loader, so in
  // production it can register after the editor mounts. It declares `--`,
  // which BQL rejects; registering it last proves it cannot reach this editor.
  monaco.languages.register({ id: "sql" });
  monaco.languages.setLanguageConfiguration("sql", {
    comments: { lineComment: "--", blockComment: ["/*", "*/"] },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  editor = monaco.editor.create(container, { language: BQL_LANGUAGE_ID });
  // Importing the real editor is slow under a loaded parallel suite.
}, 60_000);

afterAll(() => {
  editor?.dispose();
  for (const disposable of disposables) disposable.dispose();
});

function toggleLineComment(
  value: string,
  selection: monacoType.IRange,
): string {
  editor.setValue(value);
  editor.setSelection(selection);
  editor.trigger("test", "editor.action.commentLine", null);
  return editor.getValue();
}

describe("BQL editor comments", () => {
  it("comments a note line with the block syntax BQL accepts", () => {
    const commented = toggleLineComment(
      "QA query note\nSELECT account LIMIT 1",
      new monaco.Range(1, 3, 1, 3),
    );
    expect(commented).toBe("/* QA query note */\nSELECT account LIMIT 1");
    expect(commented).not.toContain("--");
  });

  it("toggles the block comment back off, restoring the note", () => {
    expect(
      toggleLineComment(
        "/* QA query note */\nSELECT account LIMIT 1",
        new monaco.Range(1, 5, 1, 5),
      ),
    ).toBe("QA query note\nSELECT account LIMIT 1");
  });

  it("wraps a multi-line selection in one block comment", () => {
    expect(
      toggleLineComment(
        "first note\nsecond note\nSELECT account LIMIT 1",
        new monaco.Range(1, 1, 2, 12),
      ),
    ).toBe("/* first note\nsecond note */\nSELECT account LIMIT 1");
  });

  it("stays block-only after a remount re-registers the language", () => {
    for (const disposable of disposables) disposable.dispose();
    disposables = registerBqlLanguage(monaco);
    expect(
      monaco.languages
        .getLanguages()
        .filter((language) => language.id === BQL_LANGUAGE_ID),
    ).toHaveLength(1);
    expect(toggleLineComment("note", new monaco.Range(1, 1, 1, 1))).toBe(
      "/* note */",
    );
  });
});
