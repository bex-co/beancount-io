import { ClientOnly } from "@tanstack/react-router";
import Editor, { type EditorProps } from "@monaco-editor/react";

/**
 * Wraps @monaco-editor/react in ClientOnly to prevent SSR/hydration issues.
 * Accepts all standard EditorProps. Use the `fallback` prop to customize the
 * placeholder shown before the editor mounts (defaults to an empty div).
 */
export const MonacoEditor = ({
  fallback = <div />,
  ...props
}: EditorProps & { fallback?: React.ReactNode }) => {
  return (
    <ClientOnly fallback={fallback}>
      <Editor {...props} />
    </ClientOnly>
  );
};
