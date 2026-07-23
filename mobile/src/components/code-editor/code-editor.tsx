"use dom";

import { type Ref, useEffect, useRef } from "react";
import {
  useDOMImperativeHandle,
  type DOMImperativeFactory,
  type DOMProps,
} from "expo/dom";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from "@codemirror/view";
import {
  Compartment,
  EditorState,
  Extension,
  Prec,
  Text,
} from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  StreamLanguage,
  syntaxHighlighting,
  HighlightStyle,
  indentUnit,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";

// ─── Types (imported on the native side as well) ─────────────────────────────

export type InsertSpec = {
  text: string;
  seq: number;
  cursorOffset?: number;
};

export type EditorDocumentSpec = {
  value: string;
  epoch: number;
};

export interface CodeEditorRef extends DOMImperativeFactory {
  requestSave: () => void;
}

export type CodeEditorProps = {
  ref?: Ref<CodeEditorRef>;
  dom?: DOMProps;
  documentSpec: EditorDocumentSpec;
  onEdit: (epoch: number, revision: number, isDirty: boolean) => Promise<void>;
  onSave: (value: string, epoch: number, revision: number) => Promise<boolean>;
  isDark: boolean;
  /** Bottom inset (px) so CM6 scrolls above the keyboard accessory and keyboard */
  keyboardInset: number;
  insertSpec: InsertSpec | null;
  jumpToLine: number | null;
};

// ─── Beancount StreamLanguage ─────────────────────────────────────────────────

type BeanState = { inStr: boolean };

