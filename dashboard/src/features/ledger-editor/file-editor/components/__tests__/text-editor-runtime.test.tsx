import { loader, type OnMount } from "@monaco-editor/react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonacoEditor } from "@/common/components/monaco-editor";
import en from "@/i18n/locales/en";
import { TextEditor } from "../ledger-file-view/text-editor";

vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));
vi.mock("@/common/lib/editor/monaco-beancount-language-vscode", () => ({
  registerBeancountLanguage: vi.fn(),
}));
vi.mock("@/common/lib/editor/monaco-beancount-actions", () => ({
  registerEditorShortcuts: vi.fn(),
}));

type Monaco = Parameters<OnMount>[1];

function controlledInitialization() {
  let resolve!: (monaco: Monaco) => void;
  let reject!: (reason: unknown) => void;
  const pending = new Promise<Monaco>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  const cancellations: ReturnType<typeof vi.fn>[] = [];
  const init = vi.spyOn(loader, "init").mockImplementation(() => {
    let canceled = false;
    const initialization = new Promise<Monaco>(
      (resolvePromise, rejectPromise) => {
        pending.then(
          (monaco) =>
            canceled
              ? rejectPromise({ type: "cancelation" })
              : resolvePromise(monaco),
          rejectPromise,
        );
      },
    );
    const cancel = vi.fn(() => {
      canceled = true;
    });
    cancellations.push(cancel);
    return Object.assign(initialization, { cancel });
  });
  return { init, resolve, reject, cancellations };
}

// Keep the installed React editor and loader lifecycle real. Only Monaco's
// browser-only model/editor implementation is replaced for healthy mounts.
function monacoSurface() {
  let surface: HTMLTextAreaElement;
  let dom: HTMLElement;
  let content = "";
  let readOnly = false;
  const configured: Array<() => void> = [];
  const disposed: Array<() => void> = [];
  const model = {
    uri: { path: "synthetic-readme" },
    getLineCount: () => content.split("\n").length,
    getValue: () => content,
    dispose: vi.fn(),
  };
  const subscription = { dispose: vi.fn() };
  const editor = {
    getDomNode: () => dom,
    getOption: () => readOnly,
    getModel: () => model,
    getValue: () => content,
    restoreViewState: vi.fn(),
    saveViewState: vi.fn(),
    updateOptions: (options: { readOnly?: boolean; domReadOnly?: boolean }) => {
      readOnly = options.readOnly ?? false;
      surface.readOnly = options.domReadOnly ?? false;
      configured.forEach((listener) => listener());
    },
    setValue: (value: string) => {
      content = value;
      surface.value = value;
    },
    onDidChangeConfiguration: (listener: () => void) => {
      configured.push(listener);
      return subscription;
    },
    onDidDispose: (listener: () => void) => disposed.push(listener),
    onDidChangeModelContent: () => subscription,
    dispose: vi.fn(() => disposed.forEach((listener) => listener())),
    focus: vi.fn(() => surface.focus()),
  };
  const monaco = {
    Uri: { parse: (path: string) => ({ path }) },
    editor: {
      EditorOption: { readOnly: 104 },
      getModel: () => undefined,
      createModel: (value: string) => {
        content = value;
        return model;
      },
      create: (
        container: HTMLElement,
        options: { readOnly?: boolean; domReadOnly?: boolean },
      ) => {
        dom = container;
        surface = document.createElement("textarea");
        surface.className = "inputarea";
        surface.setAttribute("role", "textbox");
        surface.value = content;
        container.appendChild(surface);
        editor.updateOptions(options);
        return editor;
      },
      setTheme: vi.fn(),
      setModelMarkers: vi.fn(),
      onDidChangeMarkers: () => subscription,
    },
  } as unknown as Monaco;
  return { monaco, editor, subscription };
}

let reload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  reload = vi.fn();
  const browserWindow = window;
  const location = {
    href: browserWindow.location.href,
    reload,
  };
  // Location.reload is non-configurable in jsdom. Preserve the real DOM window
  // through a proxy and replace only the reload endpoint invoked by the button.
  vi.stubGlobal(
    "window",
    new Proxy(browserWindow, {
      get: (target, property) =>
        property === "location"
          ? location
          : Reflect.get(target, property, target),
    }),
  );
});

