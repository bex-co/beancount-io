"use dom";

import { useRef, useEffect } from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from "@codemirror/view";
import { EditorState, Extension, Prec } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  StreamLanguage,
  syntaxHighlighting,
  HighlightStyle,
  indentUnit,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";

// ─── Types (imported on the native side as well) ─────────────────────────────

export type InsertSpec = { text: string; seq: number };

export type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isDark: boolean;
  /** Keyboard height (px) so CM6 scrolls cursor into view above the keyboard */
  keyboardHeight: number;
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

function buildExtensions(
  isDark: boolean,
  onChangeRef: { current: (v: string) => void },
  onSaveRef: { current: () => void },
): Extension[] {
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

  return [
    history(),
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    drawSelection(),
    indentUnit.of("  "),
    beancountStreamLanguage,
    editorTheme,
    syntaxHighlighting(highlightStyle),
    // Disable autocorrect / autocapitalize on the contenteditable
    EditorView.contentAttributes.of({
      autocorrect: "off",
      autocapitalize: "none",
      spellcheck: "false",
      "data-gramm": "false",
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    }),
    Prec.highest(
      keymap.of([
        {
          key: "Mod-s",
          run: () => {
            onSaveRef.current();
            return true;
          },
        },
      ]),
    ),
    keymap.of([...defaultKeymap, ...historyKeymap]),
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CodeEditor({
  value,
  onChange,
  onSave,
  isDark,
  keyboardHeight,
  insertSpec,
  jumpToLine,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const lastEditorValue = useRef(value);
  const prevInsertSeq = useRef<number | null>(null);

  // Keep callback refs current
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Mount editor once
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: buildExtensions(isDark, onChangeRef, onSaveRef),
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (e.g. reload after conflict)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (value !== lastEditorValue.current) {
      lastEditorValue.current = value;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
        selection: { anchor: 0 },
      });
    }
  }, [value]);

  // Re-apply theme when isDark changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc;
    view.setState(
      EditorState.create({
        doc: currentDoc,
        extensions: buildExtensions(isDark, onChangeRef, onSaveRef),
      }),
    );
  }, [isDark]);

  // Insert text at cursor (from accessory bar)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !insertSpec) return;
    if (insertSpec.seq === prevInsertSeq.current) return;
    prevInsertSeq.current = insertSpec.seq;
    const { from, to } = view.state.selection.main;
    view.dispatch(
      view.state.update({
        changes: { from, to, insert: insertSpec.text },
        selection: { anchor: from + insertSpec.text.length },
        scrollIntoView: true,
        userEvent: "input",
      }),
    );
    view.focus();
  }, [insertSpec]);

  // Jump to a specific line
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !jumpToLine) return;
    const lineNum = Math.max(1, Math.min(jumpToLine, view.state.doc.lines));
    const line = view.state.doc.line(lineNum);
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    });
    view.focus();
  }, [jumpToLine]);

  // Keyboard height → pad editor scroller so CM6 scrolls cursor above keyboard
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.scrollDOM.style.paddingBottom =
      keyboardHeight > 0 ? `${keyboardHeight}px` : "";
  }, [keyboardHeight]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: isDark ? dark.background : light.background,
      }}
    />
  );
}
