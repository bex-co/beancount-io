import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";

// Runs the real hook with a single-instance hook runtime and a Keyboard that
// behaves like React Native's: it remembers the keyboard on screen but never
// replays a show event to a listener added later.
type Listener = (event?: { endCoordinates: { height: number } }) => void;

function setup(visibleHeight: number | null) {
  const listeners = new Map<string, Set<Listener>>();
  const keyboard = {
    metrics: () =>
      visibleHeight === null
        ? undefined
        : { height: visibleHeight, screenX: 0, screenY: 0, width: 390 },
    addListener(name: string, listener: Listener) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(listener);
      return { remove: () => listeners.get(name)!.delete(listener) };
    },
  };
  let state: unknown;
  let initialized = false;
  let cleanup: (() => void) | undefined;
  const react = {
    useState(initial: unknown) {
      if (!initialized) {
        state =
          typeof initial === "function"
            ? (initial as () => unknown)()
            : initial;
        initialized = true;
      }
      return [state, (next: unknown) => (state = next)];
    },
    useEffect(effect: () => (() => void) | void) {
      if (!cleanup) cleanup = effect() ?? (() => {});
    },
  };
  const exports: Record<string, any> = {};
  const source = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "..", "use-keyboard-height.ts"),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (id: string) =>
      id === "react" ? react : { Keyboard: keyboard, Platform: { OS: "ios" } },
  });
  const emit = (name: string, height?: number) =>
    listeners
      .get(name)
      ?.forEach((listener) =>
        listener(
          height === undefined ? undefined : { endCoordinates: { height } },
        ),
      );
  const count = () =>
    [...listeners.values()].reduce((total, set) => total + set.size, 0);
  return {
    height: () => exports.useKeyboardHeight() as number,
    emit,
    count,
    unmount: () => cleanup?.(),
  };
}

describe("useKeyboardHeight", () => {
  it("reads a keyboard that was already open when the view mounted", () => {
    const hook = setup(336);
    expect(hook.height()).toBe(336);
  });

  it("starts at zero with no keyboard, then follows show and hide", () => {
    const hook = setup(null);
    expect(hook.height()).toBe(0);
    hook.emit("keyboardWillShow", 291);
    expect(hook.height()).toBe(291);
    hook.emit("keyboardWillHide");
    expect(hook.height()).toBe(0);
  });

  it("resets an already-open keyboard on hide and unsubscribes on unmount", () => {
    const hook = setup(336);
    hook.height();
    hook.emit("keyboardWillHide");
    expect(hook.height()).toBe(0);
    expect(hook.count()).toBe(2);
    hook.unmount();
    expect(hook.count()).toBe(0);
  });
});