afterEach(() => {
  cleanup();
  document
    .querySelectorAll('script[src$="/vs/loader.js"]')
    .forEach((script) => script.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Monaco runtime readiness", () => {
  it("preserves the SSR fallback and caller loading UI until an actual rejection exposes keyboard reload", async () => {
    const initialization = controlledInitialization();
    const onMount = vi.fn();
    const props = {
      fallback: <p>Server editor placeholder</p>,
      loading: <p>Fetching editor runtime</p>,
      onMount,
    };
    expect(renderToString(<MonacoEditor {...props} />)).toContain(
      "Server editor placeholder",
    );
    expect(initialization.init).not.toHaveBeenCalled();
    render(<MonacoEditor {...props} />);
    expect(screen.getByText("Fetching editor runtime")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const upstreamError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await act(async () =>
      initialization.reject(new Error("CDN bootstrap failed")),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      en["common.editorFailedToLoad"],
    );
    expect(
      screen.queryByText("Fetching editor runtime"),
    ).not.toBeInTheDocument();
    expect(onMount).not.toHaveBeenCalled();
    expect(upstreamError).toHaveBeenCalledWith(
      "Monaco initialization: error:",
      expect.any(Error),
    );
    expect(reload).not.toHaveBeenCalled();

    const before = window.location.href;
    const user = userEvent.setup();
    await user.tab();
    expect(
      screen.getByRole("button", { name: en["common.reloadPage"] }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(reload).toHaveBeenCalledExactlyOnceWith();
    expect(window.location.href).toBe(before);
  });

  it("does not report ordinary loader cancellation as terminal failure", async () => {
    const initialization = controlledInitialization();
    const upstreamError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    render(<MonacoEditor loading="Runtime pending" />);
    await act(async () => initialization.reject({ type: "cancelation" }));
    expect(screen.getByText("Runtime pending")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(upstreamError).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("cancels both subscriptions on unmount and ignores their later settlement", async () => {
    const initialization = controlledInitialization();
    const onMount = vi.fn();
    const rendered = render(<MonacoEditor onMount={onMount} />);
    expect(initialization.cancellations.length).toBeGreaterThan(0);
    rendered.unmount();
    initialization.cancellations.forEach((cancel) =>
      expect(cancel).toHaveBeenCalledOnce(),
    );
    await act(async () => initialization.resolve(monacoSurface().monaco));
    expect(onMount).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it("mounts the actual read-only TextEditor with its supplied content and retains live read-only callbacks", async () => {
    const initialization = controlledInitialization();
    const runtime = monacoSurface();
    const onMount = vi.fn();
    const content =
      "# Synthetic README\n\nThe healthy file read remains intact.";
    const rendered = render(
      <TextEditor
        filename="README.md"
        content={content}
        readOnly
        onEditorMount={onMount}
      />,
    );
    await act(async () => initialization.resolve(runtime.monaco));
    const input = await screen.findByRole("textbox");
    expect(input).toHaveValue(content);
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("aria-readonly", "true");
    expect(onMount).toHaveBeenCalledExactlyOnceWith(
      runtime.editor,
      runtime.monaco,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rendered.rerender(
      <TextEditor
        filename="README.md"
        content={content}
        readOnly={false}
        onEditorMount={onMount}
      />,
    );
    await waitFor(() =>
      expect(input).toHaveAttribute("aria-readonly", "false"),
    );
    expect(input).not.toHaveAttribute("readonly");
    expect(input).toHaveValue(content);
    expect(onMount).toHaveBeenCalledTimes(1);
    rendered.unmount();
    expect(runtime.editor.dispose).toHaveBeenCalledOnce();
    expect(runtime.subscription.dispose).toHaveBeenCalled();
  });

  it("shows the shared runtime error in the actual TextEditor without claiming the file or mount failed", async () => {
    const initialization = controlledInitialization();
    const onMount = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <TextEditor
        filename="README.md"
        content="# Successful file read"
        readOnly
        onEditorMount={onMount}
      />,
    );
    expect(screen.getByText("Loading...")).toBeVisible();
    await act(async () => initialization.reject(new Event("error")));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      en["common.editorFailedToLoad"],
    );
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(onMount).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: en["common.reloadPage"] }),
    );
    expect(reload).toHaveBeenCalledOnce();
  });

  it("observes the installed loader's script failure and cached rejection rather than offering a fake remount retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const installedInit = loader.init.bind(loader);
    const installedThen = Promise.prototype.then;
    const orphanedRejections: unknown[] = [];
    const init = vi.spyOn(loader, "init").mockImplementation(() => {
      // Installed makeCancelable ignores the promise returned by its internal
      // then(resolveOnly). Observe that precise branch while init executes;
      // leave wrapper/editor promises and all other failures untouched.
      const then = vi
        .spyOn(Promise.prototype, "then")
        .mockImplementation(function (
          this: Promise<unknown>,
          onFulfilled,
          onRejected,
        ) {
          const branch = installedThen.call(this, onFulfilled, onRejected);
          if (onFulfilled && !onRejected) {
            void installedThen.call(branch, undefined, (error: unknown) => {
              orphanedRejections.push(error);
            });
          }
          return branch;
        } as typeof Promise.prototype.then);
      try {
        return installedInit();
      } finally {
        then.mockRestore();
      }
    });
    const first = render(<MonacoEditor />);
    const script = document.querySelector<HTMLScriptElement>(
      'script[src$="/vs/loader.js"]',
    );
    expect(script).not.toBeNull();
    const bootstrapError = new Event("error");
    await act(async () => script!.dispatchEvent(bootstrapError));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      en["common.editorFailedToLoad"],
    );
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    first.unmount();
    render(<MonacoEditor />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      en["common.editorFailedToLoad"],
    );
    expect(
      document.querySelectorAll('script[src$="/vs/loader.js"]'),
    ).toHaveLength(1);
    expect(init).toHaveBeenCalled();
    expect(orphanedRejections).toHaveLength(init.mock.calls.length);
    orphanedRejections.forEach((error) => expect(error).toBe(bootstrapError));
    expect(
      screen.queryByRole("button", { name: /retry/i }),
    ).not.toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });
});
