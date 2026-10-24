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
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  StreamLanguage,
  indentService,
  syntaxHighlighting,
  HighlightStyle,
  indentUnit,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { EditorTheme } from "@/types/theme-props";
import { isSameEditorTheme } from "./editor-theme";
import { detectIndentUnit, INSERT_INDENT, wrapSelection } from "./indent-unit";
import { jumpScrollTop } from "./jump-scroll";
import { editorFontSize } from "./editor-font";
import { DRAFT_DEBOUNCE_MS } from "./editor-recovery";
import { EDITOR_LINE_SEPARATOR, editorText, pastedText } from "./editor-text";
import {
  beancountIndent,
  copyBeancountState,
  startBeancountState,
  tokenizeBeancount,
  type BeancountState,
} from "./beancount-language";

// ─── Types (imported on the native side as well) ─────────────────────────────

export type InsertSpec = {
  text: string;
  seq: number;
  cursorOffset?: number;
};

export type EditorDocumentSpec = {
  value: string;
  epoch: number;
  /**
   * The saved text, when it differs from `value` (a draft put back after the
   * web view restarted): what "unsaved" is measured against (w21/342).
   */
  savedValue?: string;
};

/** Where the editor reports its text, debounced; set by the component. */
type DraftSink = {
  send: ((text: string, epoch: number) => void) | undefined;
  timer: ReturnType<typeof setTimeout> | null;
};

export interface CodeEditorRef extends DOMImperativeFactory {
  requestSave: () => void;
  /** Blur the editor, which hides the software keyboard. */
  blur: () => void;
}

export type CodeEditorProps = {
  ref?: Ref<CodeEditorRef>;
  dom?: DOMProps;
  documentSpec: EditorDocumentSpec;
  onEdit: (epoch: number, revision: number, isDirty: boolean) => Promise<void>;
  onSave: (value: string, epoch: number, revision: number) => Promise<boolean>;
  /**
   * The page has mounted. The second call is a web view that restarted; the
   * screen answers with the text to put back (w21/342).
   */
  onReady?: () => Promise<void>;
  /** The editor's text shortly after it changes, for that recovery. */
  onDraft?: (text: string, epoch: number) => Promise<void>;
  /** Serializable theme tokens from `colorTheme.editor` (palette.ts). */
  editorTheme: EditorTheme;
  beancount: boolean;
  readOnly?: boolean;
  /** Bottom inset (px) so CM6 scrolls above the keyboard accessory and keyboard */
  keyboardInset: number;
  /** The platform's text scale (`useWindowDimensions().fontScale`). */
  fontScale: number;
  insertSpec: InsertSpec | null;
  jumpToLine: number | null;
};

// ─── Beancount StreamLanguage ─────────────────────────────────────────────────

const beancountStreamLanguage = StreamLanguage.define<BeancountState>({
  startState: startBeancountState,
  token: tokenizeBeancount,
  copyState: copyBeancountState,
});

// Enter indents a posting under its header and puts a new date at column 0
// (w21/338); without a rule the line's own indentation was copied, so a date
// typed after a posting was indented and bean-check refused it ("unexpected
// INDENT"). An indent service rather than the stream parser's `indent`, since
// only the service is told which position is being indented. The line "above"
// is the one before that position: the text before the cursor on Enter.
const beancountLanguage: Extension = [
  beancountStreamLanguage,
  indentService.of((cx, pos) =>
    beancountIndent(cx.lineAt(pos, -1).text, cx.textAfterPos(pos), cx.unit),
  ),
];

// ─── Theme extensions ─────────────────────────────────────────────────────────

function buildThemeExtensions(c: EditorTheme, fontSize: number): Extension[] {
  const editorThemeExt = EditorView.theme(
    {
      "&": {
        color: c.foreground,
        backgroundColor: c.background,
        height: "100%",
      },
      ".cm-content": {
        caretColor: c.cursor,
        fontFamily: "Menlo, Monaco, 'Courier New', monospace",
        fontSize: `${fontSize}px`,
        lineHeight: "1.6",
        padding: "4px 8px",
      },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: c.cursor },
      ".cm-selectionBackground, ::selection": { backgroundColor: c.selection },
      ".cm-activeLine": { backgroundColor: c.lineHighlight },
      ".cm-gutters": {
        fontSize: `${fontSize}px`,
        backgroundColor: c.gutterBackground,
        color: c.gutterForeground,
        borderRight: `1px solid ${c.gutterBorder}`,
      },
      ".cm-activeLineGutter": { color: c.foreground },
      ".cm-scroller": { overflow: "auto" },
      ".cm-editor": { height: "100%" },
    },
    { dark: c.dark },
  );

  const highlightStyle = HighlightStyle.define([
    { tag: tags.comment, color: c.comment, fontStyle: "italic" },
    { tag: tags.keyword, color: c.keyword, fontWeight: "bold" },
    { tag: tags.string, color: c.string },
    { tag: tags.number, color: c.number },
    { tag: tags.variableName, color: c.account },
    { tag: tags.tagName, color: c.tag },
    { tag: tags.labelName, color: c.tag },
    { tag: tags.typeName, color: c.currency },
    { tag: tags.atom, color: c.keyword },
  ]);

  return [editorThemeExt, syntaxHighlighting(highlightStyle)];
}

