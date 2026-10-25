import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as wheelPosition from "../wheel-position";

/**
 * Executes the real Picker with a minimal hook runtime. On iOS 27 the wheel,
 * mounted inside the animating modal, could ignore its initial-only
 * `contentOffset`, show row 0 and report y = 0, so an untouched Confirm saved
 * row 0: Theme "Light" for a user on System (w21/009). The wheel is now moved
 * with `scrollTo` once laid out, and scroll reports before that are ignored.
 */
type Node = { type: unknown; props: Record<string, any>; children: unknown[] };

/** One mounted component's hook slots, re-used across renders. */
function hookRuntime() {
  let slots: unknown[] = [];
  let cursor = 0;
  let effects: (() => void)[] = [];
  const slot = <T>(init: () => T): { value: T; index: number } => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = init();
    return { value: slots[index] as T, index };
  };
  const depsChanged = (prev: unknown[] | undefined, next: unknown[]) =>
    !prev || next.some((dep, i) => !Object.is(dep, prev[i]));
  const react = {
    useState: <T>(initial: T | (() => T)) => {
      const { value, index } = slot(() => ({
        state: typeof initial === "function" ? (initial as () => T)() : initial,
      }));
      const box = value as { state: T };
      return [
        box.state,
        (next: T) => {
          box.state = next;
          slots[index] = box;
        },
      ];
    },
    useRef: <T>(initial: T) => slot(() => ({ current: initial })).value,
    useMemo: <T>(fn: () => T, deps: unknown[]) => {
      const { value } = slot(() => ({
        deps: undefined as unknown,
        v: null as T,
      }));
      const box = value as { deps: unknown[] | undefined; v: T };
      if (depsChanged(box.deps, deps)) {
        box.v = fn();
        box.deps = deps;
      }
      return box.v;
    },
    useCallback: <T>(fn: T, deps: unknown[]) => react.useMemo(() => fn, deps),
    useEffect: (fn: () => void, deps: unknown[]) => {
      const { value } = slot(() => ({ deps: undefined as unknown }));
      const box = value as { deps: unknown[] | undefined };
      if (depsChanged(box.deps, deps)) {
        box.deps = deps;
        effects.push(fn);
      }
    },
    createElement: (
      type: unknown,
      props: any,
      ...children: unknown[]
    ): Node => ({
      type,
      props: props ?? {},
      children: children
        .flat()
        .filter((child) => child != null && child !== false && child !== ""),
    }),
  };
  return {
    react,
    render<P>(component: (props: P) => Node | null, props: P) {
      cursor = 0;
      effects = [];
      const tree = component(props);
      effects.forEach((effect) => effect());
      return tree;
    },
    reset() {
      slots = [];
    },
  };
}

function loadPicker() {
  const runtime = hookRuntime();
  const scrollTo: { y: number }[] = [];
  const exports: Record<string, any> = {};
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const animated = {
    View: "Animated.View",
    createAnimatedComponent: () => "AnimatedScrollView",
  };
  const modules: Record<string, unknown> = {
    react: { __esModule: true, default: runtime.react, ...runtime.react },
    "react-native": {
      View: "View",
      Text: "Text",
      ScrollView: "ScrollView",
      Pressable: "Pressable",
      Modal: "Modal",
      TouchableOpacity: "TouchableOpacity",
      StyleSheet: { create: (styles: unknown) => styles },
      Dimensions: { get: () => ({ height: 800 }) },
    },
    "react-native-reanimated": {
      __esModule: true,
      default: animated,
      useSharedValue: (initial: unknown) =>
        runtime.react.useRef({ value: initial }).current,
      useAnimatedStyle: () => ({}),
      withTiming: (value: unknown) => value,
      runOnJS: (fn: unknown) => fn,
      useAnimatedScrollHandler: (handlers: unknown) => handlers,
      useAnimatedRef: () =>
        runtime.react.useRef({
          scrollTo: ({ y }: { y: number }) => scrollTo.push({ y }),
        }),
    },
    "@/common/theme": {
      durations: { base: 0 },
      headerActionMaxFontSizeMultiplier: 1,
      headerActionStyle: () => ({}),
      useTheme: () => ({ colorTheme: {} }),
    },
    "@/common/theme/motion-easing": { easeStandard: null },
    "@/common/hooks/use-translations": {
      useTranslations: () => ({ t: (key: string) => key }),
    },
    "@/common/content-column": { sheetColumn: {} },
    "./wheel-position": wheelPosition,
  };
  vm.runInNewContext(source, {
    exports,
    require: (id: string) => modules[id],
  });
  return { runtime, scrollTo, Picker: exports.Picker };
}

function findAll(node: unknown, match: (node: Node) => boolean): Node[] {
  if (!node || typeof node !== "object") return [];
  const element = node as Node;
  return (match(element) ? [element] : []).concat(
    ...element.children.map((child) => findAll(child, match)),
  );
}

const ITEMS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

describe("Picker initial position", () => {
  it("opens on the saved value and an untouched Confirm keeps it, open after open", () => {
    const { runtime, scrollTo, Picker } = loadPicker();
    const confirmed: string[] = [];
    const props = (visible: boolean) => ({
      visible,
      items: ITEMS,
      selectedValue: "system",
      onSelect: (item: { value: string }) => confirmed.push(item.value),
      onCancel: () => undefined,
    });

    const open = () => {
      const tree = runtime.render(Picker, props(true));
      const wheel = findAll(tree, (n) => n.type === "AnimatedScrollView")[0]!;
      // The native view's own report before positioning: row 0.
      wheel.props.onScroll.onScroll({ contentOffset: { y: 0 } });
      wheel.props.onLayout?.();
      wheel.props.onContentSizeChange?.();
      const confirm = findAll(
        runtime.render(Picker, props(true)),
        (n) => n.props.testID === "picker-confirm",
      )[0]!;
      confirm.props.onPress();
    };

    open();
    expect(scrollTo.length > 0).toBe(true);
    expect(
      scrollTo.every(
        ({ y }) => y === wheelPosition.wheelOffsetForValue(ITEMS, "system"),
      ),
    ).toBe(true);
    expect(confirmed).toEqual(["system"]);

    // Close (the wheel unmounts), then reopen: positioned again.
    runtime.render(Picker, props(false));
    scrollTo.length = 0;
    open();
    expect(scrollTo.length > 0).toBe(true);
    expect(confirmed).toEqual(["system", "system"]);
  });

  it("follows the user's scroll once the wheel is positioned", () => {
    const { runtime, Picker } = loadPicker();
    const confirmed: string[] = [];
    const props = {
      visible: true,
      items: ITEMS,
      selectedValue: "system",
      onSelect: (item: { value: string }) => confirmed.push(item.value),
      onCancel: () => undefined,
    };
    const tree = runtime.render(Picker, props);
    const wheel = findAll(tree, (n) => n.type === "AnimatedScrollView")[0]!;
    wheel.props.onContentSizeChange?.();
    wheel.props.onScroll.onScroll({
      contentOffset: { y: wheelPosition.wheelOffsetForIndex(1, ITEMS.length) },
    });
    findAll(
      runtime.render(Picker, props),
      (n) => n.props.testID === "picker-confirm",
    )[0]!.props.onPress();
    expect(confirmed).toEqual(["dark"]);
  });
});
