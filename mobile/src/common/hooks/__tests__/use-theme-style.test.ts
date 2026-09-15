/**
 * Tests the real `useThemeStyle`. This file used to re-declare the logic inline and
 * assert against its own copy, so it could not fail; the module's native and
 * `@/` dependencies are now replaced with stand-ins the runner can load.
 */
import {
  freshRequire,
  interceptModules,
} from "../../__tests__/fixtures/intercept-modules";

type HooksMock = typeof import("../../__tests__/fixtures/mock-react-hooks");
type ThemeMock = typeof import("../../__tests__/fixtures/mock-theme");
type Subject = typeof import("../use-theme-style");

const HOOKS = require.resolve("../../__tests__/fixtures/mock-react-hooks");
const THEME = require.resolve("../../__tests__/fixtures/mock-theme");
const SUBJECT = require.resolve("../use-theme-style");
let restore: () => void;
let hooks: HooksMock;
let theme: ThemeMock;
let useThemeStyle: Subject["useThemeStyle"];

beforeAll(() => {
  restore = interceptModules({ react: HOOKS, "@/common/theme": THEME });
  hooks = require(HOOKS) as HooksMock;
  theme = require(THEME) as ThemeMock;
  ({ useThemeStyle } = freshRequire<Subject>(SUBJECT));
});

afterAll(() => {
  restore();
  delete require.cache[SUBJECT];
});

function counted(prefix = "") {
  const factory = (colors: { white: string }) => {
    factory.calls += 1;
    return { card: { backgroundColor: prefix + colors.white } };
  };
  factory.calls = 0;
  return factory;
}

describe("useThemeStyle", () => {
  it("builds the styles from the current theme's colours", () => {
    hooks.resetHooks();
    theme.setColorTheme({ white: "#ffffff" });
    const styles = hooks.render(() => useThemeStyle(counted() as never)) as {
      card: { backgroundColor: string };
    };
    expect(styles.card.backgroundColor).toBe("#ffffff");
  });

  it("returns the same styles across renders while the theme is unchanged", () => {
    hooks.resetHooks();
    theme.setColorTheme({ white: "#ffffff" });
    const factory = counted();
    const first = hooks.render(() => useThemeStyle(factory as never));
    const second = hooks.render(() => useThemeStyle(factory as never));
    expect(second).toBe(first);
    expect(factory.calls).toBe(1);
  });

  it("rebuilds the styles when the theme changes", () => {
    hooks.resetHooks();
    const factory = counted();
    theme.setColorTheme({ white: "#ffffff" });
    hooks.render(() => useThemeStyle(factory as never));
    theme.setColorTheme({ white: "#1a1a1a" });
    const styles = hooks.render(() => useThemeStyle(factory as never)) as {
      card: { backgroundColor: string };
    };
    expect(styles.card.backgroundColor).toBe("#1a1a1a");
    expect(factory.calls).toBe(2);
  });

  it("keeps the factory from the first render, so an inline factory does not rebuild every render", () => {
    hooks.resetHooks();
    theme.setColorTheme({ white: "#ffffff" });
    hooks.render(() => useThemeStyle(counted("first:") as never));
    theme.setColorTheme({ white: "#000000" });
    const styles = hooks.render(() =>
      useThemeStyle(counted("second:") as never),
    ) as { card: { backgroundColor: string } };
    expect(styles.card.backgroundColor).toBe("first:#000000");
  });
});