function buildExtensions(
  editorTheme: EditorTheme,
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
  readOnly: boolean,
  accessCompartment: Compartment,
  beancount: boolean,
  languageCompartment: Compartment,
  fontSize: number,
  draftSink: DraftSink,
): Extension[] {
  return [
    // A lone carriage return is a character, as Beancount reads it (w21/815).
    EditorState.lineSeparator.of(EDITOR_LINE_SEPARATOR),
    EditorView.clipboardInputFilter.of((text) => pastedText(text)),
    accessCompartment.of([
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
    ]),
    history(),
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    drawSelection(),
    // The document's own: a tab for a tab-indented file (w21/339).
    indentUnit.compute(["doc"], (state) =>
      detectIndentUnit(state.doc.toString()),
    ),
    // Wrapping is not a language concern: a phone-width editor wraps every
    // file, and only Beancount files add the language mode.
    EditorView.lineWrapping,
    languageCompartment.of(beancount ? beancountLanguage : []),
    themeCompartment.of(buildThemeExtensions(editorTheme, fontSize)),
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
        if (draftSink.send) {
          if (draftSink.timer) clearTimeout(draftSink.timer);
          const view = update.view;
          draftSink.timer = setTimeout(() => {
            draftSink.timer = null;
            draftSink.send?.(
              view.state.doc.toString(),
              documentEpochRef.current,
            );
          }, DRAFT_DEBOUNCE_MS);
        }
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
    keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
  ];
}