const beancountStreamLanguage = StreamLanguage.define<BeanState>({
  startState: () => ({ inStr: false }),

  token(stream, state) {
    // Continue an open string across lines
    if (state.inStr) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "\\") {
          stream.next();
          continue;
        }
        if (ch === '"') {
          state.inStr = false;
          break;
        }
      }
      return "string";
    }

    if (stream.eatSpace()) return null;

    // Line comment
    if (stream.match(/^;.*/)) return "comment";

    // String literal
    if (stream.peek() === '"') {
      stream.next(); // opening quote
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "\\") {
          stream.next();
          continue;
        }
        if (ch === '"') break;
        if (ch === undefined) {
          state.inStr = true;
          break;
        }
      }
      return "string";
    }

    // Date  YYYY-MM-DD
    if (stream.match(/^\d{4}-\d{2}-\d{2}(?!\d)/)) return "number";

    // Directives (must come before account/currency to avoid partial match)
    if (
      stream.match(
        /^(txn|balance|open|close|pad|note|price|document|custom|option|include|plugin|pushmeta|popmeta|event|query|commodity)\b/,
      )
    )
      return "keyword";

    // Transaction flags  * !
    if (stream.match(/^[*!]/)) return "atom";

    // Account names  Assets:Checking:Main
    if (stream.match(/^[A-Z][a-zA-Z0-9-]*(?::[A-Z][a-zA-Z0-9-]*)*/))
      return "variableName";

    // Tags  #tag
    if (stream.match(/^#[A-Za-z0-9_/-]+/)) return "tagName";

    // Links  ^link
    if (stream.match(/^\^[A-Za-z0-9_/-]+/)) return "labelName";

    // Currency codes  USD EUR BTC
    if (stream.match(/^[A-Z][A-Z0-9.']{1,23}(?![a-z])/)) return "typeName";

    // Numbers / amounts
    if (stream.match(/^-?[0-9,]+(?:\.[0-9]+)?/)) return "number";

    stream.next();
    return null;
  },

  copyState: (s) => ({ ...s }),
});

// ─── Color palettes ───────────────────────────────────────────────────────────

const light = {
  background: "#FFFFFF",
  surface: "#F6F8FA",
  foreground: "#24292E",
  selection: "#C8E6C9",
  cursor: "#24292E",
  lineHighlight: "rgba(0,0,0,0.04)",
  gutterBg: "#F6F8FA",
  gutterFg: "#6A737D",
  gutterBorder: "#E1E4E8",
  comment: "#6A737D",
  keyword: "#D73A49",
  string: "#28A745",
  number: "#005CC5",
  variable: "#6F42C1",
  tag: "#0366D6",
  type: "#E36209",
};

const dark = {
  background: "#1E1E1E",
  surface: "#252526",
  foreground: "#D4D4D4",
  selection: "#264F78",
  cursor: "#AEAFAD",
  lineHighlight: "rgba(255,255,255,0.05)",
  gutterBg: "#252526",
  gutterFg: "#858585",
  gutterBorder: "#3E3E42",
  comment: "#6A9955",
  keyword: "#C586C0",
  string: "#CE9178",
  number: "#B5CEA8",
  variable: "#9CDCFE",
  tag: "#4FC1FF",
  type: "#DCDCAA",
};

function buildThemeExtensions(isDark: boolean): Extension[] {
  const c = isDark ? dark : light;

  const editorTheme = EditorView.theme(
    {
      "&": {
        color: c.foreground,
        backgroundColor: c.background,
        height: "100%",
      },
      ".cm-content": {
        caretColor: c.cursor,
        fontFamily: "Menlo, Monaco, 'Courier New', monospace",
        fontSize: "14px",
        lineHeight: "1.6",
        padding: "4px 8px",
      },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: c.cursor },
      ".cm-selectionBackground, ::selection": { backgroundColor: c.selection },
      ".cm-activeLine": { backgroundColor: c.lineHighlight },
      ".cm-gutters": {
        backgroundColor: c.gutterBg,
        color: c.gutterFg,
        borderRight: `1px solid ${c.gutterBorder}`,
      },
      ".cm-activeLineGutter": { color: c.foreground },
      ".cm-scroller": { overflow: "auto" },
      ".cm-editor": { height: "100%" },
    },
    { dark: isDark },
  );

  const highlightStyle = HighlightStyle.define([
    { tag: tags.comment, color: c.comment, fontStyle: "italic" },
    { tag: tags.keyword, color: c.keyword, fontWeight: "bold" },
    { tag: tags.string, color: c.string },
    { tag: tags.number, color: c.number },
    { tag: tags.variableName, color: c.variable },
    { tag: tags.tagName, color: c.tag },
    { tag: tags.labelName, color: c.tag },
    { tag: tags.typeName, color: c.type },
    { tag: tags.atom, color: c.keyword },
  ]);

  return [editorTheme, syntaxHighlighting(highlightStyle)];
}

function buildExtensions(
  isDark: boolean,
  onEditRef: {
    current: (
      epoch: number,
      revision: number,
      isDirty: boolean,
    ) => Promise<void>;
  },
  documentEpochRef: { current: number },
  editRevisionRef: { current: number },
  savedDocumentRef: { current: Text },
  requestSaveRef: { current: () => void },
  themeCompartment: Compartment,
): Extension[] {
  return [
    history(),
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    drawSelection(),
    indentUnit.of("  "),
    beancountStreamLanguage,
    themeCompartment.of(buildThemeExtensions(isDark)),
    // Disable autocorrect / autocapitalize on the contenteditable
    EditorView.contentAttributes.of({
      autocorrect: "off",
      autocapitalize: "none",
      spellcheck: "false",
      "data-gramm": "false",
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        editRevisionRef.current += 1;
        void onEditRef.current(
          documentEpochRef.current,
          editRevisionRef.current,
          !update.state.doc.eq(savedDocumentRef.current),
        );
      }
    }),
    Prec.highest(
      keymap.of([
        {
          key: "Mod-s",
          run: () => {
            requestSaveRef.current();
            return true;
          },
        },
      ]),
    ),
    keymap.of([...defaultKeymap, ...historyKeymap]),
  ];
}

