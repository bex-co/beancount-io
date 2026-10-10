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
  const layoutListeners = new Set<() => void>();
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
    onDidLayoutChange: (listener: () => void) => {
      layoutListeners.add(listener);
      return {
        dispose: vi.fn(() => layoutListeners.delete(listener)),
      };
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
      create: vi.fn(
        (
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
      ),
      setTheme: vi.fn(),
      setModelMarkers: vi.fn(),
      onDidChangeMarkers: () => subscription,
    },
  } as unknown as Monaco;
  return {
    monaco,
    editor,
    subscription,
    layout: () => layoutListeners.forEach((listener) => listener()),
  };
}

function pendingStylesheet(
  href = "https://cdn.example/monaco-editor@0.55.1/min/vs/editor/editor.main.css",
) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = href;
  stylesheet.dataset.editorRuntimeTest = "true";
  document.head.appendChild(stylesheet);
  return stylesheet;
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
  document
    .querySelectorAll('link[data-editor-runtime-test="true"]')
    .forEach((stylesheet) => stylesheet.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Monaco runtime readiness", () => {
  it("keeps localized and explicit loading UI through the installed React editor's initialization", async () => {
    const runtime = monacoSurface();
    let resolveEditor!: (monaco: Monaco) => void;
    const editorPending = new Promise<Monaco>((resolve) => {
      resolveEditor = resolve;
    });
    const init = vi
      .spyOn(loader, "init")
      .mockReturnValueOnce(
        Object.assign(Promise.resolve(runtime.monaco), { cancel: vi.fn() }),
      )
      .mockReturnValue(Object.assign(editorPending, { cancel: vi.fn() }));
    const rendered = render(<MonacoEditor value="Persistent content" />);
    expect(screen.getByText(en["common.loadingData"])).toBeVisible();
    await waitFor(() => expect(init).toHaveBeenCalledTimes(2));
    expect(screen.getByText(en["common.loadingData"])).toBeVisible();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(runtime.monaco.editor.create).not.toHaveBeenCalled();

    for (const loading of [null, false]) {
      rendered.rerender(
        <MonacoEditor value="Persistent content" loading={loading} />,
      );
      expect(
        screen.queryByText(en["common.loadingData"]),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    }
    rendered.rerender(
      <MonacoEditor
        value="Persistent content"
        loading={<p>Caller loading</p>}
      />,
    );
    expect(screen.getByText("Caller loading")).toBeVisible();
    await act(async () => resolveEditor(runtime.monaco));
    expect(await screen.findByRole("textbox")).toHaveValue(
      "Persistent content",
    );
    expect(screen.queryByText("Caller loading")).not.toBeInTheDocument();
    expect(runtime.monaco.editor.create).toHaveBeenCalledOnce();
  });

  it.each(["input", "textarea"] as const)(
    "revalidates the focused invalid %s after its animated anchor or editor layout settles",
    async (tag) => {
      const initialization = controlledInitialization();
      const runtime = monacoSurface();
      const content = "# Source remains read-only and unchanged";
      render(<MonacoEditor value={content} options={{ readOnly: true }} />);
      await act(async () => initialization.resolve(runtime.monaco));
      const source = await screen.findByRole("textbox");
      const dom = runtime.editor.getDomNode();
      const field = document.createElement(tag);
      field.value = "[";
      field.setAttribute("aria-invalid", "true");
      const message = document.createElement("div");
      dom.append(field, message);
      const bounds = vi
        .spyOn(field, "getBoundingClientRect")
        .mockReturnValue(new DOMRect(20, 60, 140, 22));
      // Model the DOM validation callback, not Monaco's layout engine. Native
      // browser checks verify the actual popup geometry after this event.
      const validate = vi.fn(() => {
        message.style.top = `${field.getBoundingClientRect().bottom}px`;
      });
      field.addEventListener("input", validate);
      field.focus();
      field.setSelectionRange(0, 1);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      expect(message).toHaveStyle({ top: "82px" });

      bounds.mockReturnValue(new DOMRect(20, 102, 140, 22));
      field.dispatchEvent(new Event("transitionend", { bubbles: true }));
      expect(message).toHaveStyle({ top: "124px" });
      expect(validate).toHaveBeenCalledTimes(2);
      bounds.mockReturnValue(new DOMRect(20, 142, 140, 22));
      runtime.layout();
      expect(message).toHaveStyle({ top: "164px" });
      expect(validate).toHaveBeenCalledTimes(3);
      expect(field).toHaveFocus();
      expect(field).toHaveValue("[");
      expect(field.selectionStart).toBe(0);
      expect(field.selectionEnd).toBe(1);
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(source).toHaveValue(content);
      expect(source).toHaveAttribute("readonly");
      expect(runtime.monaco.editor.create).toHaveBeenCalledOnce();
    },
  );

  it("leaves other fields and unfocused validation alone and releases layout listeners on editor disposal", async () => {
    const initialization = controlledInitialization();
    const runtime = monacoSurface();
    render(<MonacoEditor value="Unchanged source" />);
    await act(async () => initialization.resolve(runtime.monaco));
    const source = await screen.findByRole("textbox");
    const dom = runtime.editor.getDomNode();
    const sourceInput = vi.fn();
    source.addEventListener("input", sourceInput);
    source.focus();
    dom.dispatchEvent(new Event("transitionend"));
    runtime.layout();
    expect(sourceInput).not.toHaveBeenCalled();

    const field = document.createElement("input");
    field.value = "[";
    field.setAttribute("aria-invalid", "true");
    const validate = vi.fn();
    field.addEventListener("input", validate);
    document.body.appendChild(field);
    field.focus();
    dom.dispatchEvent(new Event("transitionend"));
    runtime.layout();
    expect(validate).not.toHaveBeenCalled();
    dom.appendChild(field);
    field.setAttribute("aria-invalid", "false");
    field.focus();
    dom.dispatchEvent(new Event("transitionend"));
    runtime.layout();
    expect(validate).not.toHaveBeenCalled();
    field.setAttribute("aria-invalid", "true");
    source.focus();
    dom.dispatchEvent(new Event("transitionend"));
    runtime.layout();
    expect(validate).not.toHaveBeenCalled();

    const nonTextField = document.createElement("div");
    nonTextField.tabIndex = 0;
    nonTextField.setAttribute("aria-invalid", "true");
    const nonTextInput = vi.fn();
    nonTextField.addEventListener("input", nonTextInput);
    dom.appendChild(nonTextField);
    nonTextField.focus();
    dom.dispatchEvent(new Event("transitionend"));
    runtime.layout();
    expect(nonTextInput).not.toHaveBeenCalled();

    field.focus();
    dom.dispatchEvent(new Event("transitionend"));
    expect(validate).toHaveBeenCalledOnce();
    runtime.editor.dispose();
    dom.dispatchEvent(new Event("transitionend"));
    runtime.layout();
    expect(validate).toHaveBeenCalledOnce();
    expect(field).toHaveFocus();
    expect(source).toHaveValue("Unchanged source");
  });

  it("waits for the stylesheet before creating the installed React editor and preserves its persistent state", async () => {
    const initialization = controlledInitialization();
    const runtime = monacoSurface();
    const stylesheet = pendingStylesheet();
    const onMount = vi.fn();
    const props = {
      value: "# Synthetic README\n\nBeancount content remains intact.",
      options: { readOnly: true },
      onMount,
      width: "320px",
      height: "240px",
      loading: <p>Waiting for editor styles</p>,
      wrapperProps: { "data-testid": "editor-container" },
    };
    const rendered = render(<MonacoEditor {...props} />);
    expect(screen.getByTestId("editor-container")).toHaveStyle({
      width: "320px",
      height: "240px",
    });
    expect(screen.getByText("Waiting for editor styles")).toBeVisible();
    await act(async () => initialization.resolve(runtime.monaco));
    expect(stylesheet.sheet).toBeNull();
    expect(runtime.monaco.editor.create).not.toHaveBeenCalled();
    expect(onMount).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    const unrelated = pendingStylesheet("https://cdn.example/application.css");
    await act(async () => {
      unrelated.dispatchEvent(new Event("load"));
      unrelated.dispatchEvent(new Event("error"));
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(runtime.monaco.editor.create).not.toHaveBeenCalled();
    await act(async () => stylesheet.dispatchEvent(new Event("load")));
    const input = (await screen.findByRole("textbox")) as HTMLTextAreaElement;
    expect(input).toHaveValue(props.value);
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("aria-readonly", "true");
    expect(
      screen.queryByText("Waiting for editor styles"),
    ).not.toBeInTheDocument();
    expect(runtime.monaco.editor.create).toHaveBeenCalledOnce();
    expect(onMount).toHaveBeenCalledExactlyOnceWith(
      runtime.editor,
      runtime.monaco,
    );
    input.focus();
    input.setSelectionRange(3, 7);

    rendered.rerender(<MonacoEditor {...props} width="390px" />);
    await waitFor(() => {
      expect(screen.getByTestId("editor-container")).toHaveStyle({
        width: "390px",
      });
    });
    expect(screen.getByRole("textbox")).toBe(input);
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(7);
    expect(input).toHaveValue(props.value);
    expect(runtime.monaco.editor.create).toHaveBeenCalledOnce();
    expect(runtime.editor.dispose).not.toHaveBeenCalled();
    expect(onMount).toHaveBeenCalledOnce();
  });

  it.each(["already applied", "loaded before runtime"] as const)(
    "uses stylesheet readiness when styles are %s",
    async (phase) => {
      const initialization = controlledInitialization();
      const runtime = monacoSurface();
      const stylesheet = pendingStylesheet();
      if (phase === "already applied") {
        const sheet = new CSSStyleSheet();
        // A cross-origin stylesheet exposes sheet but can deny cssRules.
        Object.defineProperty(sheet, "cssRules", {
          get: () => {
            throw new DOMException("Cross-origin rules", "SecurityError");
          },
        });
        Object.defineProperty(stylesheet, "sheet", { value: sheet });
      }
      const onMount = vi.fn();
      render(<MonacoEditor value="Ready content" onMount={onMount} />);
      if (phase === "loaded before runtime") {
        await act(async () => stylesheet.dispatchEvent(new Event("load")));
        expect(runtime.monaco.editor.create).not.toHaveBeenCalled();
      }
      await act(async () => initialization.resolve(runtime.monaco));
      expect(await screen.findByRole("textbox")).toHaveValue("Ready content");
      expect(runtime.monaco.editor.create).toHaveBeenCalledOnce();
      expect(onMount).toHaveBeenCalledOnce();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it.each(["before", "after"] as const)(
    "reports a stylesheet error %s runtime resolution and retains keyboard reload",
    async (phase) => {
      const initialization = controlledInitialization();
      const runtime = monacoSurface();
      const onMount = vi.fn();
      render(<MonacoEditor onMount={onMount} loading="Styles pending" />);
      // The AMD module appends this link while the wrapper already observes.
      const stylesheet = pendingStylesheet();
      if (phase === "after") {
        await act(async () => initialization.resolve(runtime.monaco));
      }
      await act(async () => stylesheet.dispatchEvent(new Event("error")));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        en["common.editorFailedToLoad"],
      );
      if (phase === "before") {
        await act(async () => initialization.resolve(runtime.monaco));
      }
      expect(runtime.monaco.editor.create).not.toHaveBeenCalled();
      expect(onMount).not.toHaveBeenCalled();
      expect(screen.queryByText("Styles pending")).not.toBeInTheDocument();
      const before = window.location.href;
      const user = userEvent.setup();
      await user.tab();
      expect(
        screen.getByRole("button", { name: en["common.reloadPage"] }),
      ).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(reload).toHaveBeenCalledExactlyOnceWith();
      expect(window.location.href).toBe(before);
    },
  );

  it.each(["before", "after"] as const)(
    "records a shared stylesheet failure after unmounting %s runtime resolution and removes terminal observers",
    async (phase) => {
      const initialization = controlledInitialization();
      const runtime = monacoSurface();
      const addListener = vi.spyOn(document, "addEventListener");
      const removeListener = vi.spyOn(document, "removeEventListener");
      const onMount = vi.fn();
      const first = render(<MonacoEditor onMount={onMount} />);
      const stylesheet = pendingStylesheet();
      const observers = addListener.mock.calls.filter(
        ([type, , capture]) =>
          (type === "load" || type === "error") && capture === true,
      );
      if (phase === "after") {
        await act(async () => initialization.resolve(runtime.monaco));
      }
      first.unmount();
      for (const observer of observers) {
        expect(removeListener).not.toHaveBeenCalledWith(...observer);
      }
      if (phase === "before") {
        await act(async () => initialization.resolve(runtime.monaco));
      }
      await act(async () => stylesheet.dispatchEvent(new Event("error")));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      for (const observer of observers) {
        expect(removeListener).toHaveBeenCalledWith(...observer);
      }

      render(<MonacoEditor onMount={onMount} />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        en["common.editorFailedToLoad"],
      );
      expect(observers).toHaveLength(2);
      expect(runtime.monaco.editor.create).not.toHaveBeenCalled();
      expect(onMount).not.toHaveBeenCalled();
      expect(reload).not.toHaveBeenCalled();
    },
  );

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
    // The React editor has not been created while the wrapper initializes,
    // so its upstream initialization logger no longer runs on this failure.
    expect(upstreamError).not.toHaveBeenCalled();
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

  it("cancels the pending loader subscription on unmount and ignores its later settlement", async () => {
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
    expect(screen.getByText(en["common.loadingData"])).toBeVisible();
    await act(async () => initialization.reject(new Event("error")));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      en["common.editorFailedToLoad"],
    );
    expect(
      screen.queryByText(en["common.loadingData"]),
    ).not.toBeInTheDocument();
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
    expect(
      screen.queryByText(en["common.loadingData"]),
    ).not.toBeInTheDocument();
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