function jumpToEditorLine(
  view: EditorView,
  target: number,
  getKeyboardInset: () => number,
): () => void {
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
          // The middle of what the keyboard leaves visible, read when it runs:
          // the keyboard may rise after the jump begins (w21/340).
          v.scrollDOM.scrollTop = jumpScrollTop(
            data.top,
            data.clientH,
            getKeyboardInset(),
          );
        }
      },
    });
  };

  // At once (the first centring ignored the keyboard), then again as the
  // layout settles.
  doMeasuredScroll();
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
  onReady,
  onDraft,
  editorTheme,
  beancount,
  readOnly = false,
  keyboardInset,
  fontScale,
  insertSpec,
  jumpToLine,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Read when a jump scrolls, not when it starts: the keyboard may rise after.
  const keyboardInsetRef = useRef(keyboardInset);
  keyboardInsetRef.current = keyboardInset;
  const onEditRef = useRef(onEdit);
  const onSaveRef = useRef(onSave);
  const onReadyRef = useRef(onReady);
  const draftSinkRef = useRef<DraftSink>({ send: undefined, timer: null });
  const documentEpochRef = useRef(documentSpec.epoch);
  const editRevisionRef = useRef(0);
  const savedDocumentRef = useRef(
    Text.of(editorText(documentSpec.value).split("\n")),
  );
  const requestSaveRef = useRef<() => void>(() => undefined);
  const themeCompartmentRef = useRef(new Compartment());
  const accessCompartmentRef = useRef(new Compartment());
  const languageCompartmentRef = useRef(new Compartment());
  const appliedAccessRef = useRef(readOnly);
  const appliedThemeRef = useRef(editorTheme);
  const fontSize = editorFontSize(fontScale);
  const appliedFontSizeRef = useRef(fontSize);
  const appliedLanguageRef = useRef(beancount);
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
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    // Without a screen listening there is nothing to report, and no timer to
    // keep (w21/342).
    draftSinkRef.current.send = onDraft
      ? (text, epoch) => void onDraft(text, epoch).catch(() => undefined)
      : undefined;
  }, [onDraft]);

  requestSaveRef.current = () => {
    const view = viewRef.current;
    if (!view || appliedAccessRef.current) return;
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
      blur() {
        viewRef.current?.contentDOM.blur();
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
      doc: editorText(documentSpec.value),
      extensions: buildExtensions(
        editorTheme,
        onEditRef,
        documentEpochRef,
        editRevisionRef,
        savedDocumentRef,
        requestSaveRef,
        themeCompartmentRef.current,
        appliedAccessRef.current,
        accessCompartmentRef.current,
        beancount,
        languageCompartmentRef.current,
        appliedFontSizeRef.current,
        draftSinkRef.current,
      ),
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    // The page is up. A second announcement means the web view restarted and
    // the screen puts the draft back (w21/342).
    void onReadyRef.current?.()?.catch(() => undefined);

    return () => {
      if (draftSinkRef.current.timer) clearTimeout(draftSinkRef.current.timer);
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

    if (editorText(documentSpec.value) !== view.state.doc.toString()) {
      view.setState(
        EditorState.create({
          doc: editorText(documentSpec.value),
          extensions: buildExtensions(
            appliedThemeRef.current,
            onEditRef,
            documentEpochRef,
            editRevisionRef,
            savedDocumentRef,
            requestSaveRef,
            themeCompartmentRef.current,
            appliedAccessRef.current,
            accessCompartmentRef.current,
            appliedLanguageRef.current,
            languageCompartmentRef.current,
            appliedFontSizeRef.current,
            draftSinkRef.current,
          ),
        }),
      );
    }
    // Unsaved is measured against the saved text, which is not the text shown
    // when a draft was put back after the web view restarted (w21/342).
    savedDocumentRef.current =
      documentSpec.savedValue === undefined ||
      documentSpec.savedValue === documentSpec.value
        ? view.state.doc
        : Text.of(editorText(documentSpec.savedValue).split("\n"));

    const target = pendingJumpRef.current;
    if (target && view.state.doc.lines > 1) {
      return jumpToEditorLine(view, target, () => keyboardInsetRef.current);
    }
    return undefined;
  }, [documentSpec.epoch, documentSpec.value, documentSpec.savedValue]);

  useEffect(() => {
    appliedLanguageRef.current = beancount;
    viewRef.current?.dispatch({
      effects: languageCompartmentRef.current.reconfigure(
        beancount ? beancountLanguage : [],
      ),
    });
  }, [beancount]);

  // Reconfigure only theme extensions, preserving document, selection, and undo.
  // Compare by value: the DOM bridge re-serializes props on every native
  // render, so `editorTheme` is a new object each time even when nothing
  // changed, and reconfiguring on reference change alone would leak style
  // modules and re-highlight the document on every keyboard/dirty-flag tick.
  useEffect(() => {
    if (
      isSameEditorTheme(appliedThemeRef.current, editorTheme) &&
      appliedFontSizeRef.current === fontSize
    ) {
      return;
    }
    appliedThemeRef.current = editorTheme;
    appliedFontSizeRef.current = fontSize;
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(
        buildThemeExtensions(editorTheme, fontSize),
      ),
    });
  }, [editorTheme, fontSize]);

  useEffect(() => {
    appliedAccessRef.current = readOnly;
    viewRef.current?.dispatch({
      effects: accessCompartmentRef.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    });
  }, [readOnly]);

  // Insert text at cursor (from accessory bar)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !insertSpec || readOnly) return;
    if (insertSpec.seq === prevInsertSeq.current) return;
    prevInsertSeq.current = insertSpec.seq;
    const { from, to } = view.state.selection.main;
    // ⇥ stands for one unit of this document's indentation.
    const text =
      insertSpec.text === INSERT_INDENT
        ? view.state.facet(indentUnit)
        : insertSpec.text;
    // A pair (`""`) around a selection wraps it rather than replacing it.
    const wrapped = wrapSelection(
      text,
      insertSpec.cursorOffset,
      view.state.sliceDoc(from, to),
    );
    if (wrapped) {
      view.dispatch(
        view.state.update({
          changes: { from, to, insert: wrapped.text },
          selection: {
            anchor: from + wrapped.selectFrom,
            head: from + wrapped.selectTo,
          },
          scrollIntoView: true,
          userEvent: "input",
        }),
      );
      view.focus();
      return;
    }
    const cursorOffset = Math.max(
      0,
      Math.min(insertSpec.cursorOffset ?? text.length, text.length),
    );
    view.dispatch(
      view.state.update({
        changes: { from, to, insert: text },
        selection: { anchor: from + cursorOffset },
        scrollIntoView: true,
        userEvent: "input",
      }),
    );
    view.focus();
  }, [insertSpec, readOnly]);

  // Jump to a specific line.  Guards against a 1-line doc (content not yet
  // loaded via the Expo bridge) — in that case the value effect will retry.
  useEffect(() => {
    pendingJumpRef.current = jumpToLine;
    const view = viewRef.current;
    if (!view || !jumpToLine || view.state.doc.lines <= 1) return;
    return jumpToEditorLine(view, jumpToLine, () => keyboardInsetRef.current);
  }, [jumpToLine]);

  // Keep the cursor above the native keyboard accessory and keyboard.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.scrollDOM.style.paddingBottom =
      keyboardInset > 0 ? `${keyboardInset}px` : "";
    const head = view.state.selection.main.head;
    view.dispatch({
      effects: EditorView.scrollIntoView(head, {
        y: "nearest",
        yMargin: keyboardInset > 0 ? keyboardInset + 8 : 0,
      }),
    });
  }, [keyboardInset]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        backgroundColor: editorTheme.background,
      }}
    />
  );
}
