import { useEffect, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import Editor, {
  loader,
  type EditorProps,
  type OnMount,
} from "@monaco-editor/react";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";

// The AMD runtime is shared across mounts, including a failed stylesheet.
const failedStylesheets = new WeakSet<HTMLLinkElement>();

function isMonacoStylesheet(
  target: EventTarget | null,
): target is HTMLLinkElement {
  return (
    target instanceof HTMLLinkElement &&
    target.rel === "stylesheet" &&
    new URL(target.href).pathname.endsWith("/vs/editor/editor.main.css")
  );
}

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

function refreshValidationLayout(editor: Parameters<OnMount>[0]): void {
  const dom = editor.getDomNode();
  if (!dom) return;
  const refresh = () => {
    const field = document.activeElement;
    if (
      (field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement) &&
      field.getAttribute("aria-invalid") === "true" &&
      dom.contains(field)
    ) {
      // Revalidate the unchanged query once its animated or resized anchor
      // settles, so Monaco lays out its existing validation message again.
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };
  dom.addEventListener("transitionend", refresh);
  const subscription = editor.onDidLayoutChange(refresh);
  editor.onDidDispose(() => {
    dom.removeEventListener("transitionend", refresh);
    subscription.dispose();
  });
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
  const { t } = useTranslations();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    let initialized = false;
    const loadedStylesheets = new WeakSet<HTMLLinkElement>();
    const stopWatchingStyles = () => {
      document.removeEventListener("load", handleStylesheet, true);
      document.removeEventListener("error", handleStylesheet, true);
    };
    const checkStyles = () => {
      if (!initialized) return;
      const stylesheet = Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
      ).find(isMonacoStylesheet);
      if (stylesheet && failedStylesheets.has(stylesheet)) {
        if (active) setFailed(true);
        stopWatchingStyles();
      } else if (
        !stylesheet ||
        stylesheet.sheet ||
        loadedStylesheets.has(stylesheet)
      ) {
        if (active) setReady(true);
        stopWatchingStyles();
      }
    };
    const handleStylesheet = (event: Event) => {
      if (!isMonacoStylesheet(event.target)) return;
      if (event.type === "error") {
        failedStylesheets.add(event.target);
        if (active) setFailed(true);
      } else {
        loadedStylesheets.add(event.target);
      }
      checkStyles();
      stopWatchingStyles();
    };
    // Monaco resolves its AMD module before its stylesheet loads. Create the
    // editor only after styles settle, before Find can snapshot an input width.
    document.addEventListener("load", handleStylesheet, true);
    document.addEventListener("error", handleStylesheet, true);
    const initialization = loader.init();
    void initialization
      .then(() => {
        initialized = true;
        checkStyles();
      })
      .catch((error: unknown) => {
        const canceled =
          typeof error === "object" &&
          error !== null &&
          "type" in error &&
          error.type === "cancelation";
        if (canceled && !active) {
          // Canceling this subscription leaves the shared AMD request alive.
          // Its successful settlement can still leave a stylesheet pending.
          initialized = true;
          checkStyles();
        } else {
          if (active && !canceled) setFailed(true);
          stopWatchingStyles();
        }
      });
    return () => {
      active = false;
      initialization.cancel();
      // Observe a pending shared resource until its terminal event, even if
      // no editor is mounted, so the next viewer cannot hang on a failed link.
      checkStyles();
    };
  }, []);
  // A fresh object every render would make the editor re-apply its options on
  // every render, so the default is computed only when the caller's changes.
  const editorOptions = useMemo(() => withDomReadOnly(options), [options]);
  const loading =
    props.loading === undefined ? t("common.loadingData") : props.loading;

  const handleMount: OnMount = (editor, monaco) => {
    syncReadOnlyState(editor, monaco);
    refreshValidationLayout(editor);
    onMount?.(editor, monaco);
  };

  return (
    <ClientOnly fallback={fallback}>
      {failed ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{t("common.editorFailedToLoad")}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              {t("common.reloadPage")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : ready ? (
        <Editor
          {...props}
          loading={loading}
          options={editorOptions}
          onMount={handleMount}
        />
      ) : (
        <section
          style={{
            display: "flex",
            position: "relative",
            textAlign: "initial",
            width: props.width ?? "100%",
            height: props.height ?? "100%",
          }}
          {...props.wrapperProps}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}
          >
            {loading}
          </div>
        </section>
      )}
    </ClientOnly>
  );
};
