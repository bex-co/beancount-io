import { useState, useRef, useEffect } from "react";
import { MonacoEditor as Editor } from "@/common/components/monaco-editor";
import type * as monaco from "monaco-editor";
import type { BeancountError } from "@/graphql/definitions";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import { getFileLanguage } from "../../../shared/lib/utils";
import { registerBeancountLanguage } from "@/common/lib/editor/monaco-beancount-language-vscode";
import { registerEditorShortcuts } from "@/common/lib/editor/monaco-beancount-actions";
import { beancountErrorsToMarkers } from "./text-editor-utils";

export interface ContentEditorProps {
  content: string;
  filename: string;
  setEditedContent?: (content: string) => void;
  lineNumber?: number;
  readOnly?: boolean;
  onSave?: (content: string) => void;
  onCancel?: () => void;
  onEditorMount?: (
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor"),
  ) => void;
  onScrollChange?: (lineNumber: number) => void;
  errors?: BeancountError[];
}

export const TextEditor = ({
  content,
  filename,
  setEditedContent,
  lineNumber,
  readOnly = false,
  onSave,
  onCancel,
  onEditorMount,
  onScrollChange,
  errors = [],
}: ContentEditorProps) => {
  const isDarkTheme = useIsDarkTheme();
  const decorationsRef = useRef<string[]>([]);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const [editorMounted, setEditorMounted] = useState(false);
  const isProgrammaticScrollRef = useRef(false);

  const language = getFileLanguage(filename);
  const theme =
    language === "beancount"
      ? isDarkTheme
        ? "beancount-dark"
        : "beancount-light"
      : isDarkTheme
        ? "vs-dark"
        : "light";

  // Update markers when errors change or editor mounts
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !editorMounted) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const markers = beancountErrorsToMarkers(errors, monacoRef.current);
    monacoRef.current.editor.setModelMarkers(model, "beancount", markers);
  }, [errors, editorMounted]);

  // Toggle the read-only cursor-hiding class reactively. A single editor
  // instance is shared across view/edit modes, so the caret must be hidden or
  // shown whenever `readOnly` flips rather than only once on mount.
  useEffect(() => {
    const domNode = editorRef.current?.getDomNode();
    if (!domNode) return;
    domNode.classList.toggle("hide-cursor", readOnly);
  }, [readOnly, editorMounted]);

  // Handle document-level keyboard shortcuts:
  //   Cmd+F  — open Monaco find widget (all modes; only when editor is focused)
  //   Cmd+S  — save file (edit mode only)
  //   Escape — cancel edit (edit mode only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && (e.key === "f" || e.key === "F")) {
        if (!editorRef.current?.hasTextFocus()) return;
        e.preventDefault();
        e.stopPropagation();
        editorRef.current.trigger("keyboard", "actions.find", {});
        return;
      }

      if (readOnly) return;

      if (isMod && (e.key === "s" || e.key === "S") && onSave) {
        e.preventDefault();
        e.stopPropagation();
        const currentContent = editorRef.current?.getValue();
        if (currentContent !== undefined) onSave(currentContent);
        return;
      }

      if (e.key === "Escape" && onCancel) {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [readOnly, onSave, onCancel]);

  const handleEditorMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor"),
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    if (onScrollChange) {
      editor.onDidScrollChange(() => {
        if (isProgrammaticScrollRef.current) return;
        const visibleRanges = editor.getVisibleRanges();
        if (visibleRanges.length > 0) {
          onScrollChange(visibleRanges[0].startLineNumber);
        }
      });
    }

    // Register once on mount so the shortcuts are available in edit mode even
    // when the (persistent) editor first mounted in read-only mode. In
    // read-only mode the edit-oriented commands are effectively no-ops.
    registerEditorShortcuts(editor, monaco);

    // Force-set language after mount for Beancount files
    if (language === "beancount") {
      const model = editor.getModel();
      if (model) monaco.editor.setModelLanguage(model, "beancount");
    }

    if (readOnly) {
      editor.getDomNode()?.classList.add("hide-cursor");
    }

    if (errors.length > 0) {
      const model = editor.getModel();
      if (model) {
        const markers = beancountErrorsToMarkers(errors, monaco);
        monaco.editor.setModelMarkers(model, "beancount", markers);
      }
    }

    if (lineNumber && lineNumber > 0) {
      editor.revealLineInCenter(lineNumber);
      const model = editor.getModel();
      if (model) {
        editor.setPosition({
          lineNumber,
          column: model.getLineMaxColumn(lineNumber),
        });
      }
      editor.focus();
      decorationsRef.current = editor.deltaDecorations(
        [],
        [
          {
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              isWholeLine: true,
              className: "highlighted-line",
              inlineClassName: "highlighted-line-inline",
            },
          },
        ],
      );
    } else {
      // No target line: scroll to end so users see the latest transactions
      const model = editor.getModel();
      if (model) {
        const lastLine = model.getLineCount();
        editor.revealLine(lastLine);
        if (!readOnly) {
          editor.setPosition({
            lineNumber: lastLine,
            column: model.getLineMaxColumn(lastLine),
          });
          editor.focus();
        }
      }
    }

    onEditorMount?.(editor, monaco);
    setEditorMounted(true);
  };

  const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    lineNumbers: "on",
    wordWrap: "on",
    automaticLayout: true,
    readOnly,
    domReadOnly: readOnly,
    cursorStyle: readOnly ? "line-thin" : "line",
    cursorWidth: readOnly ? 0 : undefined,
    renderLineHighlight: readOnly ? "none" : "all",
    hideCursorInOverviewRuler: readOnly,
    occurrencesHighlight: readOnly ? "off" : "singleFile",
    selectionHighlight: !readOnly,
    folding: true,
    foldingStrategy: "auto",
    showFoldingControls: "mouseover",
    foldingMaximumRegions: 5000,
    lineNumbersMinChars: 3,
    lineDecorationsWidth: 0,
    glyphMargin: false,
    renderValidationDecorations: "on",
  };

  return (
    <Editor
      className={
        readOnly ? "h-full [&_.monaco-editor_.cursor]:hidden!" : "h-full"
      }
      language={language}
      value={content}
      onChange={(value) => setEditedContent?.(value || "")}
      theme={theme}
      line={lineNumber}
      beforeMount={(monaco) => {
        registerBeancountLanguage(monaco);
        monaco.editor.setTheme(theme);
      }}
      onMount={handleEditorMount}
      options={editorOptions}
    />
  );
};
