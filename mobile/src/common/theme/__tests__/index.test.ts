// Mock dependencies BEFORE any imports
const Module = require("module");
const originalRequire = Module.prototype.require;

let mockColorScheme: string | null | undefined = "light";

Module.prototype.require = function (this: NodeModule, id: string) {
  // Mock react-native
  if (id === "react-native") {
    return {
      Appearance: {
        getColorScheme: () => mockColorScheme,
      },
      Platform: {
        OS: "ios",
        select: (options: { ios?: unknown; default?: unknown }) =>
          "ios" in options ? options.ios : options.default,
      },
    };
  }

  // Mock @callstack/react-theme-provider
  if (id === "@callstack/react-theme-provider") {
    return {
      createTheming: (theme: unknown) => ({
        ThemeProvider: theme,
        withTheme: (component: unknown) => component,
        useTheme: () => theme,
      }),
    };
  }

  return originalRequire.apply(this, arguments);
};

import { getSystemColorScheme, themes } from "../index";

describe("getSystemColorScheme", () => {
  it("returns light when system color scheme is light", () => {
    mockColorScheme = "light";
    const result = getSystemColorScheme();
    expect(result).toBe("light");
  });

  it("returns dark when system color scheme is dark", () => {
    mockColorScheme = "dark";
    const result = getSystemColorScheme();
    expect(result).toBe("dark");
  });

  it("returns light when system color scheme is null", () => {
    mockColorScheme = null;
    const result = getSystemColorScheme();
    expect(result).toBe("light");
  });

  it("returns light when system color scheme is undefined", () => {
    mockColorScheme = undefined;
    const result = getSystemColorScheme();
    expect(result).toBe("light");
  });
});

describe("themes", () => {
  it("contains light theme definition", () => {
    expect(themes.light).toBeTruthy();
    expect(themes.light.name).toBe("light");
    expect(themes.light.colorTheme).toBeTruthy();
    expect(themes.light.antdTheme).toBeTruthy();
  });

  it("contains dark theme definition", () => {
    expect(themes.dark).toBeTruthy();
    expect(themes.dark.name).toBe("dark");
    expect(themes.dark.colorTheme).toBeTruthy();
    expect(themes.dark.antdTheme).toBeTruthy();
  });

  it("light theme has expected color properties", () => {
    const { colorTheme } = themes.light;
    expect(colorTheme.white).toBe("#ffffff");
    expect(colorTheme.black).toBe("#1b1e16");
    expect(colorTheme.primary).toBe("#3f572c");
  });

  it("dark theme has expected color properties", () => {
    const { colorTheme } = themes.dark;
    expect(colorTheme.white).toBe("#171a14");
    expect(colorTheme.black).toBe("#f1efe4");
    expect(colorTheme.primary).toBe("#8ab36a");
  });

  it("both themes have sizing array", () => {
    expect(themes.light.sizing).toEqual([2, 6, 8, 10, 16, 24, 32]);
    expect(themes.dark.sizing).toEqual([2, 6, 8, 10, 16, 24, 32]);
  });

  it("light theme antdTheme uses colorTheme colors", () => {
    const { antdTheme, colorTheme } = themes.light;
    expect(antdTheme.brand_primary).toBe(colorTheme.primary);
    expect(antdTheme.color_text_base).toBe(colorTheme.text01);
  });

  it("dark theme antdTheme uses colorTheme colors", () => {
    const { antdTheme, colorTheme } = themes.dark;
    expect(antdTheme.brand_primary).toBe(colorTheme.primary);
    expect(antdTheme.color_text_base).toBe(colorTheme.text01);
  });

  it("both themes have error colors", () => {
    expect(themes.light.colorTheme.error).toBe("#cc4534");
    expect(themes.dark.colorTheme.error).toBe("#e8695c");
  });

  it("both themes have success colors", () => {
    expect(themes.light.colorTheme.success).toBe("#0a8748");
    expect(themes.dark.colorTheme.success).toBe("#37c07c");
  });

  it("both themes have warning colors", () => {
    expect(themes.light.colorTheme.warning).toBe("#e08a1e");
    expect(themes.dark.colorTheme.warning).toBe("#f0b24e");
  });

  it("light theme has white background", () => {
    expect(themes.light.colorTheme.navBg).toBe("#ffffff");
    expect(themes.light.colorTheme.activeBackgroundColor).toBe("#ffffff");
  });

  it("dark theme has charcoal background", () => {
    expect(themes.dark.colorTheme.navBg).toBe("#171a14");
    expect(themes.dark.colorTheme.activeBackgroundColor).toBe("#171a14");
  });
});