function jumpToEditorLine(view: EditorView, target: number): () => void {
  const lineNum = Math.max(1, Math.min(target, view.state.doc.lines));
  const line = view.state.doc.line(lineNum);

  view.dispatch({
    selection: { anchor: line.from },
    effects: EditorView.scrollIntoView(line.from, { y: "center" }),
  });
  view.focus();

  const doMeasuredScroll = () => {
    view.requestMeasure({
      read(v) {
        return {
          top: v.lineBlockAt(line.from).top,
          clientH: v.scrollDOM.clientHeight,
        };
      },
      write(data, v) {
        if (data.top > 0) {
          v.scrollDOM.scrollTop = Math.max(0, data.top - data.clientH / 2);
        }
      },
    });
  };

  const timers = [100, 500, 1000].map((delay) =>
    setTimeout(doMeasuredScroll, delay),
  );
  return () => timers.forEach(clearTimeout);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CodeEditor({
  ref,
  documentSpec,
  onEdit,
  onSave,
  isDark,
  keyboardInset,
  insertSpec,
  jumpToLine,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onEditRef = useRef(onEdit);
  const onSaveRef = useRef(onSave);
  const documentEpochRef = useRef(documentSpec.epoch);
  const editRevisionRef = useRef(0);
  const savedDocumentRef = useRef(Text.of(documentSpec.value.split("\n")));
  const requestSaveRef = useRef<() => void>(() => undefined);
  const themeCompartmentRef = useRef(new Compartment());
  const appliedThemeRef = useRef(isDark);
  const prevInsertSeq = useRef<number | null>(null);
  // Tracks the most-recent jump target so the value effect can fire it
  // after the full content is loaded (the Expo DOM bridge may deliver
  // value="" on first render and the real content on the next one).
  const pendingJumpRef = useRef<number | null>(jumpToLine);

  // Keep callback refs current
  useEffect(() => {
    onEditRef.current = onEdit;
  }, [onEdit]);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  requestSaveRef.current = () => {
    const view = viewRef.current;
    if (!view) return;
    const document = view.state.doc;
    const content = view.state.doc.toString();
    const epoch = documentEpochRef.current;
    const revision = editRevisionRef.current;
    void onSaveRef
      .current(content, epoch, revision)
      .then((saved) => {
        if (!saved || epoch !== documentEpochRef.current) return;
        savedDocumentRef.current = document;
        const latestView = viewRef.current;
        if (!latestView) return;
        void onEditRef.current(
          epoch,
          editRevisionRef.current,
          !latestView.state.doc.eq(savedDocumentRef.current),
        );
      })
      .catch(() => undefined);
  };

  useDOMImperativeHandle(
    ref ?? null,
    () => ({
      requestSave() {
        requestSaveRef.current();
      },
    }),
    [],
  );

  // Prevent the WebView document from scrolling so CM6's own scroller
  // handles all scroll — without this the body can scroll, making scrollDOM
  // scrollTop always 0 and jump-to-line a no-op.
  useEffect(() => {
    document.documentElement.style.height = "100%";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
  }, []);

  // Mount editor once
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: documentSpec.value,
      extensions: buildExtensions(
        isDark,
        onEditRef,
        documentEpochRef,
        editRevisionRef,
        savedDocumentRef,
        requestSaveRef,
        themeCompartmentRef.current,
      ),
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Replace the document only for an explicit load/reload epoch. CodeMirror
  // owns local edits; mirroring every keystroke back as a prop would race over
  // Expo's asynchronous DOM bridge and reset the cursor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    documentEpochRef.current = documentSpec.epoch;
    editRevisionRef.current = 0;

    if (documentSpec.value !== view.state.doc.toString()) {
      view.setState(
        EditorState.create({
          doc: documentSpec.value,
          extensions: buildExtensions(
            appliedThemeRef.current,
            onEditRef,
            documentEpochRef,
            editRevisionRef,
            savedDocumentRef,
            requestSaveRef,
            themeCompartmentRef.current,
          ),
        }),
      );
    }
    savedDocumentRef.current = view.state.doc;

    const target = pendingJumpRef.current;
    if (target && view.state.doc.lines > 1) {
      return jumpToEditorLine(view, target);
    }
    return undefined;
  }, [documentSpec.epoch, documentSpec.value]);

  // Reconfigure only theme extensions, preserving document, selection, and undo.
  useEffect(() => {
    if (appliedThemeRef.current === isDark) return;
    appliedThemeRef.current = isDark;
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(
        buildThemeExtensions(isDark),
      ),
    });
  }, [isDark]);

  // Insert text at cursor (from accessory bar)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !insertSpec) return;
    if (insertSpec.seq === prevInsertSeq.current) return;
    prevInsertSeq.current = insertSpec.seq;
    const { from, to } = view.state.selection.main;
    const cursorOffset = Math.max(
      0,
      Math.min(
        insertSpec.cursorOffset ?? insertSpec.text.length,
        insertSpec.text.length,
      ),
    );
    view.dispatch(
      view.state.update({
        changes: { from, to, insert: insertSpec.text },
        selection: { anchor: from + cursorOffset },
        scrollIntoView: true,
        userEvent: "input",
      }),
    );
    view.focus();
  }, [insertSpec]);

  // Jump to a specific line.  Guards against a 1-line doc (content not yet
  // loaded via the Expo bridge) — in that case the value effect will retry.
  useEffect(() => {
    pendingJumpRef.current = jumpToLine;
    const view = viewRef.current;
    if (!view || !jumpToLine || view.state.doc.lines <= 1) return;
    return jumpToEditorLine(view, jumpToLine);
  }, [jumpToLine]);

  // Keep the cursor above the native keyboard accessory and keyboard.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.scrollDOM.style.paddingBottom =
      keyboardInset > 0 ? `${keyboardInset}px` : "";
  }, [keyboardInset]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        backgroundColor: isDark ? dark.background : light.background,
      }}
    />
  );
}
