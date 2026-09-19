import { useMemo } from "react";
import { ClientOnly } from "@tanstack/react-router";
import Editor, { type EditorProps, type OnMount } from "@monaco-editor/react";

/**
 * Tell assistive technology when the editor is read-only.
 *
 * Monaco's textarea surface gets a native `readonly` attribute, but its native
 * EditContext surface is a plain `div` that Monaco gives `role="textbox"` and
 * five other ARIA attributes — never `aria-readonly`. Without this, a
 * read-only viewer tells the accessibility tree it can be typed into.
 *
 * Re-applied on any configuration change, so it survives both a view-mode
 * switch and Monaco rebuilding its input surface.
 */
function syncReadOnlyState(
  editor: Parameters<OnMount>[0],
  monaco: Parameters<OnMount>[1],
): void {
  const apply = () => {
    const readOnly = editor.getOption(monaco.editor.EditorOption.readOnly);
    editor
      .getDomNode()
      ?.querySelector(".native-edit-context, textarea.inputarea")
      ?.setAttribute("aria-readonly", readOnly ? "true" : "false");
  };

  apply();
  const subscription = editor.onDidChangeConfiguration(apply);
  editor.onDidDispose(() => subscription.dispose());
}

/**
 * A read-only editor is read-only in the DOM too.
 *
 * Monaco only sets the textarea's native `readonly` when `domReadOnly` is set
 * as well, so a consumer that sets `readOnly` alone leaves an input the
 * browser still treats as writable. Defaulting it here means the next consumer
 * cannot forget it; a caller that wants one without the other still can.
 */
function withDomReadOnly(
  options: EditorProps["options"],
): EditorProps["options"] {
  if (!options || options.readOnly === undefined) return options;
  if (options.domReadOnly !== undefined) return options;
  return { ...options, domReadOnly: options.readOnly };
}

/**
 * Wraps @monaco-editor/react in ClientOnly to prevent SSR/hydration issues.
 * Accepts all standard EditorProps. Use the `fallback` prop to customize the
 * placeholder shown before the editor mounts (defaults to an empty div).
 */
export const MonacoEditor = ({
  fallback = <div />,
  onMount,
  options,
  ...props
}: EditorProps & { fallback?: React.ReactNode }) => {
  // A fresh object every render would make the editor re-apply its options on
  // every render, so the default is computed only when the caller's changes.
  const editorOptions = useMemo(() => withDomReadOnly(options), [options]);

  const handleMount: OnMount = (editor, monaco) => {
    syncReadOnlyState(editor, monaco);
    onMount?.(editor, monaco);
  };

  return (
    <ClientOnly fallback={fallback}>
      <Editor {...props} options={editorOptions} onMount={handleMount} />
    </ClientOnly>
  );
};
