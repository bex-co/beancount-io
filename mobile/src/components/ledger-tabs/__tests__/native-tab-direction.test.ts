import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";

// w22/009: UIKit lays the iOS tab bar out in the native app's direction, which
// follows the device language and ignores `I18nManager.forceRTL`. A Persian app
// on an English device therefore drew Home at the left edge of a mirrored
// screen. The host takes its direction from the live layout instead. These
// tests render the real `NativeTabNavigator` and read what it hands the host;
// the mirrored bar itself is verified on the simulator.
type Node = {
  type: unknown;
  props: Record<string, any>;
  children: unknown[];
};

const I18nManager = { isRTL: false };

const react = {
  useMemo: (fn: () => unknown) => fn(),
  createElement: (type: unknown, props: any, ...children: unknown[]): Node => ({
    type,
    props: props ?? {},
    children: children.flat(),
  }),
};

// Any module not listed resolves to an inert stub; only what a test relies on
// is spelled out.
const stubModule: any = new Proxy(function () {}, {
  get: (_target, key) => (key === "__esModule" ? true : stubModule),
  apply: () => stubModule,
});

function load(file: string, modules: Record<string, unknown>, expose = "") {
  const source = fs.readFileSync(path.join(__dirname, "..", "..", "..", file), {
    encoding: "utf8",
  });
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
    },
  });
  const exports: Record<string, any> = {};
  vm.runInNewContext(`${outputText}\n${expose}`, {
    exports,
    React: react,
    require(id: string) {
      if (id === "react") return { __esModule: true, default: react, ...react };
      return id in modules ? modules[id] : stubModule;
    },
  });
  return exports;
}

const reactNative = {
  Platform: { OS: "ios" },
  StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
  Text: "Text",
  View: "View",
  I18nManager,
};

const rtl = load("common/rtl.ts", { "react-native": reactNative });

const NativeTabs: any = Object.assign(function NativeTabs() {}, {
  Trigger: Object.assign(function Trigger() {}, {
    Label: "Label",
    Icon: "Icon",
  }),
});

const { NativeTabNavigator } = load(
  "components/ledger-tabs/index.tsx",
  {
    "react-native": reactNative,
    "expo-router/unstable-native-tabs": { NativeTabs },
    "@/common/rtl": rtl,
    "@/common/theme": {
      fontSizes: { xs: 11 },
      fontWeights: { medium: "500" },
    },
  },
  "exports.NativeTabNavigator = NativeTabNavigator;",
);

const titles = {
  home: "Home",
  accounts: "Accounts",
  transactions: "Transactions",
  reports: "Reports",
  files: "Files",
};
const bar = (): Node =>
  NativeTabNavigator({ theme: { primary: "#000", white: "#fff" }, titles });

afterEach(() => {
  I18nManager.isRTL = false;
});

describe("the iOS tab bar's direction", () => {
  it("is right-to-left when the app is laid out right-to-left", () => {
    I18nManager.isRTL = true;
    expect(bar().type).toBe(NativeTabs);
    expect(bar().props.unstable_nativeProps.direction).toBe("rtl");
  });

  it("is left-to-right otherwise, stated rather than inherited", () => {
    // Inheriting would mirror an English app running on a Persian device.
    expect(bar().props.unstable_nativeProps.direction).toBe("ltr");
  });

  it("follows the layout actually live, not the saved language", () => {
    // After a cancelled restart prompt the language and the layout disagree
    // (w21/086); the bar must match what the rest of the screen is doing.
    I18nManager.isRTL = true;
    const mirrored = bar().props.unstable_nativeProps.direction;
    I18nManager.isRTL = false;
    expect([mirrored, bar().props.unstable_nativeProps.direction]).toEqual([
      "rtl",
      "ltr",
    ]);
  });

  it("keeps the tabs in their one order, leaving the mirroring to UIKit", () => {
    // Reversing the triggers under RTL would flip the bar back to where it
    // started wherever UIKit already mirrors it.
    for (const isRTL of [false, true]) {
      I18nManager.isRTL = isRTL;
      expect(bar().children.map((tab) => (tab as Node).props.name)).toEqual([
        "index",
        "accounts",
        "transactions",
        "reports",
        "ledger",
      ]);
    }
  });
});
