/**
 * The haptics wrapper is the one place that decides what a "success" feels like
 * and whether a haptic is allowed to fail loudly. Both are invisible when they
 * regress — a swallowed intent produces silence, and an unguarded rejection
 * surfaces as an unhandled promise somewhere else entirely — so they are pinned
 * here rather than left to a device walkthrough.
 *
 * Relative requires and `Module._resolveFilename` interception: the runner has
 * no `@/` alias for values, and `expo-haptics` is a native module.
 */
const Module = require("module");

const hapticsModulePath = require.resolve("../haptics");
const hapticsMockPath = require.resolve("./fixtures/mock-expo-haptics");

type HapticsMock = typeof import("./fixtures/mock-expo-haptics");
type HapticsModule = typeof import("../haptics");

let restoreResolveFilename: (() => void) | undefined;

const originalPlatform = process.env.EXPO_OS;

function load(platform: string): {
  haptics: HapticsModule["haptics"];
  mock: HapticsMock;
} {
  const mock = require(hapticsMockPath) as HapticsMock;
  mock.reset();
  process.env.EXPO_OS = platform;
  delete require.cache[hapticsModulePath];
  const { haptics } = require("../haptics") as HapticsModule;
  return { haptics, mock };
}

describe("haptics", () => {
  beforeAll(() => {
    const originalResolveFilename = Module._resolveFilename;
    Module._resolveFilename = function resolve(
      request: string,
      parent: NodeModule | null | undefined,
      isMain: boolean,
      options?: { paths?: string[] },
    ) {
      if (request === "expo-haptics") {
        return hapticsMockPath;
      }
      return originalResolveFilename.call(
        this,
        request,
        parent,
        isMain,
        options,
      );
    };
    restoreResolveFilename = () => {
      Module._resolveFilename = originalResolveFilename;
    };
  });

  afterAll(() => {
    restoreResolveFilename?.();
    delete require.cache[hapticsModulePath];
    if (originalPlatform === undefined) {
      delete process.env.EXPO_OS;
    } else {
      process.env.EXPO_OS = originalPlatform;
    }
  });

  it("maps each intent to its expo-haptics call", () => {
    const { haptics, mock } = load("ios");

    haptics.selection();
    haptics.press();
    haptics.success();
    haptics.warning();
    haptics.error();

    expect(mock.calls).toEqual([
      { method: "selectionAsync", argument: undefined },
      { method: "impactAsync", argument: "light" },
      { method: "notificationAsync", argument: "success" },
      { method: "notificationAsync", argument: "warning" },
      { method: "notificationAsync", argument: "error" },
    ]);
  });

  it("fires on android too — the policy is one decision, not five", () => {
    const { haptics, mock } = load("android");

    haptics.press();
    haptics.success();

    expect(mock.calls.length).toBe(2);
  });

  it("skips platforms the app does not ship native haptics on", () => {
    const { haptics, mock } = load("web");

    haptics.selection();
    haptics.success();
    haptics.error();

    expect(mock.calls.length).toBe(0);
  });

  it("swallows a rejected haptic instead of letting it escape", async () => {
    const { haptics, mock } = load("ios");
    mock.state.rejectEverything = true;

    let escaped: unknown = null;
    const onUnhandled = (reason: unknown) => {
      escaped = reason;
    };
    process.on("unhandledRejection", onUnhandled);

    haptics.success();
    // Let the rejection settle and any unhandled-rejection report land.
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    process.off("unhandledRejection", onUnhandled);

    expect(mock.calls.length).toBe(1);
    expect(escaped).toBe(null);
  });

  it("survives a native module that throws synchronously", () => {
    const { haptics, mock } = load("ios");
    mock.state.throwSynchronously = true;

    expect(() => haptics.press()).not.toThrow();
  });
});
