/**
 * The read-only integration, against a stand-in that behaves like Monaco.
 *
 * Monaco cannot run in JSDOM, and FINDINGS is explicit that a mock which
 * merely echoes options proves nothing. So the double here reproduces the
 * parts of Monaco this integration actually depends on: the two input
 * surfaces it builds (`.native-edit-context` or `textarea.inputarea`), the
 * `readOnly` option lookup, and the configuration/dispose events. The real
 * accessibility state is proved separately in a browser, and that evidence is
 * recorded on the task — these cases pin the logic that browser run exercises.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MonacoEditor } from "..";

type Listener = () => void;

const READ_ONLY_OPTION = 104;

/** A Monaco-shaped editor over a DOM built the way Monaco builds it. */
function fakeEditor(surface: "editContext" | "textarea", readOnly: boolean) {
  const dom = document.createElement("div");
  dom.className = "monaco-editor";
  const input =
    surface === "editContext"
      ? Object.assign(document.createElement("div"), {
          className: "native-edit-context",
        })
      : Object.assign(document.createElement("textarea"), {
          className: "inputarea",
        });
  // Monaco's own attributes on the native surface — note no aria-readonly.
  input.setAttribute("role", "textbox");
  input.setAttribute("aria-multiline", "true");
  dom.appendChild(input);

  const configListeners: Listener[] = [];
  const disposeListeners: Listener[] = [];
  let disposed = false;
  const state = { readOnly };

  return {
    input,
    state,
    disposed: () => disposed,
    fireConfigChange() {
      configListeners.forEach((listener) => listener());
    },
    fireDispose() {
      disposeListeners.forEach((listener) => listener());
    },
    editor: {
      getDomNode: () => dom,
      getOption: (option: number) =>
        option === READ_ONLY_OPTION ? state.readOnly : undefined,
      onDidChangeConfiguration: (listener: Listener) => {
        configListeners.push(listener);
        return {
          dispose: () => {
            disposed = true;
          },
        };
      },
      onDidDispose: (listener: Listener) => {
        disposeListeners.push(listener);
      },
    },
    monaco: { editor: { EditorOption: { readOnly: READ_ONLY_OPTION } } },
  };
}

let current: ReturnType<typeof fakeEditor>;
let seenOptions: Record<string, unknown> | undefined;

vi.mock("@monaco-editor/react", () => ({
  default: ({
    options,
    onMount,
  }: {
    options?: Record<string, unknown>;
    onMount?: (editor: unknown, monaco: unknown) => void;
  }) => {
    seenOptions = options;
    onMount?.(current.editor, current.monaco);
    return <div data-testid="editor" />;
  },
}));

vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

beforeEach(() => {
  cleanup();
  seenOptions = undefined;
});

describe("read-only state on Monaco's input surface", () => {
  it.each(["editContext", "textarea"] as const)(
    "marks a read-only %s surface as read-only",
    (surface) => {
      current = fakeEditor(surface, true);
      render(<MonacoEditor options={{ readOnly: true }} />);
      // Monaco never sets this itself on the native surface — that is the bug.
      expect(current.input.getAttribute("aria-readonly")).toBe("true");
    },
  );

  it.each(["editContext", "textarea"] as const)(
    "leaves an editable %s surface editable",
    (surface) => {
      current = fakeEditor(surface, false);
      render(<MonacoEditor options={{ readOnly: false }} />);
      expect(current.input.getAttribute("aria-readonly")).toBe("false");
    },
  );

  it("follows a reader-to-writer transition", () => {
    current = fakeEditor("editContext", true);
    render(<MonacoEditor options={{ readOnly: true }} />);
    expect(current.input.getAttribute("aria-readonly")).toBe("true");

    // The view switches to edit mode under the reader.
    current.state.readOnly = false;
    current.fireConfigChange();
    expect(current.input.getAttribute("aria-readonly")).toBe("false");

    current.state.readOnly = true;
    current.fireConfigChange();
    expect(current.input.getAttribute("aria-readonly")).toBe("true");
  });

  it("stops listening once the editor goes away", () => {
    current = fakeEditor("editContext", true);
    render(<MonacoEditor options={{ readOnly: true }} />);
    expect(current.disposed()).toBe(false);
    current.fireDispose();
    expect(current.disposed()).toBe(true);
  });

  it("leaves Monaco's own attributes alone", () => {
    current = fakeEditor("editContext", true);
    render(<MonacoEditor options={{ readOnly: true }} />);
    expect(current.input.getAttribute("role")).toBe("textbox");
    expect(current.input.getAttribute("aria-multiline")).toBe("true");
  });
});

describe("domReadOnly policy", () => {
  it("gives a read-only editor a read-only DOM", () => {
    current = fakeEditor("textarea", true);
    render(<MonacoEditor options={{ readOnly: true }} />);
    expect(seenOptions).toMatchObject({ readOnly: true, domReadOnly: true });
  });

  it("does not make an editable editor DOM-read-only", () => {
    current = fakeEditor("textarea", false);
    render(<MonacoEditor options={{ readOnly: false }} />);
    expect(seenOptions).toMatchObject({ readOnly: false, domReadOnly: false });
  });

  it("respects a caller that sets the two apart on purpose", () => {
    current = fakeEditor("textarea", true);
    render(<MonacoEditor options={{ readOnly: true, domReadOnly: false }} />);
    expect(seenOptions).toMatchObject({ readOnly: true, domReadOnly: false });
  });

  it("leaves an editor that never mentions readOnly untouched", () => {
    current = fakeEditor("textarea", false);
    render(<MonacoEditor options={{ minimap: { enabled: false } }} />);
    expect(seenOptions).not.toHaveProperty("domReadOnly");
  });
});

describe("wiring", () => {
  it("still calls the consumer's own onMount", () => {
    current = fakeEditor("editContext", true);
    const onMount = vi.fn();
    render(<MonacoEditor options={{ readOnly: true }} onMount={onMount} />);
    expect(onMount).toHaveBeenCalledWith(current.editor, current.monaco);
    // And the read-only state was applied regardless.
    expect(current.input.getAttribute("aria-readonly")).toBe("true");
  });
});
