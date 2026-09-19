import { ClientOnly } from "@tanstack/react-router";
import Editor, { type EditorProps, type OnMount } from "@monaco-editor/react";

/**
 * Tell assistive technology when the editor is read-only.
 *
 * Monaco has two input surfaces. The textarea fallback gets a native
 * `readonly` attribute whenever `domReadOnly` and `readOnly` are both set, so
 * it reports correctly. The native EditContext surface is a plain `div`:
 * Monaco gives it `role="textbox"` and five other ARIA attributes but never
 * `aria-readonly`, so the accessibility tree calls a read-only viewer editable
 * — the reader is told they can type into a file they cannot change.
 *
 * Setting the attribute here keeps both surfaces honest without disabling
 * EditContext, removing a browser API, or touching the editing permissions
 * that actually reject the keystroke.
 */
function syncReadOnlyState(
  editor: Parameters<OnMount>[0],
  monaco: Parameters<OnMount>[1],
): void {
  const apply = () => {
    const readOnly = editor.getOption(monaco.editor.EditorOption.readOnly);
    const input = editor
      .getDomNode()
      ?.querySelector(".native-edit-context, textarea.inputarea");
    input?.setAttribute("aria-readonly", readOnly ? "true" : "false");
  };

  apply();
  // View mode can change under the reader; the state has to follow it.
  const subscription = editor.onDidChangeConfiguration((event) => {
    if (event.hasChanged(monaco.editor.EditorOption.readOnly)) apply();
  });
  editor.onDidDispose(() => subscription.dispose());
}

/**
 * Wraps @monaco-editor/react in ClientOnly to prevent SSR/hydration issues.
 * Accepts all standard EditorProps. Use the `fallback` prop to customize the
 * placeholder shown before the editor mounts (defaults to an empty div).
 */
export const MonacoEditor = ({
  fallback = <div />,
  onMount,
  ...props
}: EditorProps & { fallback?: React.ReactNode }) => {
  const handleMount: OnMount = (editor, monaco) => {
    syncReadOnlyState(editor, monaco);
    onMount?.(editor, monaco);
  };

  return (
    <ClientOnly fallback={fallback}>
      <Editor {...props} onMount={handleMount} />
    </ClientOnly>
  );
};
